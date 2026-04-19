/**
 * src/controllers/intelligence.controller.js
 *
 * WHY – Controller Layer Pattern:
 *  - Controllers are ONLY responsible for:
 *      1. Extracting data from req (params, query, body).
 *      2. Calling the correct service method.
 *      3. Sending the response via responseHandler.
 *  - Zero business logic lives here. Any rule-change never touches controllers.
 *  - Every method is wrapped in try/catch → next(err), delegating all error
 *    formatting to the global error middleware (Separation of Concerns).
 */

"use strict";

const intelligenceService = require("../services/intelligence.service");
const { sendSuccess, sendCreated } = require("../utils/responseHandler");

class IntelligenceController {
  /**
   * GET /api/intelligence/all
   * Returns paginated list of intelligence records.
   */
  async getAll(req, res, next) {
    try {
      const result = await intelligenceService.getAllRecords(req.query);
      return sendSuccess(res, result, "Intelligence records retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/intelligence/:id
   * Returns a single intelligence record.
   */
  async getById(req, res, next) {
    try {
      const record = await intelligenceService.getRecordById(req.params.id);
      return sendSuccess(res, { record }, "Intelligence record retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/intelligence/:id
   * Deletes a single intelligence record.
   */
  async deleteById(req, res, next) {
    try {
      const deleted = await intelligenceService.deleteRecord(req.params.id);
      return sendSuccess(res, { deleted }, "Intelligence record deleted successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/intelligence/nearby
   * Geo-proximity search.
   * Query: latitude, longitude, radius (metres, optional)
   */
  async getNearby(req, res, next) {
    try {
      const { latitude, longitude, radius } = req.query;
      const records = await intelligenceService.findNearby(
        parseFloat(latitude),
        parseFloat(longitude),
        radius ? parseFloat(radius) : undefined
      );
      return sendSuccess(res, { records, total: records.length }, "Nearby records retrieved");
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new IntelligenceController();
