"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const {
  User,
  WorkOrder,
  Equipment,
  InventoryItem,
  Notification,
} = require("../models");
const { authRequired, canSeePrices } = require("../middleware/auth");
const { fmtDate, fmtDateTime, UPLOAD_DIR, loadSettings } = require("../utils/helpers");
const {
  ROLES,
  PRODUCTION_SECTIONS,
  SECTION_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} = require("../constants");

const router = express.Router();
router.use(authRequired);

// Meta/constants for the client (roles, sections, statuses).
router.get("/meta", (req, res) => {
  res.json({
    roles: ROLES,
    production_sections: PRODUCTION_SECTIONS,
    section_labels: SECTION_LABELS,
    status_labels: STATUS_LABELS,
    status_colors: STATUS_COLORS,
  });
});

// Display-safe settings for any authenticated user.
router.get("/settings", async (req, res) => {
  const all = await loadSettings();
  const pick = [
    "org_name", "org_short", "dept_name", "tagline", "org_address",
    "org_phone", "org_email", "org_website", "currency",
    "sign_authority", "issuing_authority", "footer_note", "gp_prefix",
  ];
  const out = {};
  for (const k of pick) out[k] = all[k];
  res.json({ settings: out });
});

// ------------------------------------------------------------- search
router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ q, work_orders: [], parts: [] });

  const like = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const woQuery = {
    $or: [{ customer_name: like }, { reference_number: like }, { customer_tag: like }],
  };
  if (/^\d+$/.test(q)) woQuery.$or.push({ wo_number: Number(q) });

  let workOrders = await WorkOrder.find(woQuery).sort({ wo_number: -1 }).limit(50).lean();
  const eqMatches = await Equipment.find({
    $or: [{ serial_number: like }, { name: like }],
  })
    .select("wo_id")
    .lean();
  if (eqMatches.length) {
    const ids = eqMatches.map((e) => e.wo_id);
    const extra = await WorkOrder.find({ _id: { $in: ids } }).sort({ wo_number: -1 }).lean();
    const seen = new Set(workOrders.map((w) => String(w._id)));
    for (const w of extra) if (!seen.has(String(w._id))) workOrders.push(w);
    workOrders.sort((a, b) => b.wo_number - a.wo_number);
  }

  let parts = [];
  if (["nrtc_admin", "production", "finance"].includes(req.user.role)) {
    parts = await InventoryItem.find({
      $or: [{ store_code: like }, { description: like }],
    })
      .limit(50)
      .lean();
    if (!canSeePrices(req.user)) {
      parts = parts.map((p) => ({ ...p, unit_price: undefined }));
    }
  }
  res.json({ q, work_orders: workOrders, parts });
});

// -------------------------------------------------------- notifications
router.get("/notifications", async (req, res) => {
  const rows = await Notification.find({
    $or: [{ user_id: req.user._id }, { user_id: null, role: req.user.role }],
  })
    .sort({ created_at: -1 })
    .limit(100)
    .lean();
  const unread = rows.filter((r) => !r.is_read).length;
  res.json({
    unread,
    items: rows.map((r) => ({ ...r, created_at: fmtDateTime(r.created_at) })),
  });
});

router.post("/notifications/read-all", async (req, res) => {
  await Notification.updateMany(
    {
      is_read: false,
      $or: [{ user_id: req.user._id }, { user_id: null, role: req.user.role }],
    },
    { $set: { is_read: true } }
  );
  res.json({ ok: true });
});

// --------------------------------------------------------------- files
router.get("/files/:attachmentId", async (req, res) => {
  const { Attachment } = require("../models");
  const att = await Attachment.findById(req.params.attachmentId).lean();
  if (!att) return res.status(404).json({ error: "File not found." });
  const full = path.join(UPLOAD_DIR, "work_orders", String(att.wo_id), att.stored_name);
  if (!fs.existsSync(full)) return res.status(404).json({ error: "File missing on disk." });
  res.setHeader(
    "Content-Disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(att.original_name)}`
  );
  res.sendFile(full);
});

// ----------------------------------------------------------- parts API
function stripPrice(req, rows) {
  if (canSeePrices(req.user)) return rows;
  return rows.map((p) => ({ ...p, unit_price: undefined }));
}

router.get("/parts/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json([]);
  const like = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const rows = await InventoryItem.find({ $or: [{ store_code: like }, { description: like }] })
    .sort({ store_code: 1 })
    .limit(12)
    .lean();
  res.json(stripPrice(req, rows));
});

router.get("/parts/lookup", async (req, res) => {
  const code = String(req.query.code || "").trim();
  if (!code) return res.json({ found: false });
  const row = await InventoryItem.findOne({ store_code: code }).lean();
  if (!row) return res.json({ found: false });
  const [item] = stripPrice(req, [row]);
  res.json({ found: true, ...item });
});

// Role-aware work order bundle (used by print view / shared screens).
router.get("/wo/:id", async (req, res) => {
  const { loadWoBundle } = require("../utils/woBundle");
  const bundle = await loadWoBundle(req.params.id);
  if (!bundle) return res.status(404).json({ error: "Work order not found." });
  if (req.user.role === "production") {
    const sections = req.user.section ? [req.user.section] : require("../constants").PRODUCTION_SECTIONS.map(([k]) => k);
    bundle.sections = bundle.sections.filter((s) => sections.includes(s.section));
    bundle.items = bundle.items.filter((it) => sections.includes(it.section));
    bundle.labour = bundle.labour.filter((l) => sections.includes(l.section));
    for (const k of Object.keys(bundle.equipment_items)) {
      bundle.equipment_items[k] = bundle.equipment_items[k].filter((it) => sections.includes(it.section));
    }
    for (const k of Object.keys(bundle.labour_by_section)) {
      if (!sections.includes(k)) delete bundle.labour_by_section[k];
    }
    if (!canSeePrices(req.user)) {
      bundle.items = bundle.items.map((it) => ({ ...it, unit_price: undefined, amount: undefined }));
      bundle.labour = bundle.labour.map((l) => ({ ...l, rate: undefined, amount: undefined }));
      bundle.parts_total = undefined;
      bundle.labour_total = undefined;
    }
  }
  res.json(bundle);
});

// --------------------------------------------------------- users list
router.get("/users", async (req, res) => {
  const filter = {};
  if (req.user.role !== "nrtc_admin") filter.role = req.user.role;
  else if (req.query.dept && ROLES[req.query.dept]) filter.role = req.query.dept;
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
      created_at: fmtDate(u.created_at),
    }))
  );
});

module.exports = router;
