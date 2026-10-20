"use strict";

const path = require("path");
const crypto = require("crypto");
const { Setting, Notification, WoTimeline } = require("../models");
const { DEFAULT_SETTINGS } = require("../constants");

// ------------------------------------------------------------- settings
let settingsCache = null;

async function loadSettings(force = false) {
  if (settingsCache && !force) return settingsCache;
  const rows = await Setting.find().lean();
  const map = { ...DEFAULT_SETTINGS };
  for (const r of rows) map[r.key] = r.value;
  settingsCache = map;
  return map;
}

async function getSetting(key, defaultValue = "") {
  const all = await loadSettings();
  return all[key] !== undefined ? all[key] : defaultValue;
}

async function invalidateSettingsCache() {
  settingsCache = null;
}

// ------------------------------------------------------ notifications
async function notify({ title, message = "", link = "", role = null, userId = null }) {
  await Notification.create({ title, message, link, role, user_id: userId });
}

async function notifySections(sections, { title, message = "", link = "" }) {
  const { User } = require("../models");
  const users = await User.find({ role: "production", is_active: true }).lean();
  const targets = users.filter((u) => !u.section || sections.includes(u.section));
  if (targets.length) {
    await Notification.insertMany(
      targets.map((u) => ({ title, message, link, user_id: u._id }))
    );
  }
}

// ----------------------------------------------------------- timeline
async function addTimeline(woId, stage, action, notes = "", actor = null) {
  await WoTimeline.create({
    wo_id: woId,
    stage,
    action,
    notes,
    actor_id: actor ? actor._id : null,
    actor_name: actor ? actor.full_name : "",
  });
}

// ----------------------------------------------------------- formatting
function pad2(n) {
  return String(n).padStart(2, "0");
}

function nowStr() {
  const d = new Date();
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmtDate(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return `${pad2(value.getDate())}-${pad2(value.getMonth() + 1)}-${value.getFullYear()}`;
  }
  const s = String(value).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
}

function fmtDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const date = fmtDate(d);
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${date}, ${h}:${pad2(d.getMinutes())} ${ampm}`;
}

function fmtMoney(value, currency = "Rs.") {
  const n = Number(value) || 0;
  return `${currency} ${n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseFloatOr(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

// ------------------------------------------------------------- uploads
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

function makeStoredName(originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  return `${crypto.randomBytes(12).toString("hex")}${ext}`;
}

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tif", ".tiff",
]);

module.exports = {
  loadSettings,
  getSetting,
  invalidateSettingsCache,
  notify,
  notifySections,
  addTimeline,
  nowStr,
  todayStr,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  parseFloatOr,
  UPLOAD_DIR,
  makeStoredName,
  ALLOWED_EXTENSIONS,
};
