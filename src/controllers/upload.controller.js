/**
 * src/controllers/upload.controller.js
 *
 * WHY: Upload-specific endpoints get their own controller so the intelligence
 * query controller stays focused on retrieval concerns (SRP).
 * This controller only does three things per method:
 *   1. Verify the file exists on req.file.
 *   2. Delegate to uploadService.
 *   3. Return the result.
 */

"use strict";

const uploadService = require("../services/upload.service");
const AppError = require("../exceptions/AppError");
const { sendCreated } = require("../utils/responseHandler");

class UploadController {
  /**
   * POST /api/intelligence/upload/json
   * Accepts a JSON file OR a raw JSON body and ingests all records.
   */
  async uploadJSON(req, res, next) {
    try {
      let result;

      if (req.file) {
        // File-based JSON upload
        result = await uploadService.processStructuredFile(req.file, "HUMINT");
      } else if (req.body && Object.keys(req.body).length > 0) {
        // Direct JSON body upload (OSINT API push)
        result = await uploadService.processJSONPayload(req.body);
      } else {
        throw AppError.badRequest("No file or JSON body provided");
      }

      return sendCreated(res, result, "JSON intelligence data ingested successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/intelligence/upload/csv
   * Accepts a CSV file and bulk-inserts normalised records.
   */
  async uploadCSV(req, res, next) {
    try {
      if (!req.file) throw AppError.badRequest("No CSV file uploaded");

      const result = await uploadService.processStructuredFile(req.file, "HUMINT");
      return sendCreated(res, result, "CSV intelligence data ingested successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/intelligence/upload/excel
   * Accepts an Excel file (.xlsx / .xls) and bulk-inserts normalised records.
   */
  async uploadExcel(req, res, next) {
    try {
      if (!req.file) throw AppError.badRequest("No Excel file uploaded");

      const result = await uploadService.processStructuredFile(req.file, "HUMINT");
      return sendCreated(res, result, "Excel intelligence data ingested successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/intelligence/upload/image
   * Accepts a JPG/JPEG image, stores it (S3 or local), and creates an IMINT record.
   */
  async uploadImage(req, res, next) {
    try {
      if (!req.file) throw AppError.badRequest("No image file uploaded");

      const record = await uploadService.processImageUpload(req.file, req.body);
      return sendCreated(res, { record }, "Image intelligence record created successfully");
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UploadController();
