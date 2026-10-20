"use strict";

const express = require("express");
const { WorkOrder, WoSection, ProductionItem, LabourCharge, InventoryItem } = require("../models");
const { authRequired, roleRequired, canSeePrices } = require("../middleware/auth");
const { notify, addTimeline, fmtDate, parseFloatOr } = require("../utils/helpers");
const { loadWoBundle } = require("../utils/woBundle");
const { PRODUCTION_SECTIONS, SECTION_LABELS } = require("../constants");

const router = express.Router();
router.use(authRequired, roleRequired("production"));

function visibleSections(user) {
  if (!user.section) return PRODUCTION_SECTIONS.map(([k]) => k);
  return [user.section];
}

// ------------------------------------------------------------ dashboard
router.get("/dashboard", async (req, res) => {
  const sections = visibleSections(req.user);
  const woFilter = { status: "pending_production" };
  const [woRows, allSections] = await Promise.all([
    WorkOrder.find(woFilter).sort({ wo_number: -1 }).lean(),
    WoSection.find().lean(),
  ]);

  const secByWo = new Map();
  for (const s of allSections) {
    const k = String(s.wo_id);
    if (!secByWo.has(k)) secByWo.set(k, []);
    secByWo.get(k).push(s);
  }

  let pending = 0;
  let inProgress = 0;
  let awaiting = 0;
  const queue = [];
  for (const w of woRows) {
    const wSecs = (secByWo.get(String(w._id)) || []).filter((s) => sections.includes(s.section));
    if (!wSecs.length) continue;
    const statuses = wSecs.map((s) => s.status);
    const submitted = statuses.filter((s) => s === "submitted").length;
    if (submitted === wSecs.length) {
      awaiting++;
    } else if (statuses.includes("in_progress")) {
      inProgress++;
    } else {
      pending++;
    }
    queue.push({
      ...w,
      sections_csv: wSecs.map((s) => s.section).join(","),
      submitted_count: submitted,
      total_sections: wSecs.length,
      lowest_status: statuses.includes("pending") ? "pending" : submitted === wSecs.length ? "submitted" : "in_progress",
    });
    if (queue.length >= 10) break;
  }

  const newAssignments = pending;
  const allOpen = pending + inProgress + awaiting;
  const completed = await WorkOrder.countDocuments({ status: "completed" });

  // per-section progress across open work orders
  const sectionProgress = PRODUCTION_SECTIONS.map(([key, label]) => {
    let p = 0;
    let ip = 0;
    let sb = 0;
    for (const w of woRows) {
      const s = (secByWo.get(String(w._id)) || []).find((x) => x.section === key);
      if (!s) continue;
      if (s.status === "submitted") sb++;
      else if (s.status === "in_progress") ip++;
      else p++;
    }
    return { key, label, pending: p, in_progress: ip, submitted: sb };
  });
  const chartData = sectionProgress.map((s) => ({ label: s.label, value: s.pending + s.in_progress + s.submitted, color: "blue" }));

  const eqCounts = await Equipment_counts(queue);
  res.json({
    counts: {
      pending,
      in_progress: inProgress,
      new_assignments: newAssignments,
      awaiting_rm: awaiting,
      all_open: allOpen,
      completed,
    },
    queue: queue.map((w) => ({ ...w, wo_date: fmtDate(w.wo_date), equipment_count: eqCounts.get(String(w._id)) || 0 })),
    section_progress: sectionProgress,
    chart_data: chartData,
  });
});

async function Equipment_counts(queueRows) {
  const { Equipment } = require("../models");
  const ids = queueRows.map((w) => w._id);
  if (!ids.length) return new Map();
  const agg = await Equipment.aggregate([
    { $match: { wo_id: { $in: ids } } },
    { $group: { _id: "$wo_id", count: { $sum: 1 } } },
  ]);
  return new Map(agg.map((e) => [String(e._id), e.count]));
}

// --------------------------------------------------------- work orders
router.get("/work-orders", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const view = String(req.query.view || "").trim();
  const sections = visibleSections(req.user);
  const filter = { status: { $in: ["pending_production", "pending_nrtc_check", "completed"] } };
  if (q) {
    const like = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ customer_name: like }, { reference_number: like }, { customer_tag: like }];
    if (/^\d+$/.test(q)) filter.$or.push({ wo_number: Number(q) });
  }
  const rows = await WorkOrder.find(filter).sort({ wo_number: -1 }).lean();
  const allSecs = await WoSection.find({ wo_id: { $in: rows.map((w) => w._id) } }).lean();
  const secByWo = new Map();
  for (const s of allSecs) {
    const k = String(s.wo_id);
    if (!secByWo.has(k)) secByWo.set(k, []);
    secByWo.get(k).push(s);
  }

  let items = rows.map((w) => {
    const wSecs = (secByWo.get(String(w._id)) || []).filter((s) => sections.includes(s.section));
    const statuses = wSecs.map((s) => s.status);
    const submitted = statuses.filter((s) => s === "submitted").length;
    return {
      ...w,
      wo_date: fmtDate(w.wo_date),
      sections_csv: wSecs.map((s) => s.section).join(","),
      submitted_count: submitted,
      total_sections: wSecs.length,
      lowest_status:
        w.status !== "pending_production"
          ? "submitted"
          : statuses.includes("pending")
            ? "pending"
            : submitted === wSecs.length
              ? "submitted"
              : "in_progress",
    };
  });
  items = items.filter((w) => w.total_sections > 0);

  if (view === "new") items = items.filter((w) => w.lowest_status === "pending");
  else if (view === "progress") items = items.filter((w) => w.lowest_status === "in_progress");
  else if (view === "submitted" || view === "awaiting") {
    items = items.filter((w) => w.status !== "pending_production" || w.lowest_status === "submitted");
  } else if (view === "completed") items = items.filter((w) => w.status === "completed");

  const eqMap = await Equipment_counts(items);
  res.json({ total: items.length, items: items.map((w) => ({ ...w, equipment_count: eqMap.get(String(w._id)) || 0 })) });
});

// ---------------------------------------------------------- section view
router.get("/sections/:section", async (req, res) => {
  const sec = req.params.section;
  if (!SECTION_LABELS[sec]) return res.status(404).json({ error: "Unknown section." });
  if (req.user.section && req.user.section !== sec) {
    return res.status(403).json({ error: "You can only view your own section." });
  }
  const rows = await WoSection.find({ section: sec, status: { $ne: "submitted" } })
    .sort({ _id: -1 })
    .lean();
  const wos = await WorkOrder.find({
    _id: { $in: rows.map((r) => r.wo_id) },
    status: "pending_production",
  }).lean();
  const items = await ProductionItem.countDocuments({ section: sec });
  const eqMap = await Equipment_counts(wos);
  res.json({
    section: sec,
    summary: {
      open_count: rows.length,
      total_count: await WoSection.countDocuments({ section: sec }),
      item_count: items,
    },
    rows: wos.map((w) => ({
      ...w,
      wo_date: fmtDate(w.wo_date),
      equipment_count: eqMap.get(String(w._id)) || 0,
    })),
  });
});

// ------------------------------------------------------------ detail
router.get("/work-orders/:id", async (req, res) => {
  const bundle = await loadWoBundle(req.params.id);
  if (!bundle) return res.status(404).json({ error: "Work order not found." });
  const sections = visibleSections(req.user);
  bundle.sections = bundle.sections.filter((s) => sections.includes(s.section));
  bundle.items = bundle.items.filter((it) => sections.includes(it.section));
  bundle.labour = bundle.labour.filter((l) => sections.includes(l.section));
  for (const k of Object.keys(bundle.equipment_items)) {
    bundle.equipment_items[k] = bundle.equipment_items[k].filter((it) => sections.includes(it.section));
  }
  for (const k of Object.keys(bundle.labour_by_section)) {
    if (!sections.includes(k)) delete bundle.labour_by_section[k];
  }
  bundle.parts_total = Math.round(bundle.items.reduce((s, i) => s + (i.amount || 0), 0) * 100) / 100;
  bundle.labour_total = Math.round(bundle.labour.reduce((s, l) => s + (l.amount || 0), 0) * 100) / 100;
  bundle.editable = bundle.wo.status === "pending_production";
  bundle.show_prices = canSeePrices(req.user);
  bundle.visible_section_keys = sections;
  res.json(bundle);
});

// ------------------------------------------------------------ add item
router.post("/work-orders/:id/items", async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ error: "Work order not found." });
  const section = String(req.body.section || "");
  const allowed = visibleSections(req.user);
  if (!allowed.includes(section)) return res.status(403).json({ error: "Section not permitted for this account." });
  if (wo.status !== "pending_production") {
    return res.status(400).json({ error: "Entries are closed for this work order." });
  }
  const secRow = await WoSection.findOne({ wo_id: wo._id, section });
  if (!secRow) return res.status(400).json({ error: "Section is not assigned to this work order." });
  if (secRow.status === "submitted") {
    return res.status(400).json({ error: "This section has been submitted and is locked." });
  }

  const equipment = await require("../models").Equipment.findOne({
    _id: req.body.equipment_id,
    wo_id: wo._id,
  }).lean();
  if (!equipment) return res.status(400).json({ error: "Equipment not found in this work order." });

  const fault = String(req.body.fault || "").trim();
  const storeCode = String(req.body.store_code || "").trim();
  if (!fault && !storeCode) {
    return res.status(400).json({ error: "Enter a fault description or a store code." });
  }

  let unitPrice = 0;
  let partDesc = String(req.body.part_description || "").trim();
  let unit = "Nos";
  let warning = "";
  if (storeCode) {
    const part = await InventoryItem.findOne({ store_code: storeCode }).lean();
    if (part) {
      unitPrice = part.unit_price;
      if (!partDesc) partDesc = part.description;
      unit = part.unit || "Nos";
    } else {
      warning = `Store code '${storeCode}' not found in the item master — rate set to 0.`;
    }
  }

  const qty = parseFloatOr(req.body.qty, 0);
  const item = await ProductionItem.create({
    wo_id: wo._id,
    equipment_id: equipment._id,
    section,
    fault,
    part_description: partDesc,
    store_code: storeCode,
    qty,
    unit,
    unit_price: unitPrice,
    amount: Math.round(qty * unitPrice * 100) / 100,
    remarks: String(req.body.remarks || "").trim(),
    created_by: req.user._id,
  });

  if (secRow.status === "pending") {
    secRow.status = "in_progress";
    await secRow.save();
    await addTimeline(
      wo._id, "production",
      `Work started by ${SECTION_LABELS[section]}`,
      "", req.user
    );
  }
  res.status(201).json({ id: item._id, warning });
});

router.delete("/items/:itemId", async (req, res) => {
  const item = await ProductionItem.findById(req.params.itemId);
  if (!item) return res.status(404).json({ error: "Entry not found." });
  if (!visibleSections(req.user).includes(item.section)) {
    return res.status(403).json({ error: "Section not permitted for this account." });
  }
  const wo = await WorkOrder.findById(item.wo_id).lean();
  if (!wo || wo.status !== "pending_production") {
    return res.status(400).json({ error: "Entries are closed for this work order." });
  }
  const secRow = await WoSection.findOne({ wo_id: item.wo_id, section: item.section }).lean();
  if (secRow?.status === "submitted") {
    return res.status(400).json({ error: "This section has been submitted and is locked." });
  }
  await item.deleteOne();
  res.json({ ok: true });
});

// ------------------------------------------------------------ add labour
router.post("/work-orders/:id/labour", async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ error: "Work order not found." });
  const section = String(req.body.section || "");
  if (!visibleSections(req.user).includes(section)) {
    return res.status(403).json({ error: "Section not permitted for this account." });
  }
  if (wo.status !== "pending_production") {
    return res.status(400).json({ error: "Entries are closed for this work order." });
  }
  const secRow = await WoSection.findOne({ wo_id: wo._id, section });
  if (!secRow) return res.status(400).json({ error: "Section is not assigned to this work order." });
  if (secRow.status === "submitted") {
    return res.status(400).json({ error: "This section has been submitted and is locked." });
  }
  const description = String(req.body.description || "").trim();
  if (!description) return res.status(400).json({ error: "Work description is required." });

  const hours = parseFloatOr(req.body.hours, 0);
  const rate = parseFloatOr(req.body.rate, 0);
  const labour = await LabourCharge.create({
    wo_id: wo._id,
    section,
    description,
    hours,
    rate,
    amount: Math.round(hours * rate * 100) / 100,
    remarks: String(req.body.remarks || "").trim(),
    created_by: req.user._id,
  });

  if (secRow.status === "pending") {
    secRow.status = "in_progress";
    await secRow.save();
    await addTimeline(wo._id, "production", `Work started by ${SECTION_LABELS[section]}`, "", req.user);
  }
  res.status(201).json({ id: labour._id });
});

router.delete("/labour/:labourId", async (req, res) => {
  const row = await LabourCharge.findById(req.params.labourId);
  if (!row) return res.status(404).json({ error: "Entry not found." });
  if (!visibleSections(req.user).includes(row.section)) {
    return res.status(403).json({ error: "Section not permitted for this account." });
  }
  const wo = await WorkOrder.findById(row.wo_id).lean();
  if (!wo || wo.status !== "pending_production") {
    return res.status(400).json({ error: "Entries are closed for this work order." });
  }
  const secRow = await WoSection.findOne({ wo_id: row.wo_id, section: row.section }).lean();
  if (secRow?.status === "submitted") {
    return res.status(400).json({ error: "This section has been submitted and is locked." });
  }
  await row.deleteOne();
  res.json({ ok: true });
});

// -------------------------------------------------------- submit section
router.post("/work-orders/:id/submit-section", async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ error: "Work order not found." });
  const section = String(req.body.section || "");
  if (!visibleSections(req.user).includes(section)) {
    return res.status(403).json({ error: "Section not permitted for this account." });
  }
  if (wo.status !== "pending_production") {
    return res.status(400).json({ error: "This work order is not open for production entry." });
  }
  const secRow = await WoSection.findOne({ wo_id: wo._id, section });
  if (!secRow) return res.status(400).json({ error: "Section is not assigned to this work order." });
  if (secRow.status === "submitted") {
    return res.status(400).json({ error: "This section has already been submitted." });
  }
  const itemCount = await ProductionItem.countDocuments({ wo_id: wo._id, section });
  if (!itemCount) {
    return res.status(400).json({ error: "Add at least one parts/fault entry before submitting the section." });
  }
  secRow.status = "submitted";
  secRow.submitted_by = req.user._id;
  secRow.submitted_at = new Date();
  await secRow.save();
  await addTimeline(wo._id, "production", `${SECTION_LABELS[section]} submitted to R&M`, "", req.user);

  const remaining = await WoSection.countDocuments({ wo_id: wo._id, status: { $ne: "submitted" } });
  if (remaining === 0) {
    wo.status = "pending_nrtc_check";
    await wo.save();
    await addTimeline(wo._id, "production", "All sections submitted — returned to R&M for check", "", req.user);
    await notify({
      title: `Work Order #${wo.wo_number} — ready for R&M check`,
      message: `${wo.customer_name} — all Production II sections submitted.`,
      link: `/nrtc/work-orders/${wo._id}`,
      role: "nrtc_admin",
    });
  }
  res.json({ ok: true, all_submitted: remaining === 0, status: wo.status });
});

module.exports = router;
