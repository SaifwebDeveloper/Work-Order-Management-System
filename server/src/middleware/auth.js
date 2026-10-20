"use strict";

const jwt = require("jsonwebtoken");
const { User } = require("../models");

function signToken(user) {
  return jwt.sign(
    { uid: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || "nrtc-rm-secret-change-in-production-2026",
    { expiresIn: "12h" }
  );
}

async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required." });
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "nrtc-rm-secret-change-in-production-2026"
    );
    const user = await User.findById(payload.uid).lean();
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Account is disabled or removed." });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired. Please sign in again." });
  }
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to access this resource." });
    }
    next();
  };
}

// Officer = production user with no section assigned => may see prices.
function canSeePrices(user) {
  return user.role !== "production" || !(user.section || "");
}

module.exports = { signToken, authRequired, roleRequired, canSeePrices };
