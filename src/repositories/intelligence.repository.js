/**
 * src/repositories/intelligence.repository.js
 *
 * WHY – Repository Pattern:
 *  - Services are completely decoupled from Mongoose.  If we ever switch to
 *    PostgreSQL + PostGIS, only this file changes (OCP).
 *  - Mongoose-specific query builders, projections, and pagination live here
 *    and nowhere else (SRP).
 *  - Every method is async/await, making error propagation clean and uniform.
 */

"use strict";

const Intelligence = require("../models/intelligence.model");
const AppError = require("../exceptions/AppError");

class IntelligenceRepository {
  /**
   * Persists a single intelligence record.
   * @param {Object} payload - Normalised intelligence object.
   * @returns {Promise<import('../models/intelligence.model')>}
   */
  async create(payload) {
    const record = new Intelligence(payload);
    return record.save();
  }

  /**
   * Bulk-inserts an array of normalised records.
   * Uses ordered:false so one failure does not block the rest.
   * @param {Object[]} payloads
   * @returns {Promise<Object>} Mongoose insertMany result
   */
  async bulkCreate(payloads) {
    return Intelligence.insertMany(payloads, { ordered: false });
  }

  /**
   * Fetches all records with optional filtering and sorting.
   *
   * @param {Object} [filters]          - Mongoose query filter object.
   * @param {Object} [options]
   * @param {number} [options.limit]    - Max results (default 500).
   * @param {number} [options.skip]     - Pagination offset.
   * @param {Object} [options.sort]     - Mongoose sort object (default: newest first).
   * @returns {Promise<Array>}
   */
  async findAll(filters = {}, { limit = 500, skip = 0, sort = { createdAt: -1 } } = {}) {
    return Intelligence.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(); // Return plain JS objects for speed (no Mongoose overhead)
  }

  /**
   * Finds a single record by MongoDB ObjectId.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return Intelligence.findById(id).lean();
  }

  /**
   * Deletes a record by id.
   * @param {string} id
   * @returns {Promise<Object|null>} Deleted document or null.
   */
  async deleteById(id) {
    return Intelligence.findByIdAndDelete(id).lean();
  }

  /**
   * Counts documents matching an optional filter.
   * @param {Object} [filters]
   * @returns {Promise<number>}
   */
  async count(filters = {}) {
    return Intelligence.countDocuments(filters);
  }

  /**
   * Geo-spatial query: finds records within a given radius.
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} radiusMetres
   * @returns {Promise<Array>}
   */
  async findNear(latitude, longitude, radiusMetres = 50000) {
    return Intelligence.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: radiusMetres,
        },
      },
    }).lean();
  }
}

// Export a singleton instance so the service always shares one repository
module.exports = new IntelligenceRepository();
