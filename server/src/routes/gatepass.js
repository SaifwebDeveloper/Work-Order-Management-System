"use strict";

const express = require("express");
const crypto = require("crypto");
const QRCode = require("qrcode");
const { WorkOrder, Gatepass, GatepassItem, Attachment, Equipment } = require("../models");
const { authRequired, roleRequired } = require("../middleware/auth");
const { loadSettings, notify, addTimeline, fmtDate, parseFloatOr } = require("../utils/helpers");
const { equipmentDelivery } = require("../utils/woBundle");
const { upload, moveUploadsToWo } = require("../utils/uploads");
const { buildGatepassPdf, gatepassQrPayload } = require("../utils/pdf");
const { exportGatepassWorkbook } = require("../utils/excel");

const router = express.Router();
router.use(authRequired);

async function loadGatepassContext(gpId) {
  const gp = await Gatepass.findById(gpId).lean();
  if (!gp) return null;
  const wo = await WorkOrder.findById(gp.wo_id).lean();
  const items = await GatepassItem.find({ gatepass_id: gp._id }).sort({ sr_no: 1 }).lean();
  const attachments = await Attachment.find({ wo_id: gp.wo_id, kind: "gatepass" }).sort({ _id: 1 }).lean();
  return { gp: { ...gp, created_display: fmtDate(gp.created_at) }, wo, items, attachments };
}

// ---------------------------------------------------------- list (admin/finance)
router.get("/", roleRequired("nrtc_admin", "finance"), async (req, res) => {
  const q = String(req.query.q || "").trim();
  const filter = {};
  if (q) {
    const like = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ gp_number: like }, { issued_to: like }, { vehicle_no: like }];
  }
  const rows = await Gatepass.find(filter).sort({ _id: -1 }).limit(200).lean();
  const wos = await WorkOrder.find({ _id: { $in: rows.map((r) => r.wo_id) } }).lean();
  const woMap = new Map(wos.map((w) => [String(w._id), w]));
  const counts = await GatepassItem.aggregate([
    { $match: { gatepass_id: { $in: rows.map((r) => r._id) } } },
    { $group: { _id: "$gatepass_id", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json({
    total: rows.length,
    items: rows.map((g) => {
      const w = woMap.get(String(g.wo_id)) || {};
      return {
        ...g,
        created_at: fmtDate(g.created_at),
        wo_number: w.wo_number,
        item_count: countMap.get(String(g._id)) || 0,
      };
    }),
  });
});

// ------------------------------------------------------------- new (form)
router.get("/new/:woId", roleRequired("nrtc_admin"), async (req, res) => {
  const wo = await WorkOrder.findById(req.params.woId).lean();
  if (!wo) return res.status(404).json({ error: "Work order not found." });
  if (wo.status !== "completed") {
    return res.status(400).json({ error: "Gate pass can only be issued for completed work orders." });
  }
  const equipment = await Equipment.find({ wo_id: wo._id }).sort({ _id: 1 }).lean();
  const gatepasses = await Gatepass.find({ wo_id: wo._id }).lean();
  const gpItems = await GatepassItem.find({ gatepass_id: { $in: gatepasses.map((g) => g._id) } }).lean();
  const delivery = equipmentDelivery(equipment, gpItems).equipment.filter((d) => !d.done);
  const attachments = await Attachment.find({ wo_id: wo._id }).sort({ _id: 1 }).lean();
  res.json({
    wo: { ...wo, wo_date: fmtDate(wo.wo_date) },
    delivery,
    wo_attachments: attachments,
  });
});

// --------------------------------------------------------------- create
router.post("/new/:woId", roleRequired("nrtc_admin"), upload.single("attachment"), async (req, res) => {
  try {
    const wo = await WorkOrder.findById(req.params.woId);
    if (!wo) return res.status(404).json({ error: "Work order not found." });
    if (wo.status !== "completed") {
      return res.status(400).json({ error: "Gate pass can only be issued for completed work orders." });
    }
    const b = req.body || {};
    const issuedTo = String(b.issued_to || "").trim();
    const vehicleNo = String(b.vehicle_no || "").trim();
    if (!issuedTo) return res.status(400).json({ error: "Issued To (recipient) is required." });
    if (!vehicleNo) return res.status(400).json({ error: "Vehicle number is required." });

    const equipment = await Equipment.find({ wo_id: wo._id }).sort({ _id: 1 }).lean();
    const existingGps = await Gatepass.find({ wo_id: wo._id }).lean();
    const gpItems = await GatepassItem.find({
      gatepass_id: { $in: existingGps.map((g) => g._id) },
    }).lean();
    const delivery = equipmentDelivery(equipment, gpItems).equipment.filter((d) => !d.done);
    if (!delivery.length) {
      return res.status(400).json({ error: "All equipment has already been delivered." });
    }

    const chosen = [];
    for (const d of delivery) {
      const qty = parseFloatOr(b[`qty_${d.id}`], d.remaining);
      if (qty < 0) return res.status(400).json({ error: `Quantity cannot be negative for ${d.name}.` });
      if (qty > d.remaining) {
        return res.status(400).json({
          error: `Quantity for ${d.name} exceeds remaining (${d.remaining}).`,
        });
      }
      if (qty > 0) chosen.push({ delivery: d, qty });
    }
    if (!chosen.length) {
      return res.status(400).json({ error: "Enter a delivery quantity for at least one equipment." });
    }

    const settings = await loadSettings();
    const prefix = settings.gp_prefix || "GP";
    const year = new Date().getFullYear();
    let seq = (await Gatepass.countDocuments({ gp_number: new RegExp(`^${prefix}-${year}-`) })) + 1;
    let gpNumber = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
    while (await Gatepass.findOne({ gp_number: gpNumber })) {
      seq += 1;
      gpNumber = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
    }

    const gp = await Gatepass.create({
      wo_id: wo._id,
      gp_number: gpNumber,
      issued_to: issuedTo,
      designation: String(b.designation || "").trim(),
      basis_through: String(b.basis_through || "").trim(),
      vehicle_no: vehicleNo,
      returnable: b.returnable === "0" ? false : true,
      expected_return_date: String(b.expected_return_date || "").trim(),
      remarks: String(b.remarks || "").trim(),
      qr_token: crypto.randomBytes(6).toString("hex").toUpperCase(),
      issued_by: req.user._id,
    });

    const eqById = new Map(equipment.map((e) => [String(e._id), e]));
    let sr = 1;
    for (const { delivery: d, qty } of chosen) {
      const eq = eqById.get(String(d.id));
      await GatepassItem.create({
        gatepass_id: gp._id,
        equipment_id: eq._id,
        sr_no: sr++,
        description: eq.name,
        serial_number: eq.serial_number || "",
        quantity: qty,
        unit: eq.unit || "Nos",
        remarks: "",
      });
    }

    if (req.file) {
      const moved = moveUploadsToWo([req.file], wo._id);
      for (const m of moved) {
        await Attachment.create({ wo_id: wo._id, ...m, kind: "gatepass", uploaded_by: req.user._id });
      }
    }

    const refreshed = equipmentDelivery(equipment, [
      ...gpItems,
      ...(await GatepassItem.find({ gatepass_id: gp._id }).lean()),
    ]);
    const scope =
      refreshed.overall === "delivered" ? "fully delivered" : "partially delivered";
    await addTimeline(
      wo._id, "gatepass",
      `Gate Pass ${gpNumber} issued to ${issuedTo} (${chosen.length} item line(s)) — ${scope}`,
      "", req.user
    );
    await notify({
      title: `Gate Pass ${gpNumber} issued`,
      message: `Work Order #${wo.wo_number} — ${scope}.`,
      link: `/gatepasses/${gp._id}`,
      role: "finance",
    });

    res.status(201).json({ id: gp._id, gp_number: gpNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------- view
router.get("/:id", async (req, res) => {
  const ctx = await loadGatepassContext(req.params.id);
  if (!ctx) return res.status(404).json({ error: "Gate pass not found." });
  const settings = await loadSettings();
  const { User } = require("../models");
  let issuerName = "";
  if (ctx.gp.issued_by) {
    const u = await User.findById(ctx.gp.issued_by).lean();
    issuerName = u?.full_name || "";
  }
  ctx.gp.issuer_name = issuerName;
  ctx.gp.created_at_display = ctx.gp.created_display;
  const payload = gatepassQrPayload(ctx.gp, ctx.wo, ctx.items.length);
  ctx.qr_data = await QRCode.toDataURL(payload, { margin: 1, width: 220, color: { dark: "#003366", light: "#0000" } });
  ctx.settings = settings;
  res.json(ctx);
});

router.get("/:id/pdf", async (req, res) => {
  const ctx = await loadGatepassContext(req.params.id);
  if (!ctx) return res.status(404).json({ error: "Gate pass not found." });
  const settings = await loadSettings();
  const payload = gatepassQrPayload(ctx.gp, ctx.wo, ctx.items.length);
  const qrBuffer = await QRCode.toBuffer(payload, { margin: 1, width: 220, color: { dark: "#003366", light: "#0000" } });
  const doc = await buildGatepassPdf(ctx.gp, ctx.wo, ctx.items, settings, qrBuffer);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${ctx.gp.gp_number}.pdf"`);
  doc.pipe(res);
  doc.end();
});

router.get("/:id/xlsx", async (req, res) => {
  const ctx = await loadGatepassContext(req.params.id);
  if (!ctx) return res.status(404).json({ error: "Gate pass not found." });
  const settings = await loadSettings();
  const payload = gatepassQrPayload(ctx.gp, ctx.wo, ctx.items.length);
  const qrBuffer = await QRCode.toBuffer(payload, { margin: 1, width: 180, color: { dark: "#003366", light: "#0000" } });
  const buf = await exportGatepassWorkbook(ctx.gp, ctx.wo, ctx.items, settings, qrBuffer);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${ctx.gp.gp_number}.xlsx`);
  res.send(buf);
});

module.exports = router;
