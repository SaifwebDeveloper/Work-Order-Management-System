"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { signToken, authRequired } = require("../middleware/auth");
const { ROLES, SECTION_LABELS } = require("../constants");

const router = express.Router();

function publicUser(u) {
  return {
    id: u._id,
    username: u.username,
    full_name: u.full_name,
    role: u.role,
    section: u.section || null,
    email: u.email || "",
    phone: u.phone || "",
    must_change_password: !!u.must_change_password,
  };
}

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  const user = await User.findOne({ username: String(username).trim() });
  if (!user || !user.is_active || !(await bcrypt.compare(String(password), user.password_hash))) {
    return res.status(401).json({ error: "Invalid username or password." });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post("/signup", async (req, res) => {
  const { username, password, full_name, role, section } = req.body || {};
  const uname = String(username || "").trim();
  if (uname.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters." });
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (!full_name || !String(full_name).trim()) {
    return res.status(400).json({ error: "Full name is required." });
  }
  if (!ROLES[role]) return res.status(400).json({ error: "Please select a valid department role." });
  let sec = null;
  if (role === "production") {
    if (!section || !SECTION_LABELS[section]) {
      return res.status(400).json({ error: "Please select a valid Production II section." });
    }
    sec = section;
  }
  if (await User.findOne({ username: uname })) {
    return res.status(400).json({ error: "Username is already taken." });
  }
  const user = await User.create({
    username: uname,
    password_hash: await bcrypt.hash(String(password), 10),
    full_name: String(full_name).trim(),
    role,
    section: sec,
  });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.get("/me", authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.put("/profile", authRequired, async (req, res) => {
  const { full_name, email, phone } = req.body || {};
  const update = {};
  if (full_name !== undefined) {
    if (!String(full_name).trim()) return res.status(400).json({ error: "Full name cannot be empty." });
    update.full_name = String(full_name).trim();
  }
  if (email !== undefined) update.email = String(email).trim();
  if (phone !== undefined) update.phone = String(phone).trim();
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
  res.json({ user: publicUser(user) });
});

router.post("/profile/password", authRequired, async (req, res) => {
  const { current_password, new_password } = req.body || {};
  const user = await User.findById(req.user._id);
  if (!(await bcrypt.compare(String(current_password || ""), user.password_hash))) {
    return res.status(400).json({ error: "Current password is incorrect." });
  }
  if (!new_password || String(new_password).length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }
  user.password_hash = await bcrypt.hash(String(new_password), 10);
  user.must_change_password = false;
  await user.save();
  res.json({ ok: true });
});

module.exports = router;
