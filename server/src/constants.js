"use strict";

const ROLES = {
  nrtc_admin: "Repair & Maintenance Dept (NRTC)",
  p3c: "P3 & C Department",
  production: "Production II Department",
  finance: "Finance Department",
};

const PRODUCTION_SECTIONS = [
  ["alternator", "Alternator Section"],
  ["cable", "Cable Section"],
  ["at", "A & T Section"],
  ["mechanical", "Mechanical Section"],
  ["installation", "Installation Section"],
  ["other", "Other"],
];

const SECTION_LABELS = Object.fromEntries(PRODUCTION_SECTIONS);

const STATUS_LABELS = {
  draft: "Draft",
  pending_p3c: "Pending P3&C Endorsement",
  pending_production: "Pending Production II",
  pending_nrtc_check: "Pending R&M Check",
  pending_finance: "Pending Finance Costing",
  pending_nrtc_final: "Pending R&M Final Approval",
  completed: "Completed",
};

const STATUS_COLORS = {
  draft: "gray",
  pending_p3c: "amber",
  pending_production: "blue",
  pending_nrtc_check: "violet",
  pending_finance: "teal",
  pending_nrtc_final: "gold",
  completed: "green",
};

const DEFAULT_SETTINGS = {
  org_name: "National Radio Telecommunication Corporation",
  org_short: "NRTC",
  dept_name: "Repair & Maintenance Department",
  tagline: "Ministry of Defence Production — Government of Pakistan",
  org_address: "NRTC, Haripur, Khyber Pakhtunkhwa, Pakistan",
  org_phone: "+92 995 920001",
  org_email: "rm.dept@nrtc.gov.pk",
  org_website: "www.nrtc.gov.pk",
  currency: "Rs.",
  gst_component: "18",
  gst_labour: "15",
  wo_start: "1300",
  gp_prefix: "GP",
  footer_note: "This is a system generated document of NRTC — Repair & Maintenance Department.",
  sign_authority: "Deputy Manager (Repair & Maintenance)",
  issuing_authority: "Incharge Gate / Security Section, NRTC",
};

const STATUS_FLOW = [
  "draft",
  "pending_p3c",
  "pending_production",
  "pending_nrtc_check",
  "pending_finance",
  "pending_nrtc_final",
  "completed",
];

module.exports = {
  ROLES,
  PRODUCTION_SECTIONS,
  SECTION_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  DEFAULT_SETTINGS,
  STATUS_FLOW,
};
