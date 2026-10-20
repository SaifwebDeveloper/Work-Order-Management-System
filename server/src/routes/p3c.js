"use strict";

const express = require("express");
const { WorkOrder, P3CEndorsement, WoSection, Equipment } = require("../models");
const { authRequired, roleRequired } = require("../middleware/auth");
const { notify, notifySections, addTimeline, fmtDate } = require("../utils/helpers");
const { loadWoBundle } = require("../utils/woBundle");
const { SECTION_LABELS, PRODUCTION_SECTIONS } = require("../constants");

const router = express.Router();
router.use(authRequired, roleRequired("p3c"));

// ------------------------------------------------------------ dashboard
router.get("/dashboard", async (req, res) => {
  const [all, endorsements] = await Promise.all([
    WorkOrder.find({ status: { $in: ["pending_p3c", "pending_production"] } })
      .sort({ wo_number: -1 })
      .lean(),
    P3CEndorsement.find().lean(),
  ]);
  const endorsedWo = new Set(endorsements.map((e) => String(e.wo_id)));
  const verifiedWo = new Set(endorsements.filter((e) => e.verified).map((e) => String(e.wo_id)));
  const forwardedWo = new Set(
    endorsements.filter((e) => e.forwarded_at).map((e) => String(e.wo_id))
  );

  const newCount = all.filter((w) => !endorsedWo.has(String(w._id))).length;
  const reviewCount = all.filter(
    (w) => endorsedWo.has(String(w._id)) && !verifiedWo.has(String(w._id)) && !forwardedWo.has(String(w._id))
  ).length;
  const verifiedCount = all.filter(
    (w) => verifiedWo.has(String(w._id)) && !forwardedWo.has(String(w._id))
  ).length;
  const forwardedCount = forwardedWo.size;

  const queue = await WorkOrder.find({ status: "pending_p3c" })
    .sort({ wo_number: -1 })
    .limit(10)
    .lean();
  const queueEndorsements = await P3CEndorsement.find({
    wo_id: { $in: queue.map((w) => w._id) },
  }).lean();
  const endMap = new Map(queueEndorsements.map((e) => [String(e.wo_id), e]));
  const eqCounts = await Equipment.aggregate([
    { $match: { wo_id: { $in: queue.map((w) => w._id) } } },
    { $group: { _id: "$wo_id", count: { $sum: 1 } } },
  ]);
  const eqMap = new Map(eqCounts.map((e) => [String(e._id), e.count]));

  res.json({
    counts: { new: newCount, review: reviewCount, verified: verifiedCount, forwarded: forwardedCount },
    queue: queue.map((w) => {
      const e = endMap.get(String(w._id));
      return {
        ...w,
        wo_date: fmtDate(w.wo_date),
        equipment_count: eqMap.get(String(w._id)) || 0,
        endorsement_id: e?._id || null,
        verified: e?.verified || false,
      };
    }),
  });
});

// --------------------------------------------------------- work orders
router.get("/work-orders", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const view = String(req.query.view || "").trim();
  const filter = { status: { $in: ["pending_p3c", "pending_production"] } };
  if (q) {
    const like = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ customer_name: like }, { reference_number: like }, { customer_tag: like }];
    if (/^\d+$/.test(q)) filter.$or.push({ wo_number: Number(q) });
  }
  const rows = await WorkOrder.find(filter).sort({ wo_number: -1 }).lean();
  const endorsements = await P3CEndorsement.find({ wo_id: { $in: rows.map((w) => w._id) } }).lean();
  const endMap = new Map(endorsements.map((e) => [String(e.wo_id), e]));
  const eqCounts = await Equipment.aggregate([
    { $match: { wo_id: { $in: rows.map((w) => w._id) } } },
    { $group: { _id: "$wo_id", count: { $sum: 1 } } },
  ]);
  const eqMap = new Map(eqCounts.map((e) => [String(e._id), e.count]));

  let items = rows.map((w) => {
    const e = endMap.get(String(w._id));
    return {
      ...w,
      wo_date: fmtDate(w.wo_date),
      equipment_count: eqMap.get(String(w._id)) || 0,
      endorsement_id: e?._id || null,
      verified: e?.verified || false,
      forwarded: !!(e?.forwarded_at),
    };
  });
  if (view === "new") items = items.filter((w) => !w.endorsement_id);
  else if (view === "review") items = items.filter((w) => w.endorsement_id && !w.verified && !w.forwarded);
  else if (view === "verified") items = items.filter((w) => w.verified && !w.forwarded);
  else if (view === "forwarded") items = items.filter((w) => w.forwarded);

  res.json({ total: items.length, items });
});

router.get("/work-orders/:id", async (req, res) => {
  const bundle = await loadWoBundle(req.params.id);
  if (!bundle) return res.status(404).json({ error: "Work order not found." });
  res.json(bundle);
});

// ------------------------------------------------------------ endorsement
router.post("/work-orders/:id/endorse", async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ error: "Work order not found." });
  if (wo.status !== "pending_p3c") {
    return res.status(400).json({ error: "This work order is not awaiting P3&C endorsement." });
  }
  const b = req.body || {};
  const action = b.action === "forward" ? "forward" : b.action === "verify" ? "verify" : "save";
  const refNo = String(b.ref_no || "").trim();
  const refDate = String(b.ref_date || "").trim();
  const remarks = String(b.remarks || "").trim();
  const verified = b.verified === "1" || b.verified === "on" || b.verified === true;
  const p3cRef = String(b.p3c_ref_number || "").trim();

  let sections = [].concat(b.sections || []).filter((s) => SECTION_LABELS[s]);
  if (sections.includes("all")) sections = PRODUCTION_SECTIONS.map(([k]) => k);
  sections = [...new Set(sections)];

  if (action === "forward") {
    if (!refNo) return res.status(400).json({ error: "P3&C reference number is required to forward." });
    if (!refDate) return res.status(400).json({ error: "Reference date is required to forward." });
    if (!verified) return res.status(400).json({ error: "Work order must be verified before forwarding." });
    if (!sections.length) return res.status(400).json({ error: "Select at least one Production II section." });
  }

  let endorsement = await P3CEndorsement.findOne({ wo_id: wo._id });
  if (!endorsement) {
    endorsement = new P3CEndorsement({ wo_id: wo._id, endorsed_by: req.user._id });
  }
  endorsement.ref_no = refNo;
  endorsement.ref_date = refDate;
  endorsement.remarks = remarks;
  endorsement.verified = verified;
  endorsement.p3c_ref_number = p3cRef;
  endorsement.endorsed_by = req.user._id;
  endorsement.endorsed_at = new Date();
  await endorsement.save();

  for (const sec of sections) {
    await WoSection.updateOne(
      { wo_id: wo._id, section: sec },
      { $setOnInsert: { wo_id: wo._id, section: sec, status: "pending" } },
      { upsert: true }
    );
  }

  if (action === "forward") {
    endorsement.forwarded_at = new Date();
    await endorsement.save();
    wo.status = "pending_production";
    await wo.save();
    await addTimeline(
      wo._id, "p3c",
      `Endorsed and forwarded to Production II (${sections.length} section(s))`,
      remarks, req.user
    );
    await notifySections(sections, {
      title: `Work Order #${wo.wo_number} assigned`,
      message: `${wo.customer_name} — new assignment from P3&C.`,
      link: `/production/work-orders/${wo._id}`,
    });
    await notify({
      title: `Work Order #${wo.wo_number} endorsed`,
      message: `${wo.customer_name} — forwarded to Production II.`,
      link: `/nrtc/work-orders/${wo._id}`,
      role: "nrtc_admin",
    });
  } else if (action === "verify") {
    await addTimeline(wo._id, "p3c", "P3&C verification recorded (not forwarded yet)", remarks, req.user);
  } else {
    await addTimeline(wo._id, "p3c", "P3&C endorsement draft saved", "", req.user);
  }

  res.json({ ok: true, status: wo.status });
});

module.exports = router;
