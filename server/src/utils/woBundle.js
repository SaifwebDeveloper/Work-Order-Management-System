"use strict";

const {
  WorkOrder,
  Equipment,
  Attachment,
  P3CEndorsement,
  WoSection,
  ProductionItem,
  LabourCharge,
  FinanceCost,
  Gatepass,
  GatepassItem,
  WoTimeline,
} = require("../models");
const { fmtDate, fmtDateTime } = require("./helpers");

async function loadWoBundle(woId) {
  const wo = await WorkOrder.findById(woId).lean();
  if (!wo) return null;

  const [equipment, endorsement, sections, items, labour, finance, attachments, timeline, gatepasses] =
    await Promise.all([
      Equipment.find({ wo_id: wo._id }).sort({ _id: 1 }).lean(),
      P3CEndorsement.findOne({ wo_id: wo._id }).lean(),
      WoSection.find({ wo_id: wo._id }).sort({ _id: 1 }).lean(),
      ProductionItem.find({ wo_id: wo._id }).sort({ _id: 1 }).lean(),
      LabourCharge.find({ wo_id: wo._id }).sort({ _id: 1 }).lean(),
      FinanceCost.findOne({ wo_id: wo._id }).lean(),
      Attachment.find({ wo_id: wo._id }).sort({ _id: 1 }).lean(),
      WoTimeline.find({ wo_id: wo._id }).sort({ created_at: 1, _id: 1 }).lean(),
      Gatepass.find({ wo_id: wo._id }).sort({ _id: 1 }).lean(),
    ]);

  const gpItems = await GatepassItem.find({ gatepass_id: { $in: gatepasses.map((g) => g._id) } })
    .sort({ sr_no: 1 })
    .lean();

  const equipmentById = new Map(equipment.map((e) => [String(e._id), e]));
  const itemsWithEq = items.map((it) => {
    const eq = equipmentById.get(String(it.equipment_id)) || {};
    return {
      ...it,
      equipment_name: eq.name || "",
      equipment_serial: eq.serial_number || "",
    };
  });

  const equipmentItems = {};
  for (const e of equipment) equipmentItems[String(e._id)] = [];
  for (const it of itemsWithEq) {
    const key = String(it.equipment_id);
    if (equipmentItems[key]) equipmentItems[key].push(it);
  }

  const labourBySection = {};
  for (const l of labour) {
    (labourBySection[l.section] = labourBySection[l.section] || []).push(l);
  }

  const gpItemsByGp = {};
  for (const gi of gpItems) {
    (gpItemsByGp[String(gi.gatepass_id)] = gpItemsByGp[String(gi.gatepass_id)] || []).push(gi);
  }

  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const partsTotal = round2(itemsWithEq.reduce((s, i) => s + (i.amount || 0), 0));
  const labourTotal = round2(labour.reduce((s, l) => s + (l.amount || 0), 0));

  const delivery = equipmentDelivery(equipment, gpItems);

  return {
    wo,
    equipment,
    endorsement,
    sections,
    items: itemsWithEq,
    equipment_items: equipmentItems,
    labour,
    labour_by_section: labourBySection,
    finance,
    attachments,
    timeline: timeline.map((t) => ({ ...t, created_at: fmtDateTime(t.created_at) })),
    gatepasses: gatepasses.map((g) => ({
      ...g,
      created_at: fmtDateTime(g.created_at),
      created_display: fmtDate(g.created_at),
      items: gpItemsByGp[String(g._id)] || [],
      item_count: (gpItemsByGp[String(g._id)] || []).length,
    })),
    parts_total: partsTotal,
    labour_total: labourTotal,
    delivery,
  };
}

function equipmentDelivery(equipment, gatepassItems) {
  const deliveredByEq = {};
  for (const gi of gatepassItems) {
    if (!gi.equipment_id) continue;
    const k = String(gi.equipment_id);
    deliveredByEq[k] = (deliveredByEq[k] || 0) + (gi.quantity || 0);
  }
  const round2 = (n) => Math.round(n * 100) / 100;
  const rows = equipment.map((e) => {
    const delivered = round2(deliveredByEq[String(e._id)] || 0);
    const total = e.quantity || 1;
    return {
      id: e._id,
      name: e.name,
      serial_number: e.serial_number,
      unit: e.unit || "Nos",
      quantity: total,
      delivered,
      remaining: round2(Math.max(total - delivered, 0)),
      done: total - delivered <= 0,
    };
  });
  const overall =
    rows.length === 0
      ? "none"
      : rows.every((r) => r.done)
        ? "delivered"
        : rows.every((r) => r.delivered === 0)
          ? "none"
          : "partial";
  return { equipment: rows, overall };
}

module.exports = { loadWoBundle, equipmentDelivery };
