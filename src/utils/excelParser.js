/**
 * src/utils/excelParser.js
 *
 * WHY: SheetJS (xlsx) is the industry standard for reading .xlsx files in Node.
 * Separating Excel parsing into its own utility keeps the parser factory clean
 * (SRP) and makes this logic unit-testable in isolation.
 */

"use strict";

const XLSX = require("xlsx");
const fs = require("fs");
const { parseCoordinates } = require("./geoFormatter");
const AppError = require("../exceptions/AppError");

/**
 * Reads the first sheet of an Excel file and returns normalised row objects.
 *
 * Expected column headers (case-insensitive):
 *   Latitude, Longitude, Title, Description, SourceType, ConfidenceScore
 *
 * @param {string} filePath - Absolute path to the .xlsx file.
 * @returns {{ rows: Object[], errors: string[] }}
 */
const parseExcel = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw AppError.badRequest(`Excel file not found at path: ${filePath}`);
  }

  let workbook;
  try {
    workbook = XLSX.readFile(filePath, { cellDates: true });
  } catch (err) {
    throw AppError.unprocessable(`Failed to read Excel file: ${err.message}`);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw AppError.badRequest("Excel file contains no sheets");
  }

  // Convert sheet to JSON with header row normalised to lowercase
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: "",           // Return empty string instead of undefined for missing cells
    raw: false,           // Convert numbers/dates to strings for uniform handling
  });

  const rows = [];
  const errors = [];

  for (const [index, rawRow] of rawRows.entries()) {
    try {
      // Normalise keys to lowercase for header-agnostic access
      const row = Object.fromEntries(
        Object.entries(rawRow).map(([k, v]) => [k.trim().toLowerCase(), v])
      );

      const { latitude, longitude, title, description, sourcetype, confidencescore, ...rest } = row;
      const coords = parseCoordinates(latitude, longitude);

      rows.push({
        ...coords,
        title: (title || "").toString().trim(),
        description: (description || "").toString().trim(),
        sourceType: (sourcetype || "HUMINT").toString().toUpperCase().trim(),
        confidenceScore: parseFloat(confidencescore) || 50,
        metadata: Object.keys(rest).length > 0 ? rest : undefined,
      });
    } catch (err) {
      errors.push(`Row ${index + 2}: ${err.message}`); // +2 because row 1 is header
    }
  }

  if (rows.length === 0 && errors.length > 0) {
    throw AppError.unprocessable("All Excel rows were malformed", errors);
  }

  return { rows, errors };
};

module.exports = { parseExcel };
