/**
 * src/middlewares/upload.middleware.js
 *
 * WHY: Centralising Multer configuration means:
 *  - File size limits, allowed MIME types, and destination directories are
 *    enforced in one place and never drift across routes (DRY).
 *  - Each upload type (image, csv, excel, json) gets its own diskStorage
 *    instance so uploaded files land in the correct subfolder automatically.
 *  - The fileFilter rejects invalid types before they ever reach the service
 *    layer, keeping business logic clean (Validation Layer).
 */

"use strict";

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const AppError = require("../exceptions/AppError");

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

// Ensure upload sub-directories exist at startup
["images", "csv", "excel", "json"].forEach((dir) => {
  fs.mkdirSync(path.join(UPLOAD_ROOT, dir), { recursive: true });
});

// ── Storage factory ───────────────────────────────────────────────────────────
/**
 * Creates a Multer DiskStorage instance for a specific sub-folder.
 * @param {string} subfolder - e.g. 'images' | 'csv' | 'excel' | 'json'
 */
const makeStorage = (subfolder) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(UPLOAD_ROOT, subfolder));
    },
    filename: (_req, file, cb) => {
      // Use timestamp + sanitised original name to prevent collisions
      const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      cb(null, `${Date.now()}-${safe}`);
    },
  });

// ── MIME-type filter factories ────────────────────────────────────────────────
const makeFilter = (allowedMimeTypes, allowedExts) => (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      AppError.unsupportedMediaType(
        `File type not allowed. Expected: ${allowedExts.join(", ")}`
      ),
      false
    );
  }
};

// ── Pre-built Multer instances ────────────────────────────────────────────────

/** Accepts JPG / JPEG images only */
const uploadImage = multer({
  storage: makeStorage("images"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: makeFilter(
    ["image/jpeg", "image/jpg"],
    [".jpg", ".jpeg"]
  ),
}).single("image");

/** Accepts CSV files */
const uploadCSV = multer({
  storage: makeStorage("csv"),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: makeFilter(
    ["text/csv", "application/csv", "text/plain"],
    [".csv"]
  ),
}).single("file");

/** Accepts Excel files */
const uploadExcel = multer({
  storage: makeStorage("excel"),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: makeFilter(
    [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
    [".xlsx", ".xls"]
  ),
}).single("file");

/** Accepts JSON files */
const uploadJSON = multer({
  storage: makeStorage("json"),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: makeFilter(
    ["application/json", "text/plain"],
    [".json"]
  ),
}).single("file");

/**
 * Wraps a Multer upload middleware to convert Multer errors into AppErrors,
 * keeping error handling uniform throughout the pipeline.
 *
 * @param {Function} uploadFn - One of the uploadXxx instances above.
 * @returns {import('express').RequestHandler}
 */
const wrapMulter = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (!err) return next();

    // Multer-specific errors
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(AppError.fileTooLarge("Uploaded file exceeds the allowed size limit"));
    }
    if (err instanceof multer.MulterError) {
      return next(AppError.badRequest(`Upload error: ${err.message}`));
    }
    // AppError thrown inside fileFilter propagates directly
    if (err.isOperational) return next(err);

    next(AppError.internal(`Unexpected upload error: ${err.message}`));
  });
};

module.exports = {
  uploadImage: wrapMulter(uploadImage),
  uploadCSV: wrapMulter(uploadCSV),
  uploadExcel: wrapMulter(uploadExcel),
  uploadJSON: wrapMulter(uploadJSON),
};
