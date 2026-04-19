/**
 * src/interfaces/intelligence.interface.js
 *
 * WHY: JavaScript has no compile-time interfaces, but documenting them with
 * JSDoc @typedef provides:
 *  - IDE autocomplete / type checking via TS language server.
 *  - A living contract that every layer (service, repository, controller) can
 *    import and validate against without adding a full TypeScript build step.
 *  - A clear, human-readable spec that new team members can read to understand
 *    the domain model in seconds.
 */

"use strict";

/**
 * @typedef {Object} IntelligenceRecord
 * @property {string}  sourceType       - OSINT | HUMINT | IMINT
 * @property {number}  latitude         - WGS-84 latitude  (-90  to  90)
 * @property {number}  longitude        - WGS-84 longitude (-180 to 180)
 * @property {string}  title            - Short human-readable title
 * @property {string}  [description]    - Longer narrative description
 * @property {string}  [imageUrl]       - URL / S3 key of associated image
 * @property {Object}  [metadata]       - Arbitrary key-value pairs from the source
 * @property {number}  confidenceScore  - 0–100 numeric confidence rating
 * @property {Date}    createdAt        - Auto-set by Mongoose
 * @property {Date}    updatedAt        - Auto-set by Mongoose
 */

/**
 * @typedef {Object} NormalisedPayload
 * The shape that every parser factory must return before persistence.
 * Fields mirror IntelligenceRecord so they map 1-to-1 into the Mongoose model.
 *
 * @property {string}  sourceType
 * @property {number}  latitude
 * @property {number}  longitude
 * @property {string}  title
 * @property {string}  [description]
 * @property {string}  [imageUrl]
 * @property {Object}  [metadata]
 * @property {number}  [confidenceScore]
 */

// No runtime exports needed – this file exists purely for JSDoc contract definitions.
module.exports = {};
