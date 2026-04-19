/**
 * src/utils/csvParser.js
 *
 * WHY: Streaming parsing with csv-parser handles very large CSV uploads
 * without loading the entire file into memory (back-pressure / memory safety).
 * Wrapping it in a Promise lets callers use async/await uniformly.
 */

"use strict";

const fs = require("fs");
const csvParser = require("csv-parser");
const { parseCoordinates } = require("./geoFormatter");
const AppError = require("../exceptions/AppError");

/**
 * Parses a CSV file into an array of normalised raw row objects.
 *
 * Expected CSV columns (case-insensitive trim applied):
 *   latitude, longitude, title, description, sourceType, confidenceScore, [any extras → metadata]
 *
 * @param {string} filePath - Absolute path to the uploaded CSV file.
 * @returns {Promise<Object[]>} Resolved with an array of row objects.
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(AppError.badRequest(`CSV file not found at path: ${filePath}`));
    }

    const rows = [];
    const errors = [];

    fs.createReadStream(filePath)
      .pipe(csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
      .on("data", (rawRow) => {
        try {
          const { latitude, longitude, title, description, sourcetype, confidencescore, ...rest } =
            rawRow;

          // Validate and normalise coordinates per row; skip malformed rows
          const coords = parseCoordinates(latitude, longitude);

          rows.push({
            ...coords,
            title: (title || "").trim(),
            description: (description || "").trim(),
            sourceType: (sourcetype || "HUMINT").toUpperCase().trim(),
            confidenceScore: parseFloat(confidencescore) || 50,
            metadata: Object.keys(rest).length > 0 ? rest : undefined,
          });
        } catch (err) {
          // Collect row-level errors and continue parsing – reject malformed rows
          errors.push(err.message);
        }
      })
      .on("end", () => {
        if (rows.length === 0 && errors.length > 0) {
          return reject(
            AppError.unprocessable("All CSV rows were malformed", errors)
          );
        }
        resolve({ rows, errors });
      })
      .on("error", (err) => {
        reject(AppError.internal(`CSV stream error: ${err.message}`));
      });
  });
};

module.exports = { parseCSV };
