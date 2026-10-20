"use strict";

const express = require("express");
const { WorkOrder, FinanceCost, Equipment, Attachment } = require("../models");
const { authRequired, roleRequired } = require("../middleware/auth");
const { loadSettings, notify, addTimeline, fmtDate, fmtDateTime, parseFloatOr } = require("../utils/helpers");
const { loadWoBundle } = require("../utils/woBundle");
const { upload, moveUploadsToWo } = require("../utils/uploads");

const router = express.Router();
router.use(authRequired, roleRequired("finance"));

const FINANCE_STATUSES = ["pending_finance", "pending_nrtc_final", "completed"];

// ------------------------------------------------------------ dashboard
router.get("/dashboard", async (req, res) => {
  const settings = await loadSettings();
  const [wos, costs] = await Promise.all([
    WorkOrder.find({ status: { $in: FINANCE_STATUSES } }).sort({ wo_number: -1 }).lean(),
    FinanceCost.find().lean(),
  ]);
  const costMap = new Map(costs.map((c) => [String(c.wo_id), c]));

  const pending = wos.filter((w) => w.status === "pending_finance").length;
  const finalized = wos.filter((w) => w.status !== "pending_finance").length;
  const draftCosts = costs.filter(
    (c) => !c.submitted_at && costMap.get(String(c.wo_id)) && wos.some((w) => String(w._id) === String(c.wo_id))
  ).length;
  const totalValue = costs
    .filter((c) => c.submitted_at)
    .reduce((s, c) => s + (c.total_amount || 0), 0);

  // queue: pending costing
  const queueWos = wos.filter((w) => w.status === "pending_finance").slice(0, 10);
  const eqCounts = await Equipment.aggregate([
    { $match: { wo_id: { $in: queueWos.map((w) => w._id) } } },
    { $group: { _id: "$wo_id", count: { $sum: 1 } } },
  ]);
  const eqMap = new Map(eqCounts.map((e) => [String(e._id), e.count]));

  const { ProductionItem, LabourCharge } = require("../models");
  const partsAgg = await ProductionItem.aggregate([
    { $group: { _id: "$wo_id", total: { $sum: "$amount" } } },
  ]);
  const labourAgg = await LabourCharge.aggregate([
    { $group: { _id: "$wo_id", total: { $sum: "$amount" } } },
  ]);
  const partsMap = new Map(partsAgg.map((p) => [String(p._id), p.total]));
  const labourMap = new Map(labourAgg.map((l) => [String(l._id), l.total]));

  const queue = queueWos.map((w) => ({
    ...w,
    wo_date: fmtDate(w.wo_date),
    equipment_count: eqMap.get(String(w._id)) || 0,
    parts_total: Math.round((partsMap.get(String(w._id)) || 0) * 100) / 100,
    labour_total: Math.round((labourMap.get(String(w._id)) || 0) * 100) / 100,
  }));

  const recentCosts = costs
    .filter((c) => c.submitted_at)
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
    .slice(0, 8);
  const recentWos = await WorkOrder.find({ _id: { $in: recentCosts.map((c) => c.wo_id) } }).lean();
  const woMap = new Map(recentWos.map((w) => [String(w._id), w]));
  const { User } = require("../models");
  const submitters = await User.find({
    _id: { $in: recentCosts.map((c) => c.submitted_by).filter(Boolean) },
  }).lean();
  const userMap = new Map(submitters.map((u) => [String(u._id), u.full_name]));
  const recent = recentCosts.map((c) => {
    const w = woMap.get(String(c.wo_id)) || {};
    return {
      ...c,
      wo_id: c.wo_id,
      wo_number: w.wo_number,
      cost_sheet_date: fmtDate(c.cost_sheet_date),
      submitter_name: userMap.get(String(c.submitted_by)) || "",
    };
  });

  const monthMap = {};
  for (const c of costs.filter((x) => x.submitted_at)) {
    const key = String(c.cost_sheet_date || "").slice(0, 7) || "unknown";
    monthMap[key] = (monthMap[key] || 0) + (c.total_amount || 0);
  }
  const chartData = Object.keys(monthMap)
    .sort()
    .map((k) => ({ label: k, value: Math.round(monthMap[k] * 100) / 100, color: "gold" }));

  res.json({
    pending,
    finalized,
    draft_costs: draftCosts,
    total_value: Math.round(totalValue * 100) / 100,
    queue,
    recent_costs: recent,
    chart_data: chartData,
    settings,
  });
});

// --------------------------------------------------------- work orders
router.get("/work-orders", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const view = String(req.query.view || "").trim();
  const filter = { status: { $in: FINANCE_STATUSES } };
  if (q) {
    const like = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ customer_name: like }, { reference_number: like }, { customer_tag: like }];
    if (/^\d+$/.test(q)) filter.$or.push({ wo_number: Number(q) });
  }
  const rows = await WorkOrder.find(filter).sort({ wo_number: -1 }).lean();
  const costs = await FinanceCost.find({ wo_id: { $in: rows.map((w) => w._id) } }).lean();
  const costMap = new Map(costs.map((c) => [String(c.wo_id), c]));
  const { Equipment } = require("../models");
  const eqCounts = await Equipment.aggregate([
    { $match: { wo_id: { $in: rows.map((w) => w._id) } } },
    { $group: { _id: "$wo_id", count: { $sum: 1 } } },
  ]);
  const eqMap = new Map(eqCounts.map((e) => [String(e._id), e.count]));
  let items = rows.map((w) => ({
    ...w,
    wo_date: fmtDate(w.wo_date),
    equipment_count: eqMap.get(String(w._id)) || 0,
    cost_sheet_no: costMap.get(String(w._id))?.cost_sheet_no || "",
    total_amount: costMap.get(String(w._id))?.total_amount || null,
    draft: costMap.get(String(w._id)) && !costMap.get(String(w._id)).submitted_at,
  }));
  if (view === "pending") items = items.filter((w) => w.status === "pending_finance");
  else if (view === "issued") {
    items = items.filter((w) => w.status !== "pending_finance" && !w.draft);
  }
  res.json({ total: items.length, items });
});

router.get("/work-orders/:id", async (req, res) => {
  const bundle = await loadWoBundle(req.params.id);
  if (!bundle) return res.status(404).json({ error: "Work order not found." });
  if (!FINANCE_STATUSES.includes(bundle.wo.status)) {
    return res.status(403).json({ error: "This work order is not in the Finance stage yet." });
  }
  const settings = await loadSettings();
  const { User } = require("../models");
  let submitterName = "";
  if (bundle.finance?.submitted_by) {
    const u = await User.findById(bundle.finance.submitted_by).lean();
    submitterName = u?.full_name || "";
  }
  bundle.finance = bundle.finance
    ? { ...bundle.finance, submitter_name: submitterName, submitted_at: fmtDateTime(bundle.finance.submitted_at) }
    : null;
  bundle.gst_component = parseFloatOr(settings.gst_component, 18);
  bundle.gst_labour = parseFloatOr(settings.gst_labour, 15);
  bundle.editable = bundle.wo.status === "pending_finance";
  bundle.today = new Date().toISOString().slice(0, 10);
  bundle.settings = { currency: settings.currency };
  res.json(bundle);
});

// ------------------------------------------------------------ submit cost
router.post("/work-orders/:id/submit-cost", upload.array("attachments", 5), async (req, res) => {
  try {
    const wo = await WorkOrder.findById(req.params.id);
    if (!wo) return res.status(404).json({ error: "Work order not found." });
    if (wo.status !== "pending_finance") {
      return res.status(400).json({ error: "Cost sheet can only be prepared while pending Finance costing." });
    }
    const b = req.body || {};
    const action = b.action === "submit" ? "submit" : "save";
    const costSheetNo = String(b.cost_sheet_no || "").trim();
    const costSheetDate = String(b.cost_sheet_date || "").trim();
    if (action === "submit") {
      if (!costSheetNo) return res.status(400).json({ error: "Cost sheet number is required." });
      if (!costSheetDate) return res.status(400).json({ error: "Cost sheet date is required." });
    }

    const settings = await loadSettings();
    const gstC = parseFloatOr(settings.gst_component, 18);
    const gstL = parseFloatOr(settings.gst_labour, 15);
    const round2 = (n) => Math.round(n * 100) / 100;
    const component = parseFloatOr(b.component_amount, 0);
    const labourBase = parseFloatOr(b.labour_base, 0);
    const icCosting = parseFloatOr(b.ic_costing, 0);
    const componentGst = round2((component * gstC) / 100);
    const labourGst = round2((labourBase * gstL) / 100);
    const total = round2(component + componentGst + labourBase + labourGst + icCosting);

    let cost = await FinanceCost.findOne({ wo_id: wo._id });
    if (!cost) cost = new FinanceCost({ wo_id: wo._id });
    cost.cost_sheet_no = costSheetNo;
    cost.cost_sheet_date = costSheetDate;
    cost.component_amount = component;
    cost.component_gst = componentGst;
    cost.labour_base = labourBase;
    cost.labour_gst = labourGst;
    cost.ic_costing = icCosting;
    cost.total_amount = total;
    cost.remarks = String(b.remarks || "").trim();

    if (req.files?.length) {
      const moved = moveUploadsToWo(req.files, wo._id);
      for (const m of moved) {
        await Attachment.create({ wo_id: wo._id, ...m, kind: "finance", uploaded_by: req.user._id });
      }
    }

    if (action === "submit") {
      cost.submitted_by = req.user._id;
      cost.submitted_at = new Date();
      await cost.save();
      wo.status = "pending_nrtc_final";
      await wo.save();
      await addTimeline(
        wo._id, "finance",
        `Cost sheet ${costSheetNo} issued — total ${total.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`,
        cost.remarks, req.user
      );
      await notify({
        title: `Work Order #${wo.wo_number} — cost sheet issued`,
        message: `${costSheetNo} — total ${settings.currency} ${total.toLocaleString("en-PK", { minimumFractionDigits: 2 })}. Awaiting R&M final approval.`,
        link: `/nrtc/work-orders/${wo._id}`,
        role: "nrtc_admin",
      });
    } else {
      await cost.save();
      await addTimeline(wo._id, "finance", "Cost sheet draft saved", costSheetNo, req.user);
    }
    res.json({ ok: true, status: wo.status, total_amount: total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
