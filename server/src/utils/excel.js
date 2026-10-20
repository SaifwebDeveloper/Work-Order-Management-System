"use strict";

const ExcelJS = require("exceljs");
const XLSX = require("xlsx");

const BLUE_DARK = "FF003366";
const BLUE_MID = "FF1D5FA8";
const BORDER_STYLE = { style: "thin", color: { argb: "FF7A8899" } };
const BORDER = { top: BORDER_STYLE, left: BORDER_STYLE, bottom: BORDER_STYLE, right: BORDER_STYLE };

function styleHeader(cell, fill = BLUE_DARK, size = 11) {
  cell.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" }, size };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = BORDER;
}

function styleTitle(cell, size = 14) {
  cell.font = { name: "Calibri", bold: true, color: { argb: BLUE_DARK }, size };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

async function sendable(workbook) {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function exportInventoryWorkbook(rows, settings) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Inventory");
  ws.mergeCells("A1:D1");
  styleTitle(ws.getCell("A1"), 14);
  ws.getCell("A1").value = `${settings.org_name} — Repair & Maintenance Department | Item Master`;
  ws.getRow(1).height = 26;
  ["Description", "Store Code", "Unit Price", "Unit"].forEach((h, i) =>
    styleHeader(ws.getCell(3, i + 1), BLUE_DARK, 11)
  );
  ws.getCell("A3").value = "Description";
  ws.getCell("B3").value = "Store Code";
  ws.getCell("C3").value = "Unit Price";
  ws.getCell("D3").value = "Unit";
  rows.forEach((r, i) => {
    const row = ws.getRow(4 + i);
    row.getCell(1).value = r.description;
    row.getCell(2).value = r.store_code;
    row.getCell(3).value = r.unit_price;
    row.getCell(3).numFmt = "#,##0.00";
    row.getCell(4).value = r.unit;
    for (let c = 1; c <= 4; c++) row.getCell(c).border = BORDER;
  });
  ws.getColumn(1).width = 46;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 10;
  return sendable(wb);
}

async function buildSampleInventoryWorkbook() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Inventory");
  ws.mergeCells("A1:D1");
  styleTitle(ws.getCell("A1"), 14);
  ws.getCell("A1").value = "NRTC — Repair & Maintenance Department | Item Rate Import Format";
  ws.getRow(1).height = 26;
  ws.getCell("A3").value = "Description";
  ws.getCell("B3").value = "Store Code";
  ws.getCell("C3").value = "Unit Price";
  ws.getCell("D3").value = "Unit";
  ["A", "B", "C", "D"].forEach((c) => styleHeader(ws.getCell(`${c}3`)));
  const samples = [
    ["Alternator Assembly 24V 65A (MIL Spec)", "ALT-1001", 185000, "Nos"],
    ["Coaxial Cable RG-213/U (per meter)", "CBL-2001", 640, "Mtr"],
    ["VHF Antenna Folded Dipole 30-88 MHz", "AT-3001", 34500, "Nos"],
    ["Ball Bearing 6205-2RS", "MEC-4001", 1250, "Nos"],
    ["Earthing Rod Copper 16mm x 3M", "INS-5001", 5500, "Nos"],
  ];
  samples.forEach((s, i) => {
    const row = ws.getRow(4 + i);
    s.forEach((v, c) => {
      row.getCell(c + 1).value = v;
      row.getCell(c + 1).border = BORDER;
    });
    row.getCell(3).numFmt = "#,##0.00";
  });
  ws.getColumn(1).width = 46;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 10;
  return sendable(wb);
}

async function exportGatepassWorkbook(gp, wo, items, settings, qrBuffer) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Gate Pass");
  [7, 46, 20, 10, 9, 22].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  ws.mergeCells("A1:F1");
  styleTitle(ws.getCell("A1"), 15);
  ws.getCell("A1").value = settings.org_name.toUpperCase();
  ws.mergeCells("A2:F2");
  ws.getCell("A2").value = `${settings.dept_name} — ${settings.tagline}`;
  ws.getCell("A2").font = { name: "Calibri", size: 10, color: { argb: "FF444444" } };
  ws.getCell("A2").alignment = { horizontal: "center" };
  ws.mergeCells("A3:F3");
  ws.getCell("A3").value = "GATE PASS (MATERIAL)";
  ws.getCell("A3").font = { name: "Calibri", bold: true, size: 14, color: { argb: BLUE_DARK } };
  ws.getCell("A3").alignment = { horizontal: "center" };
  ws.mergeCells("A4:F4");
  ws.getCell("A4").value = `Gate Pass No: ${gp.gp_number}          Date: ${gp.created_display}`;
  ws.getCell("A4").font = { name: "Calibri", bold: true, size: 11 };
  ws.getCell("A4").alignment = { horizontal: "center" };

  let r = 6;
  ws.mergeCells(`A${r}:F${r}`);
  styleHeader(ws.getCell(`A${r}`));
  ws.getCell(`A${r}`).value = "SECTION A — RECIPIENT INFORMATION";

  const fieldRows = [
    ["Issued To (Mr/Ms):", gp.issued_to, "Designation:", gp.designation || "—"],
    ["Basis / Through:", gp.basis_through || "—", "Vehicle No:", gp.vehicle_no || "—"],
    ["Work Order No:", String(wo.wo_number), "Customer:", wo.customer_name],
    ["Pass Type:", gp.returnable ? "RETURNABLE" : "NON-RETURNABLE", "Expected Return:", gp.expected_return_date || "—"],
  ];
  for (const [l1, v1, l2, v2] of fieldRows) {
    r += 1;
    ws.mergeCells(`A${r}:B${r}`);
    ws.mergeCells(`D${r}:E${r}`);
    ws.getCell(`A${r}`).value = l1;
    ws.getCell(`A${r}`).font = { bold: true, size: 10 };
    ws.getCell(`C${r}`).value = v1;
    ws.getCell(`C${r}`).border = BORDER;
    ws.getCell(`D${r}`).value = l2;
    ws.getCell(`D${r}`).font = { bold: true, size: 10 };
    ws.getCell(`F${r}`).value = v2;
    ws.getCell(`F${r}`).border = BORDER;
  }

  r += 2;
  ws.mergeCells(`A${r}:F${r}`);
  styleHeader(ws.getCell(`A${r}`), BLUE_MID);
  ws.getCell(`A${r}`).value = "SECTION B — MATERIAL / EQUIPMENT DETAILS";
  r += 1;
  ["Sr. No", "Description", "Serial Number", "Quantity", "Unit", "Remarks"].forEach((h, i) => {
    styleHeader(ws.getCell(r, i + 1), BLUE_MID, 10);
    ws.getCell(r, i + 1).value = h;
  });
  for (const it of items) {
    r += 1;
    const values = [it.sr_no, it.description, it.serial_number || "—", it.quantity, it.unit || "Nos", it.remarks || ""];
    values.forEach((v, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = v;
      cell.border = BORDER;
      cell.alignment = {
        horizontal: [1, 4, 5].includes(i) ? "center" : "left",
        vertical: "middle",
        wrapText: i === 2 || i === 6,
      };
    });
  }

  r += 3;
  ws.mergeCells(`A${r}:F${r}`);
  ws.getCell(`A${r}`).value =
    `Received the above material in good condition.  ${settings.footer_note}  No manual signature required.`;
  ws.getCell(`A${r}`).font = { size: 9, italic: true, color: { argb: "FF555555" } };
  r += 2;
  ws.getCell(r, 2).value = "________________________";
  ws.getCell(r, 5).value = "________________________";
  ws.getCell(r + 1, 2).value = `Issued By: ${settings.sign_authority}`;
  ws.getCell(r + 1, 5).value = `Authority: ${settings.issuing_authority}`;
  ws.getCell(r + 1, 2).font = { size: 9 };
  ws.getCell(r + 1, 5).font = { size: 9 };

  if (qrBuffer) {
    const imgId = wb.addImage({ buffer: qrBuffer, extension: "png" });
    ws.addImage(imgId, {
      tl: { col: 0, row: r + 2 },
      ext: { width: 90, height: 90 },
    });
  }
  return sendable(wb);
}

// ---------------------------------------------------------- xlsx import
const HEADER_ALIASES = {
  description: new Set(["description", "item description", "part description", "parts used", "material description", "description of material", "description of item", "item name", "name of item", "particulars"]),
  store_code: new Set(["store code", "storecode", "code", "store code no", "item code", "item code no", "part code", "code no"]),
  unit_price: new Set(["unit price", "unit rate", "rate", "price", "unitprice", "item rate", "price per unit"]),
  unit: new Set(["unit", "uom", "u/m"]),
};

const PRICE_NOISE = /(?:rs|pkr|inr|rupees?|only)|₨|\/-/gi;

function normalizeHeader(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9/\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchHeaderField(norm) {
  for (const field of ["unit_price", "store_code", "description", "unit"]) {
    if (HEADER_ALIASES[field].has(norm)) return field;
  }
  for (const field of ["unit_price", "store_code", "description"]) {
    for (const alias of HEADER_ALIASES[field]) {
      if (norm && (norm.startsWith(alias) || norm.includes(alias))) return field;
    }
  }
  return null;
}

function parsePrice(raw) {
  if (typeof raw === "number") return raw;
  if (raw === null || raw === undefined || raw === "") return null;
  const text = String(raw).replace(PRICE_NOISE, " ").replace(/,/g, "");
  const m = text.match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function parseInventoryWorkbook(filePath) {
  let wb;
  try {
    wb = XLSX.readFile(filePath, { type: "file" });
  } catch (e) {
    return { rows: [], errors: ["The file could not be read. Please upload a valid .xlsx workbook."] };
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], errors: ["The workbook is empty."] };
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  const errors = [];
  let headerMap = null;
  let headerIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const mapping = {};
    (matrix[i] || []).forEach((value, colIdx) => {
      if (value === null || value === undefined) return;
      const field = matchHeaderField(normalizeHeader(value));
      if (field && mapping[field] === undefined) mapping[field] = colIdx;
    });
    if (mapping.store_code !== undefined && mapping.description !== undefined) {
      headerMap = mapping;
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    return { rows: [], errors: ["Required columns not found. Header row must contain 'Description', 'Store Code' and 'Unit Price'."] };
  }
  if (headerMap.unit_price === undefined) {
    errors.push("No 'Unit Price' column found in the workbook — items were imported with rate 0.");
  }
  const rows = [];
  const seen = new Set();
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i] || [];
    const cell = (field) => (headerMap[field] !== undefined ? row[headerMap[field]] : null);
    let code = cell("store_code");
    if (typeof code === "number" && Number.isInteger(code)) code = String(code);
    code = String(code ?? "").trim();
    const desc = String(cell("description") ?? "").trim();
    const priceRaw = cell("unit_price");
    const unit = String(cell("unit") ?? "").trim() || "Nos";
    if (!code && !desc && (priceRaw === null || priceRaw === undefined)) continue;
    if (!code || !desc) {
      errors.push(`Row ${i + 1}: skipped — Store Code and Description are required.`);
      continue;
    }
    let price = parsePrice(priceRaw);
    if (price === null) {
      if (priceRaw !== null && priceRaw !== undefined && priceRaw !== "") {
        errors.push(`Row ${i + 1}: invalid Unit Price '${priceRaw}', set to 0.`);
      }
      price = 0;
    }
    if (seen.has(code)) errors.push(`Row ${i + 1}: duplicate Store Code '${code}' in file — last one wins.`);
    seen.add(code);
    rows.push({ store_code: code, description: desc, unit, unit_price: price });
  }
  if (!rows.length) errors.push("No data rows found in the workbook.");
  return { rows, errors };
}

module.exports = {
  exportInventoryWorkbook,
  buildSampleInventoryWorkbook,
  exportGatepassWorkbook,
  parseInventoryWorkbook,
};
