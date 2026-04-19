/**
 * src/factories/parser.factory.js
 *
 * WHY – Factory Pattern + Open/Closed Principle:
 *  - Controllers and services never reference concrete parsers directly; they
 *    ask the factory for the right one.
 *  - Adding a new file type (e.g., XML, GeoJSON) requires only registering a
 *    new parser here – zero changes to the service or controller layer (OCP).
 *  - The registry (Map) makes the mapping explicit and easy to inspect.
 */

"use strict";

const path = require("path");
const AppError = require("../exceptions/AppError");
const { parseCSV } = require("../utils/csvParser");
const { parseExcel } = require("../utils/excelParser");

// ── Parser registry ──────────────────────────────────────────────────────────
// Maps lowercase file extensions to their parser functions.
// Each parser must return { rows: NormalisedPayload[], errors: string[] }.

const PARSER_REGISTRY = new Map([
  [".csv", parseCSV],
  [".xlsx", parseExcel],
  [".xls", parseExcel],
]);

/**
 * JSON normaliser – wrapped in the same async interface as other parsers.
 * JSON arrays are already structured; we just normalise field names.
 * @param {string} filePath
 * @returns {Promise<{ rows: Object[], errors: string[] }>}
 */
const parseJSON = async (filePath) => {
  const fs = require("fs");
  const { parseCoordinates } = require("../utils/geoFormatter");

  if (!fs.existsSync(filePath)) {
    throw AppError.badRequest(`JSON file not found at: ${filePath}`);
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    throw AppError.unprocessable("JSON file is malformed or not valid JSON");
  }

  const items = Array.isArray(raw) ? raw : [raw];
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
        title: (item.title || "Untitled").toString().trim(),
        description: (item.description || "").toString().trim(),
        sourceType: (item.sourceType || item.source_type || "HUMINT").toUpperCase().trim(),
        confidenceScore: parseFloat(item.confidenceScore ?? item.confidence_score ?? 50),
        metadata: item.metadata || undefined,
      });
    } catch (err) {
      errors.push(`Item ${i}: ${err.message}`);
    }
  }

  if (rows.length === 0 && errors.length > 0) {
    throw AppError.unprocessable("All JSON items were malformed", errors);
  }

  return { rows, errors };
};

// Register JSON parsers
PARSER_REGISTRY.set(".json", parseJSON);

/**
 * Resolves and returns the correct parser function for a given file path.
 *
 * @param {string} filePath - Full or relative path including extension.
 * @returns {Function} Parser function with signature (filePath) => Promise<{ rows, errors }>
 * @throws {AppError} 415 if extension is not registered.
 */
const getParser = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const parser = PARSER_REGISTRY.get(ext);

  if (!parser) {
    throw AppError.unsupportedMediaType(
      `No parser registered for file type "${ext}". Supported: ${[...PARSER_REGISTRY.keys()].join(", ")}`
    );
  }

  return parser;
};

/**
 * Detects file type and immediately parses it.
 * Convenience wrapper so services can call a single function.
 *
 * @param {string} filePath
 * @returns {Promise<{ rows: Object[], errors: string[], ext: string }>}
 */
const parseFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const parser = getParser(filePath);
  const result = await parser(filePath);
  return { ...result, ext };
};

module.exports = { getParser, parseFile, PARSER_REGISTRY };
