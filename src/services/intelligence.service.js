/**
 * src/services/intelligence.service.js
 *
 * WHY – Service Layer Pattern:
 *  - Houses all query / retrieval business rules (filtering, pagination,
 *    validation against domain constraints).
 *  - Completely isolated from HTTP (no req/res) so it can be tested without
 *    spinning up Express (Testability / SRP).
 *  - Controllers delegate here; they never call the repository directly.
 */

"use strict";

const intelligenceRepository = require("../repositories/intelligence.repository");
const AppError = require("../exceptions/AppError");
const logger = require("../utils/logger");

class IntelligenceService {
  /**
   * Returns all intelligence records with optional filters and pagination.
   *
   * @param {Object} query - Express req.query parsed object.
   * @returns {Promise<{ records: Object[], total: number, page: number, limit: number }>}
   */
  async getAllRecords(query = {}) {
    const { sourceType, minConfidence, maxConfidence, page = 1, limit = 100 } = query;

    // Build dynamic filter object – only include fields that were actually provided
    const filters = {};
    if (sourceType) filters.sourceType = sourceType.toUpperCase();
    if (minConfidence !== undefined || maxConfidence !== undefined) {
      filters.confidenceScore = {};
      if (minConfidence !== undefined) filters.confidenceScore.$gte = parseFloat(minConfidence);
      if (maxConfidence !== undefined) filters.confidenceScore.$lte = parseFloat(maxConfidence);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [records, total] = await Promise.all([
      intelligenceRepository.findAll(filters, { limit: parseInt(limit, 10), skip }),
      intelligenceRepository.count(filters),
    ]);

    logger.debug(`Fetched ${records.length} records (total: ${total})`);

    return {
      records,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    };
  }

  /**
   * Returns a single intelligence record by id.
   * @param {string} id
   * @returns {Promise<Object>}
   * @throws {AppError} 404 if not found
   */
  async getRecordById(id) {
    const record = await intelligenceRepository.findById(id);
    if (!record) {
      throw AppError.notFound(`Intelligence record with id "${id}" not found`);
    }
    return record;
  }

  /**
   * Deletes a record by id.
   * @param {string} id
   * @returns {Promise<Object>} Deleted record
   * @throws {AppError} 404 if not found
   */
  async deleteRecord(id) {
    const deleted = await intelligenceRepository.deleteById(id);
    if (!deleted) {
      throw AppError.notFound(`Intelligence record with id "${id}" not found`);
    }
    logger.info(`Deleted intelligence record: ${id}`);
    return deleted;
  }

  /**
   * Geo-proximity search around a point.
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} [radiusMetres]
   * @returns {Promise<Object[]>}
   */
  async findNearby(latitude, longitude, radiusMetres = 50000) {
    return intelligenceRepository.findNear(latitude, longitude, radiusMetres);
  }
}

module.exports = new IntelligenceService();
