"use strict";

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { UPLOAD_DIR, makeStoredName, ALLOWED_EXTENSIONS } = require("./helpers");

const TMP_DIR = path.join(UPLOAD_DIR, "tmp");
fs.mkdirSync(TMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => cb(null, makeStoredName(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`File type '${ext || "unknown"}' is not allowed.`));
    }
    cb(null, true);
  },
});

// Move files from the temp dir into the work order's own folder.
function moveUploadsToWo(files, woId) {
  const destDir = path.join(UPLOAD_DIR, "work_orders", String(woId));
  fs.mkdirSync(destDir, { recursive: true });
  const moved = [];
  for (const f of files || []) {
    const dest = path.join(destDir, f.filename);
    fs.renameSync(f.path, dest);
    moved.push({
      original_name: f.originalname,
      stored_name: f.filename,
      mime: f.mimetype,
      size: f.size,
    });
  }
  return moved;
}

module.exports = { upload, moveUploadsToWo, TMP_DIR };
