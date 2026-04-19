/**
 * src/constants/intelligenceTypes.js
 *
 * WHY: Using a constants file instead of raw strings throughout the codebase:
 *  - Eliminates typo-driven bugs (DRY + fail-fast).
 *  - Provides a single authoritative list of valid sourceTypes.
 *  - Used by both the Mongoose schema enum and the Joi validators so they
 *    never drift out of sync.
 */

"use strict";

const SOURCE_TYPES = Object.freeze({
  OSINT: "OSINT", // Open-Source Intelligence (MongoDB / AWS S3)
  HUMINT: "HUMINT", // Human Intelligence (CSV / Excel / JSON uploads)
  IMINT: "IMINT", // Imagery Intelligence (JPG / JPEG uploads)
});

/** Convenience array for Mongoose enum and Joi.valid() */
const SOURCE_TYPE_VALUES = Object.values(SOURCE_TYPES);

const CONFIDENCE_LEVELS = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CONFIRMED: "CONFIRMED",
});

const CONFIDENCE_LEVEL_VALUES = Object.values(CONFIDENCE_LEVELS);

module.exports = {
  SOURCE_TYPES,
  SOURCE_TYPE_VALUES,
  CONFIDENCE_LEVELS,
  CONFIDENCE_LEVEL_VALUES,
};
