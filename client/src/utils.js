export const ROLES = {
  nrtc_admin: "Repair & Maintenance Dept (NRTC)",
  p3c: "P3 & C Department",
  production: "Production II Department",
  finance: "Finance Department",
};

export const PRODUCTION_SECTIONS = [
  ["alternator", "Alternator Section"],
  ["cable", "Cable Section"],
  ["at", "A & T Section"],
  ["mechanical", "Mechanical Section"],
  ["installation", "Installation Section"],
  ["other", "Other"],
];

export const SECTION_LABELS = Object.fromEntries(PRODUCTION_SECTIONS);

export const STATUS_LABELS = {
  draft: "Draft",
  pending_p3c: "Pending P3&C Endorsement",
  pending_production: "Pending Production II",
  pending_nrtc_check: "Pending R&M Check",
  pending_finance: "Pending Finance Costing",
  pending_nrtc_final: "Pending R&M Final Approval",
  completed: "Completed",
};

export const STATUS_COLORS = {
  draft: "gray",
  pending_p3c: "amber",
  pending_production: "blue",
  pending_nrtc_check: "violet",
  pending_finance: "teal",
  pending_nrtc_final: "gold",
  completed: "green",
};

export const STATUS_FLOW = [
  "draft",
  "pending_p3c",
  "pending_production",
  "pending_nrtc_check",
  "pending_finance",
  "pending_nrtc_final",
  "completed",
];

export const CHART_COLORS = {
  gray: "#94A3B8",
  amber: "#D97706",
  blue: "#2563EB",
  violet: "#7C3AED",
  teal: "#0D9488",
  gold: "#C9A227",
  green: "#16A34A",
  red: "#DC2626",
};

export function fmtMoney(value, currency = "Rs.") {
  const n = Number(value) || 0;
  return `${currency} ${n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(value) {
  if (!value) return "";
  const s = String(value).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
}

export function fmtDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${fmtDate(d)}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

export function fmtQty(value) {
  const n = Number(value) || 0;
  return String(Math.round(n * 100) / 100).replace(/\.0+$|(\.\d*?)0+$/, "$1");
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
