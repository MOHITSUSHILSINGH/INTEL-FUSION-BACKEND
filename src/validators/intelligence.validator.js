/**
 * src/validators/intelligence.validator.js
 *
 * WHY: Using Joi schemas as the single source of validation rules means:
 *  - Rules are expressed declaratively, not scattered across service/controller.
 *  - Joi's error messages are descriptive enough to return directly to clients.
 *  - Changing a rule (e.g., extending confidence range) is a one-line change here.
 */

"use strict";

const Joi = require("joi");
const { SOURCE_TYPE_VALUES } = require("../constants/intelligenceTypes");

// ── Reusable field definitions ────────────────────────────────────────────────

const latitudeField = Joi.number()
  .min(-90)
  .max(90)
  .required()
  .messages({
    "number.min": "latitude must be ≥ -90",
    "number.max": "latitude must be ≤ 90",
    "any.required": "latitude is required",
  });

const longitudeField = Joi.number()
  .min(-180)
  .max(180)
  .required()
  .messages({
    "number.min": "longitude must be ≥ -180",
    "number.max": "longitude must be ≤ 180",
    "any.required": "longitude is required",
  });

const sourceTypeField = Joi.string()
  .valid(...SOURCE_TYPE_VALUES)
  .required()
  .messages({
    "any.only": `sourceType must be one of: ${SOURCE_TYPE_VALUES.join(", ")}`,
    "any.required": "sourceType is required",
  });

// ── Schema: validate a single intelligence record in a JSON body ──────────────
const createIntelligenceSchema = Joi.object({
  sourceType: sourceTypeField,
  latitude: latitudeField,
  longitude: longitudeField,
  title: Joi.string().trim().max(500).required(),
  description: Joi.string().trim().allow("").optional(),
  imageUrl: Joi.string().uri().allow(null, "").optional(),
  confidenceScore: Joi.number().min(0).max(100).default(50),
  metadata: Joi.object().unknown(true).optional(),
});

// ── Schema: validate image upload body fields ─────────────────────────────────
const imageUploadSchema = Joi.object({
  latitude: latitudeField,
  longitude: longitudeField,
  title: Joi.string().trim().max(500).optional(),
  description: Joi.string().trim().allow("").optional(),
  confidenceScore: Joi.number().min(0).max(100).default(50),
});

// ── Schema: validate query params for GET /all ────────────────────────────────
const getAllQuerySchema = Joi.object({
  sourceType: Joi.string()
    .valid(...SOURCE_TYPE_VALUES)
    .optional(),
  minConfidence: Joi.number().min(0).max(100).optional(),
  maxConfidence: Joi.number().min(0).max(100).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(500).default(100),
});

module.exports = {
  createIntelligenceSchema,
  imageUploadSchema,
  getAllQuerySchema,
};
