"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const {
  User,
  WorkOrder,
  Equipment,
  Attachment,
  InventoryItem,
  Setting,
  Gatepass,
  GatepassItem,
  WoTimeline,
  FinanceCost,
} = require("../models");
const { authRequired, roleRequired } = require("../middleware/auth");
const {
  loadSettings,
  getSetting,
  invalidateSettingsCache,
  notify,
  notifySections,
  addTimeline,
  todayStr,
  fmtDate,
  fmtDateTime,
  parseFloatOr,
  UPLOAD_DIR,
} = require("../utils/helpers");
const { loadWoBundle, equipmentDelivery } = require("../utils/woBundle");
const { upload, moveUploadsToWo } = require("../utils/uploads");
const { STATUS_LABELS, STATUS_COLORS, ROLES, PRODUCTION_SECTIONS, SECTION_LABELS } = require("../constants");
const { buildWorkOrderPdf } = require("../utils/pdf");
const {
  exportInventoryWorkbook,
  buildSampleInventoryWorkbook,
  exportGatepassWorkbook,
  parseInventoryWorkbook,
} = require("../utils/excel");
const path = require("path");
const fs = require("fs");

const router = express.Router();
router.use(authRequired, roleRequired("nrtc_admin"));

// ----------------------------------------------------------- dashboard
router.get("/dashboard", async (req, res) => {
  const settings = await loadSettings();
  const statusCounts = {};
  for (const row of await WorkOrder.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])) {
    statusCounts[row._id] = row.count;
  }
  const gatepassCount = await Gatepass.countDocuments();
  const inventoryCount = await InventoryItem.countDocuments();
  const inventoryValue = await InventoryItem.aggregate([
    { $group: { _id: null, total: { $sum: "$unit_price" } } },
  ]);

  const chartData = Object.keys(STATUS_LABELS).map((key) => ({
    label: STATUS_LABELS[key],
    value: statusCounts[key] || 0,
    color: STATUS_COLORS[key],
  }));

  const recent = await WorkOrder.find().sort({ wo_number: -1 }).limit(8).lean();
  const recentIds = recent.map((w) => w._id);
  const [gps, costs, eqCounts, recentEq, recentGpItems] = await Promise.all([
    Gatepass.aggregate([{ $match: { wo_id: { $in: recentIds } } }, { $group: { _id: "$wo_id", count: { $sum: 1 } } }]),
    FinanceCost.find({ wo_id: { $in: recentIds } }).lean(),
    Equipment.aggregate([{ $match: { wo_id: { $in: recentIds } } }, { $group: { _id: "$wo_id", count: { $sum: 1 } } }]),
    Equipment.find({ wo_id: { $in: recentIds } }).lean(),
    (async () => {
      const gps2 = await Gatepass.find({ wo_id: { $in: recentIds } }).lean();
      if (!gps2.length) return [];
      return GatepassItem.find({ gatepass_id: { $in: gps2.map((g) => g._id) } }).lean();
    })(),
  ]);
  const gpMap = new Map(gps.map((g) => [String(g._id), g.count]));
  const costMap = new Map(costs.map((c) => [String(c.wo_id), c]));
  const eqMap = new Map(eqCounts.map((e) => [String(e._id), e.count]));
  const deliveredMap = new Map();
  for (const w of recent) {
    const eqRows = recentEq.filter((e) => String(e.wo_id) === String(w._id));
    deliveredMap.set(String(w._id), equipmentDelivery(eqRows, recentGpItems).overall === "delivered");
  }

  const recentRows = recent.map((w) => ({
    ...w,
    wo_date: fmtDate(w.wo_date),
    equipment_count: eqMap.get(String(w._id)) || 0,
    gp_count: gpMap.get(String(w._id)) || 0,
    gp_delivered: deliveredMap.get(String(w._id)) || false,
    total_amount: costMap.get(String(w._id))?.total_amount || null,
    cost_sheet_no: costMap.get(String(w._id))?.cost_sheet_no || "",
  }));

  const activity = await WoTimeline.find().sort({ created_at: -1 }).limit(10).lean();
  const activityWo = await WorkOrder.find({
    _id: { $in: activity.map((a) => a.wo_id) },
  }).lean();
  const woNumMap = new Map(activityWo.map((w) => [String(w._id), w.wo_number]));

  res.json({
    status_counts: statusCounts,
    gatepass_count: gatepassCount,
    inventory_count: inventoryCount,
    inventory_value: inventoryValue[0]?.total || 0,
    chart_data: chartData,
    recent: recentRows,
    activity: activity.map((a) => ({
      ...a,
      wo_number: woNumMap.get(String(a.wo_id)),
      created_at: fmtDateTime(a.created_at),
    })),
    settings,
  });
});

// --------------------------------------------------------- work orders
router.get("/work-orders", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "").trim();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const perPage = 15;

  const filter = {};
  if (status && STATUS_LABELS[status]) filter.status = status;
  if (q) {
    const like = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ customer_name: like }, { reference_number: like }, { customer_tag: like }];
    if (/^\d+$/.test(q)) filter.$or.push({ wo_number: Number(q) });
  }

  const total = await WorkOrder.countDocuments(filter);
  const items = await WorkOrder.find(filter)
    .sort({ wo_number: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean();

  const ids = items.map((w) => w._id);
  const [eqAgg, gpAgg, costs, allEq, allGpItems] = await Promise.all([
    Equipment.aggregate([{ $match: { wo_id: { $in: ids } } }, { $group: { _id: "$wo_id", count: { $sum: 1 } } }]),
    Gatepass.aggregate([{ $match: { wo_id: { $in: ids } } }, { $group: { _id: "$wo_id", count: { $sum: 1 } } }]),
    FinanceCost.find({ wo_id: { $in: ids } }).lean(),
    Equipment.find({ wo_id: { $in: ids } }).lean(),
    (async () => {
      const gps = await Gatepass.find({ wo_id: { $in: ids } }).lean();
      if (!gps.length) return [];
      return require("../models").GatepassItem.find({ gatepass_id: { $in: gps.map((g) => g._id) } }).lean();
    })(),
  ]);
  const eqMap = new Map(eqAgg.map((e) => [String(e._id), e.count]));
  const gpMap = new Map(gpAgg.map((g) => [String(g._id), g.count]));
  const costMap = new Map(costs.map((c) => [String(c.wo_id), c]));
  const deliveredMap = new Map();
  for (const w of items) {
    const eqRows = allEq.filter((e) => String(e.wo_id) === String(w._id));
    const del = equipmentDelivery(eqRows, allGpItems);
    deliveredMap.set(String(w._id), del.overall === "delivered");
  }

  res.json({
    page,
    per_page: perPage,
    total,
    pages: Math.ceil(total / perPage),
    items: items.map((w) => ({
      ...w,
      wo_date: fmtDate(w.wo_date),
      equipment_count: eqMap.get(String(w._id)) || 0,
      gp_count: gpMap.get(String(w._id)) || 0,
      gp_delivered: deliveredMap.get(String(w._id)) || false,
      total_amount: costMap.get(String(w._id))?.total_amount || null,
    })),
  });
});

// ------------------------------------------------------------ detail
router.get("/work-orders/:id", async (req, res) => {
  const bundle = await loadWoBundle(req.params.id);
  if (!bundle) return res.status(404).json({ error: "Work order not found." });
  res.json(bundle);
});

router.get("/work-orders/:id/pdf", async (req, res) => {
  const bundle = await loadWoBundle(req.params.id);
  if (!bundle) return res.status(404).json({ error: "Work order not found." });
  const settings = await loadSettings();
  const doc = buildWorkOrderPdf(bundle, settings);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="WorkOrder-${bundle.wo.wo_number}.pdf"`
  );
  doc.pipe(res);
  doc.end();
});

// -------------------------------------------------------------- create
router.post("/work-orders", upload.array("attachments", 10), async (req, res) => {
  try {
    const b = req.body || {};
    const action = b.action === "forward" ? "forward" : "save";
    const woDate = String(b.wo_date || "").trim();
    const customerName = String(b.customer_name || "").trim();
    const referenceNumber = String(b.reference_number || "").trim();
    if (!woDate) return res.status(400).json({ error: "Work order date is required." });
    if (!customerName) return res.status(400).json({ error: "Customer / formation name is required." });
    if (action === "forward" && !referenceNumber) {
      return res.status(400).json({ error: "Reference number is required before forwarding to P3&C." });
    }

    const names = [].concat(b["eq_name[]"] || b.eq_name || []).filter((x) => String(x || "").trim());
    const serials = [].concat(b["eq_serial[]"] || b.eq_serial || []);
    const defects = [].concat(b["eq_defect[]"] || b.eq_defect || []);
    if (!names.length) return res.status(400).json({ error: "Add at least one equipment item." });

    const woStart = parseInt(await getSetting("wo_start", "1300"), 10) || 1300;
    const maxRow = await WorkOrder.findOne().sort({ wo_number: -1 }).select("wo_number").lean();
    const nextNo = Math.max((maxRow?.wo_number || 0), woStart - 1) + 1;

    const wo = await WorkOrder.create({
      wo_number: nextNo,
      wo_date: woDate,
      customer_name: customerName,
      customer_tag: String(b.customer_tag || "").trim(),
      reference_number: referenceNumber,
      contract_number: String(b.contract_number || "").trim(),
      under_warranty: b.under_warranty === "1" || b.under_warranty === "on" || b.under_warranty === true,
      status: action === "forward" ? "pending_p3c" : "draft",
      created_by: req.user._id,
    });

    for (let i = 0; i < names.length; i++) {
      await Equipment.create({
        wo_id: wo._id,
        name: String(names[i]).trim(),
        serial_number: String(serials[i] || "").trim(),
        defect: String(defects[i] || "").trim(),
      });
    }

    const moved = moveUploadsToWo(req.files, wo._id);
    for (const m of moved) {
      await Attachment.create({ wo_id: wo._id, ...m, uploaded_by: req.user._id });
    }

    await addTimeline(
      wo._id,
      "nrtc",
      action === "forward" ? "Work order created and forwarded to P3&C" : "Work order saved as draft",
      referenceNumber ? `Reference: ${referenceNumber}` : "",
      req.user
    );

    if (action === "forward") {
      await notify({
        title: `New Work Order #${wo.wo_number}`,
        message: `${customerName} — awaiting P3&C endorsement.`,
        link: `/p3c/work-orders/${wo._id}`,
        role: "p3c",
      });
    }

    res.status(201).json({ id: wo._id, wo_number: wo.wo_number, status: wo.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/work-orders/:id/forward-draft", async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ error: "Work order not found." });
  if (wo.status !== "draft") return res.status(400).json({ error: "Only draft work orders can be forwarded." });
  if (!wo.reference_number) {
    return res.status(400).json({ error: "Reference number is required before forwarding to P3&C." });
  }
  wo.status = "pending_p3c";
  await wo.save();
  await addTimeline(wo._id, "nrtc", "Work order forwarded to P3&C", "", req.user);
  await notify({
    title: `New Work Order #${wo.wo_number}`,
    message: `${wo.customer_name} — awaiting P3&C endorsement.`,
    link: `/p3c/work-orders/${wo._id}`,
    role: "p3c",
  });
  res.json({ ok: true, status: wo.status });
});

// -------------------------------------------- verify after production
router.post("/work-orders/:id/verify", async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ error: "Work order not found." });
  if (wo.status !== "pending_nrtc_check") {
    return res.status(400).json({ error: "This work order is not awaiting R&M check." });
  }
  wo.status = "pending_finance";
  wo.nrtc_check_remarks = String(req.body.remarks || "").trim();
  await wo.save();
  await addTimeline(wo._id, "nrtc", "R&M check completed — forwarded to Finance", wo.nrtc_check_remarks, req.user);
  await notify({
    title: `Work Order #${wo.wo_number} — ready for costing`,
    message: `${wo.customer_name} — production verified by R&M, prepare cost sheet.`,
    link: `/finance/work-orders/${wo._id}`,
    role: "finance",
  });
  res.json({ ok: true, status: wo.status });
});

// ------------------------------------------------------- final approve
router.post("/work-orders/:id/finalize", async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ error: "Work order not found." });
  if (wo.status !== "pending_nrtc_final") {
    return res.status(400).json({ error: "This work order is not awaiting final approval." });
  }
  wo.status = "completed";
  await wo.save();
  await addTimeline(wo._id, "nrtc", "Work order completed — final approval granted", "", req.user);
  await notify({
    title: `Work Order #${wo.wo_number} completed`,
    message: `${wo.customer_name} — final approval granted. Gate pass can now be issued.`,
    link: `/nrtc/work-orders/${wo._id}`,
    role: "finance",
  });
  await notify({
    title: `Work Order #${wo.wo_number} completed`,
    message: `${wo.customer_name} — R&M final approval granted.`,
    link: `/p3c/work-orders/${wo._id}`,
    role: "p3c",
  });
  const sections = await require("../models").WoSection.find({ wo_id: wo._id }).distinct("section");
  await notifySections(sections, {
    title: `Work Order #${wo.wo_number} completed`,
    message: `${wo.customer_name} — all production sections released.`,
    link: `/production/work-orders/${wo._id}`,
  });
  res.json({ ok: true, status: wo.status });
});

// ------------------------------------------------------------- inventory
router.get("/inventory", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const perPage = 20;
  const filter = {};
  if (q) {
    const like = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ store_code: like }, { description: like }];
  }
  const total = await InventoryItem.countDocuments(filter);
  const items = await InventoryItem.find(filter)
    .sort({ store_code: 1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean();
  res.json({ page, per_page: perPage, total, pages: Math.ceil(total / perPage), items });
});

router.get("/inventory/export.xlsx", async (req, res) => {
  const rows = await InventoryItem.find().sort({ store_code: 1 }).lean();
  const settings = await loadSettings();
  const buf = await exportInventoryWorkbook(rows, settings);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=NRTC-Inventory.xlsx");
  res.send(buf);
});

router.get("/inventory/sample.xlsx", async (req, res) => {
  const buf = await buildSampleInventoryWorkbook();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=NRTC-Inventory-Import-Sample.xlsx");
  res.send(buf);
});

router.post("/inventory/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please choose an .xlsx file to import." });
    const { rows, errors } = parseInventoryWorkbook(req.file.path);
    fs.unlink(req.file.path, () => {});
    if (!rows.length) return res.status(400).json({ error: "No valid rows found.", errors });

    let inserted = 0;
    let updated = 0;
    for (const r of rows) {
      const existing = await InventoryItem.findOne({ store_code: r.store_code });
      if (existing) {
        existing.description = r.description;
        existing.unit = r.unit;
        existing.unit_price = r.unit_price;
        await existing.save();
        updated++;
      } else {
        await InventoryItem.create(r);
        inserted++;
      }
    }
    res.json({ ok: true, inserted, updated, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------- settings
const ALLOWED_SETTINGS = [
  "org_name", "org_short", "dept_name", "tagline", "currency", "gst_component", "gst_labour",
  "wo_start", "gp_prefix", "sign_authority", "issuing_authority", "footer_note",
  "org_address", "org_phone", "org_email", "org_website",
];

router.get("/settings", async (req, res) => {
  res.json({ settings: await loadSettings(), allowed: ALLOWED_SETTINGS });
});

router.post("/settings", async (req, res) => {
  const b = req.body || {};
  for (const key of ALLOWED_SETTINGS) {
    if (b[key] !== undefined) {
      await Setting.updateOne({ key }, { $set: { value: String(b[key]) } }, { upsert: true });
    }
  }
  invalidateSettingsCache();
  res.json({ ok: true, settings: await loadSettings(true) });
});

// ------------------------------------------------------------ user admin
router.get("/admin/users", async (req, res) => {
  const filter = {};
  if (req.query.dept && ROLES[req.query.dept]) filter.role = req.query.dept;
  const rows = await User.find(filter).sort({ role: 1, full_name: 1 }).lean();
  res.json(
    rows.map((u) => ({
      id: u._id,
      username: u.username,
      full_name: u.full_name,
      role: u.role,
      role_label: ROLES[u.role],
      section: u.section,
      section_label: u.section ? SECTION_LABELS[u.section] || u.section : null,
      email: u.email,
      phone: u.phone,
      is_active: u.is_active,
      must_change_password: u.must_change_password,
      created_at: fmtDate(u.created_at),
    }))
  );
});

router.post("/admin/users", async (req, res) => {
  const { username, password, full_name, role, section } = req.body || {};
  const uname = String(username || "").trim();
  if (uname.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters." });
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (!full_name || !String(full_name).trim()) return res.status(400).json({ error: "Full name is required." });
  if (!ROLES[role]) return res.status(400).json({ error: "Please select a valid department role." });
  let sec = null;
  if (role === "production") {
    if (!section || !SECTION_LABELS[section]) {
      return res.status(400).json({ error: "Please select a valid Production II section." });
    }
    sec = section;
  }
  if (await User.findOne({ username: uname })) {
    return res.status(400).json({ error: "Username is already taken." });
  }
  const user = await User.create({
    username: uname,
    password_hash: await bcrypt.hash(String(password), 10),
    full_name: String(full_name).trim(),
    role,
    section: sec,
    must_change_password: true,
  });
  res.status(201).json({ id: user._id });
});

router.post("/admin/users/:id/toggle", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ error: "You cannot disable your own account." });
  }
  user.is_active = !user.is_active;
  await user.save();
  res.json({ ok: true, is_active: user.is_active });
});

router.post("/admin/users/:id/reset", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  const { password } = req.body || {};
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  user.password_hash = await bcrypt.hash(String(password), 10);
  user.must_change_password = true;
  await user.save();
  res.json({ ok: true });
});

module.exports = router;
