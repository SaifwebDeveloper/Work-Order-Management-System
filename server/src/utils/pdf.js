"use strict";

const path = require("path");
const PDFDocument = require("pdfkit");
const { fmtDate, fmtMoney } = require("./helpers");

const BLUE_DARK = "#003366";
const BLUE_MID = "#1D5FA8";
const GOLD = "#C9A227";
const LIGHT = "#EAF1F9";
const GRAY = "#555555";
const LOGO = path.join(__dirname, "..", "..", "assets", "Nrtc_logo.png");

function baseDoc() {
  return new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
}

function orgHeader(doc, settings, { qrBuffer = null, subtitle = null } = {}) {
  const top = doc.y;
  try {
    doc.image(LOGO, 42, top, { width: 58 });
  } catch (e) {
    /* logo optional */
  }
  doc.font("Times-Bold").fontSize(15).fillColor(BLUE_DARK);
  doc.text(settings.org_name.toUpperCase(), 110, top + 2, {
    width: 372,
    align: "center",
  });
  doc.font("Times-Roman").fontSize(9).fillColor(GRAY);
  doc.text(`${settings.dept_name} — ${settings.tagline}`, 110, top + 24, {
    width: 372,
    align: "center",
  });
  if (subtitle) {
    doc.font("Times-Bold").fontSize(8).fillColor(GOLD);
    doc.text(subtitle, 110, top + 38, { width: 372, align: "center" });
  }
  if (qrBuffer) {
    doc.image(qrBuffer, 495, top, { width: 58 });
  }
  doc.y = top + 62;
  doc.moveTo(42, doc.y).lineTo(553, doc.y).lineWidth(1.4).strokeColor(BLUE_DARK).stroke();
  doc.moveDown(0.1);
  doc.moveTo(42, doc.y).lineTo(553, doc.y).lineWidth(0.6).strokeColor(GOLD).stroke();
  doc.moveDown(0.8);
}

function title(doc, text) {
  doc.font("Times-Bold").fontSize(16).fillColor(BLUE_DARK);
  doc.text(text, { align: "center" });
  doc.moveDown(0.6);
}

function kvTable(doc, rows, colWidths) {
  const startX = 42;
  let x = startX;
  const y0 = doc.y;
  const rowH = 20;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  rows.forEach((row, r) => {
    let cx = startX;
    row.forEach((cell, c) => {
      const isKey = c % 2 === 0;
      doc.rect(cx, y0 + r * rowH, colWidths[c], rowH).lineWidth(0.6).strokeColor("#7A8899").stroke();
      doc.font(isKey ? "Helvetica-Bold" : "Helvetica").fontSize(isKey ? 8 : 9);
      doc.fillColor(isKey ? BLUE_DARK : "#111111");
      doc.text(String(cell ?? "—"), cx + 4, y0 + r * rowH + 6, {
        width: colWidths[c] - 8,
        lineBreak: false,
      });
      cx += colWidths[c];
    });
  });
  doc.y = y0 + rows.length * rowH + 8;
  return totalW;
}

function dataTable(doc, headers, rows, colWidths, aligns = []) {
  const startX = 42;
  const y0 = doc.y;
  let rowH = 18;
  const drawRow = (cells, y, isHeader) => {
    let cx = startX;
    cells.forEach((cell, c) => {
      doc.rect(cx, y, colWidths[c], rowH).lineWidth(0.6).strokeColor("#7A8899").stroke();
      if (isHeader) {
        doc.rect(cx, y, colWidths[c], rowH).fillColor(BLUE_DARK).fill();
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF");
      } else {
        doc.font("Helvetica").fontSize(8.5).fillColor("#111111");
      }
      const align = aligns[c] || "left";
      doc.text(String(cell ?? ""), cx + 4, y + 5, {
        width: colWidths[c] - 8,
        align,
        lineBreak: false,
      });
      cx += colWidths[c];
    });
  };
  drawRow(headers, y0, true);
  let y = y0 + rowH;
  rows.forEach((r) => {
    // wrap-aware height
    let needed = rowH;
    r.forEach((cell, c) => {
      doc.font("Helvetica").fontSize(8.5);
      const h = doc.heightOfString(String(cell ?? ""), { width: colWidths[c] - 8 });
      needed = Math.max(needed, h + 9);
    });
    rowH = needed;
    drawRow(r, y, false);
    y += rowH;
    rowH = 18;
  });
  doc.y = y + 8;
}

function signRow(doc, settings) {
  doc.moveDown(3);
  const y = doc.y;
  const cols = [
    { x: 42, label: "Receiver's Name & NIC No." },
    { x: 222, label: "Security / Gate Incharge" },
    { x: 402, label: `${settings.sign_authority}\n(Issuing Authority — R&M Dept)` },
  ];
  cols.forEach((c) => {
    doc.moveTo(c.x, y).lineTo(c.x + 130, y).lineWidth(0.7).strokeColor("#333333").stroke();
    doc.font("Helvetica").fontSize(8).fillColor(GRAY);
    doc.text(c.label, c.x, y + 4, { width: 130, align: "center" });
  });
  doc.y = y + 34;
}

function footerNote(doc, settings, extra = "") {
  doc.font("Helvetica-Oblique").fontSize(8).fillColor(GRAY);
  doc.text(
    `${settings.footer_note} ${extra || "This document is system generated."}`,
    42,
    doc.y,
    { width: 511 }
  );
}

// ------------------------------------------------------------ gate pass
async function buildGatepassPdf(gp, wo, items, settings, qrBuffer) {
  const doc = baseDoc();
  orgHeader(doc, settings, { qrBuffer, subtitle: "GOVERNMENT OF PAKISTAN" });
  title(doc, "GATE PASS (MATERIAL)");

  doc.font("Helvetica-Bold").fontSize(9);
  doc.fillColor("#111111").text(`Gate Pass No.: ${gp.gp_number}`, { continued: true, width: 511 });
  doc.text(`    Date: ${gp.created_display}`, { continued: true });
  doc.text(`    Work Order No.: ${wo.wo_number}`);
  doc.moveDown(0.4);

  doc.rect(42, doc.y, 511, 16).fillColor(LIGHT).fill();
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE_DARK);
  doc.text("SECTION A — RECIPIENT / MOVEMENT INFORMATION", 48, doc.y - 12);
  doc.moveDown(0.4);

  kvTable(doc, [
    ["Issued To (Mr/Ms)", gp.issued_to, "Designation", gp.designation || "—"],
    ["Basis / Through", gp.basis_through || "—", "Vehicle No.", gp.vehicle_no || "—"],
    ["Work Order No.", String(wo.wo_number), "Customer / Formation", wo.customer_name],
    ["Pass Type", gp.returnable ? "RETURNABLE" : "NON-RETURNABLE", "Expected Return", gp.expected_return_date ? fmtDate(gp.expected_return_date) : "—"],
  ], [95, 160, 95, 161]);

  doc.rect(42, doc.y, 511, 16).fillColor(LIGHT).fill();
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE_DARK);
  doc.text("SECTION B — MATERIAL / EQUIPMENT DETAILS", 48, doc.y - 12);
  doc.moveDown(0.4);

  dataTable(
    doc,
    ["Sr. No", "Description of Material / Equipment", "Serial Number", "Qty", "Unit", "Remarks"],
    items.map((it) => [
      it.sr_no,
      it.description,
      it.serial_number || "—",
      String(Number(it.quantity)),
      it.unit || "Nos",
      it.remarks || "",
    ]),
    [40, 191, 90, 40, 45, 105],
    ["center", "left", "center", "center", "center", "left"]
  );

  if (gp.remarks) {
    doc.font("Helvetica").fontSize(9).fillColor("#111111");
    doc.text(`Remarks: ${gp.remarks}`, 42, doc.y, { width: 511 });
    doc.moveDown(0.5);
  }
  signRow(doc, settings);
  footerNote(
    doc,
    settings,
    "This pass is valid only for the material listed above. Digitally generated — QR code carries the verification payload."
  );
  return doc;
}

// ---------------------------------------------------------- work order
function buildWorkOrderPdf(bundle, settings) {
  const { wo, equipment, items, labour, finance, endorsement } = bundle;
  const doc = baseDoc();
  orgHeader(doc, settings, { subtitle: "GOVERNMENT OF PAKISTAN" });
  title(doc, "WORK ORDER");

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111111");
  doc.text(`Work Order No.: ${wo.wo_number}`, { continued: true });
  doc.text(`    Date: ${fmtDate(wo.wo_date)}`);
  doc.text(`Status: ${wo.status.replace(/_/g, " ").toUpperCase()}`);
  doc.moveDown(0.4);

  kvTable(doc, [
    ["Customer / Formation", wo.customer_name, "Reference No.", wo.reference_number || "—"],
    ["Contract No.", wo.contract_number || "—", "Warranty", wo.under_warranty ? "Under Warranty" : "Paid"],
    ...(endorsement
      ? [["P3&C Ref", endorsement.ref_no || "—", "P3&C Ref Date", endorsement.ref_date ? fmtDate(endorsement.ref_date) : "—"]]
      : []),
  ], [95, 160, 95, 161]);

  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE_DARK);
  doc.text("EQUIPMENT UNDER REPAIR", 42, doc.y);
  doc.moveDown(0.3);
  dataTable(
    doc,
    ["#", "Equipment", "Serial Number", "Reported Defect"],
    equipment.map((e, i) => [i + 1, e.name, e.serial_number || "—", e.defect || "—"]),
    [28, 190, 130, 163]
  );

  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE_DARK);
  doc.text("PARTS USED (PRODUCTION II)", 42, doc.y);
  doc.moveDown(0.3);
  const currency = settings.currency || "Rs.";
  dataTable(
    doc,
    ["Equipment", "Part Description", "Store Code", "Qty", "Unit Price", "Amount"],
    items.length
      ? items.map((it) => [
          it.equipment_name,
          it.part_description || "—",
          it.store_code || "—",
          `${Number(it.qty)} ${it.unit || ""}`.trim(),
          fmtMoney(it.unit_price, currency),
          fmtMoney(it.amount, currency),
        ])
      : [["—", "No parts recorded", "", "", "", ""]],
    [120, 130, 70, 45, 73, 73],
    ["left", "left", "left", "center", "right", "right"]
  );

  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE_DARK);
  doc.text("LABOUR HOURS CHARGES (PRODUCTION II)", 42, doc.y);
  doc.moveDown(0.3);
  dataTable(
    doc,
    ["Section", "Work Description", "Hours", "Rate", "Amount"],
    labour.length
      ? labour.map((l) => [
          l.section,
          l.description,
          String(Number(l.hours)),
          fmtMoney(l.rate, currency),
          fmtMoney(l.amount, currency),
        ])
      : [["—", "No labour charges recorded", "", "", ""]],
    [90, 210, 55, 78, 78],
    ["left", "left", "center", "right", "right"]
  );

  if (finance) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE_DARK);
    doc.text("COST SHEET", 42, doc.y);
    doc.moveDown(0.3);
    kvTable(doc, [
      ["Cost Sheet No.", finance.cost_sheet_no || "—", "Date", finance.cost_sheet_date ? fmtDate(finance.cost_sheet_date) : "—"],
      ["Component Amount", fmtMoney(finance.component_amount, currency), "GST (Component)", fmtMoney(finance.component_gst, currency)],
      ["Labour Charges", fmtMoney(finance.labour_base, currency), "GST (Labour)", fmtMoney(finance.labour_gst, currency)],
      ["I/C Costing", fmtMoney(finance.ic_costing, currency), "TOTAL AMOUNT", fmtMoney(finance.total_amount, currency)],
    ], [95, 160, 95, 161]);
  }

  if (wo.nrtc_check_remarks) {
    doc.font("Helvetica").fontSize(9).fillColor("#111111");
    doc.text(`R&M Check Remarks: ${wo.nrtc_check_remarks}`, 42, doc.y, { width: 511 });
    doc.moveDown(0.5);
  }
  signRow(doc, settings);
  footerNote(doc, settings);
  return doc;
}

module.exports = { buildGatepassPdf, buildWorkOrderPdf, gatepassQrPayload };

function gatepassQrPayload(gp, wo, itemCount) {
  return [
    "NRTC GATE PASS",
    `GP:${gp.gp_number}`,
    `WO:${wo.wo_number}`,
    `DATE:${gp.created_display}`,
    `CUSTOMER:${wo.customer_name}`,
    `ITEMS:${itemCount}`,
    `TYPE:${gp.returnable ? "RETURNABLE" : "NON-RETURNABLE"}`,
    `TOKEN:${gp.qr_token}`,
  ].join("|");
}
