"use strict";

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { UPLOAD_DIR } = require("./utils/helpers");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

fs.mkdirSync(path.join(UPLOAD_DIR, "tmp"), { recursive: true });

app.get("/api/health", (req, res) => res.json({ ok: true, service: "nrtc-rm-server" }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api", require("./routes/main"));
app.use("/api/nrtc", require("./routes/nrtc"));
app.use("/api/p3c", require("./routes/p3c"));
app.use("/api/production", require("./routes/production"));
app.use("/api/finance", require("./routes/finance"));
app.use("/api/gatepasses", require("./routes/gatepass"));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.name === "MulterError") {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error." });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`NRTC R&M API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
