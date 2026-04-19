/**
 * src/services/upload.service.js
 *
 * WHY – Service Layer Pattern:
 *  - All upload business logic (parsing, normalising, persisting) lives here.
 *  - Controllers call service methods; they never import parsers or repositories
 *    directly (Separation of Concerns, Dependency Inversion).
 *  - S3 integration is isolated in a private helper so the rest of the method
 *    stays readable (SRP).
 */

"use strict";

const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");
const logger = require("../utils/logger");
const { parseFile } = require("../factories/parser.factory");
const intelligenceRepository = require("../repositories/intelligence.repository");
const AppError = require("../exceptions/AppError");
const { SOURCE_TYPES } = require("../constants/intelligenceTypes");

// ── Optional AWS S3 client (only initialised when credentials are configured) ─
let s3Client = null;
if (env.s3Enabled) {
  const AWS = require("aws-sdk");
  s3Client = new AWS.S3({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
  });
  logger.info("AWS S3 client initialised");
}

class UploadService {
  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Uploads a file buffer to S3 and returns the public URL.
   * Falls back to a local path URL if S3 is not configured.
   *
   * @param {Buffer} buffer
   * @param {string} key      - S3 object key (path inside bucket).
   * @param {string} mimeType
   * @returns {Promise<string>} Public URL
   */
  async #uploadToS3OrLocal(buffer, key, mimeType) {
    if (s3Client) {
      const result = await s3Client
        .upload({
          Bucket: env.AWS_S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ACL: "public-read",
        })
        .promise();
      return result.Location;
    }
    // Local fallback: return a relative URL served by Express static middleware
    return `/uploads/${key}`;
  }

  /**
   * Builds a metadata object from the uploaded file info.
   * Standardises the provenance data attached to every ingested record.
   *
   * @param {Express.Multer.File} file
   * @param {string}              source
   * @returns {Object}
   */
  #buildFileMetadata(file, source) {
    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      source,
      ingestedAt: new Date().toISOString(),
    };
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Parses a structured file (CSV / Excel / JSON), normalises all rows, and
   * bulk-inserts them into MongoDB.
   *
   * @param {Express.Multer.File} file     - Multer file object.
   * @param {string}              sourceType - HUMINT | OSINT
   * @returns {Promise<Object>}
   */
  async processStructuredFile(file, sourceType = SOURCE_TYPES.HUMINT) {
    logger.debug(`Processing structured file: ${file.originalname}`);

    const { rows, errors } = await parseFile(file.path);

    if (rows.length === 0) {
      throw AppError.unprocessable("No valid records found in the uploaded file", errors);
    }

    // Enrich each row with file-level defaults before persistence
    const enriched = rows.map((row) => ({
      ...row,
      sourceType: row.sourceType || sourceType,
      metadata: {
        ...(row.metadata || {}),
        ...this.#buildFileMetadata(file, "file_upload"),
      },
    }));

    const inserted = await intelligenceRepository.bulkCreate(enriched);

    // Clean up the uploaded file after successful processing
    fs.unlink(file.path, (err) => {
      if (err) logger.warn(`Failed to delete temp file ${file.path}: ${err.message}`);
    });

    return {
      total: rows.length,
      inserted: inserted.length,
      skippedErrors: errors,
    };
  }

  /**
   * Processes an uploaded image file.
   *  1. Optionally uploads to S3 (or keeps locally).
   *  2. Creates an IMINT intelligence record with the image URL.
   *
   * @param {Express.Multer.File} file
   * @param {Object}              body  - Request body containing lat/lon/title.
   * @returns {Promise<Object>}         - Created intelligence record.
   */
  async processImageUpload(file, body) {
    logger.debug(`Processing image upload: ${file.originalname}`);

    const { latitude, longitude, title, description, confidenceScore } = body;
    const ext = path.extname(file.originalname).toLowerCase();
    const s3Key = `images/${uuidv4()}${ext}`;

    // Upload to S3 or keep local path
    const imageBuffer = fs.readFileSync(file.path);
    const imageUrl = await this.#uploadToS3OrLocal(imageBuffer, s3Key, file.mimetype);

    // Clean up local temp file
    fs.unlink(file.path, (err) => {
      if (err) logger.warn(`Failed to delete temp file ${file.path}: ${err.message}`);
    });

    const record = await intelligenceRepository.create({
      sourceType: SOURCE_TYPES.IMINT,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      title: title || file.originalname,
      description: description || "",
      imageUrl,
      confidenceScore: parseFloat(confidenceScore) || 50,
      metadata: this.#buildFileMetadata(file, "image_upload"),
    });

    return record;
  }

  /**
   * Processes a raw JSON body (not a file upload) for direct OSINT ingestion.
   *
   * @param {Object|Object[]} payload
   * @returns {Promise<Object>}
   */
  async processJSONPayload(payload) {
    const items = Array.isArray(payload) ? payload : [payload];
    const { parseCoordinates } = require("../utils/geoFormatter");

    const rows = [];
    const errors = [];

    for (const [i, item] of items.entries()) {
      try {
        const coords = parseCoordinates(
          item.latitude ?? item.lat,
          item.longitude ?? item.lon ?? item.lng
        );
        rows.push({
          ...coords,
          sourceType: (item.sourceType || "OSINT").toUpperCase(),
          title: (item.title || "Untitled").toString().trim(),
          description: (item.description || "").toString().trim(),
          confidenceScore: parseFloat(item.confidenceScore ?? 50),
          imageUrl: item.imageUrl || null,
          metadata: item.metadata || {},
        });
      } catch (err) {
        errors.push(`Item ${i}: ${err.message}`);
      }
    }

    if (rows.length === 0) {
      throw AppError.unprocessable("No valid records in JSON payload", errors);
    }

    const inserted = await intelligenceRepository.bulkCreate(rows);
    return { total: items.length, inserted: inserted.length, skippedErrors: errors };
  }
}

module.exports = new UploadService();
