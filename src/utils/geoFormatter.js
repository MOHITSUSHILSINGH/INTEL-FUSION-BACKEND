/**
 * src/utils/geoFormatter.js
 *
 * WHY: Coordinate parsing is error-prone when ingesting heterogeneous sources
 * (CSV strings, JSON numbers, Excel floats).  Centralising the parsing and
 * validation here means every parser just calls these helpers instead of
 * reimplementing the same coercion and range checks (DRY).
 */

"use strict";

const AppError = require("../exceptions/AppError");

const LAT_RANGE = { min: -90, max: 90 };
const LON_RANGE = { min: -180, max: 180 };

/**
 * Parses and validates a latitude value.
 * @param {string|number} raw
 * @returns {number}
 * @throws {AppError} when value is out of range or not a number
 */
const parseLatitude = (raw) => {
  const val = parseFloat(raw);
  if (isNaN(val)) {
    throw AppError.badRequest(`Invalid latitude: "${raw}" is not a number`);
  }
  if (val < LAT_RANGE.min || val > LAT_RANGE.max) {
    throw AppError.badRequest(
      `Latitude ${val} is out of range [${LAT_RANGE.min}, ${LAT_RANGE.max}]`
    );
  }
  return parseFloat(val.toFixed(6)); // Trim to 6 decimal places (~0.1 m precision)
};

/**
 * Parses and validates a longitude value.
 * @param {string|number} raw
 * @returns {number}
 * @throws {AppError} when value is out of range or not a number
 */
const parseLongitude = (raw) => {
  const val = parseFloat(raw);
  if (isNaN(val)) {
    throw AppError.badRequest(`Invalid longitude: "${raw}" is not a number`);
  }
  if (val < LON_RANGE.min || val > LON_RANGE.max) {
    throw AppError.badRequest(
      `Longitude ${val} is out of range [${LON_RANGE.min}, ${LON_RANGE.max}]`
    );
  }
  return parseFloat(val.toFixed(6));
};

/**
 * Converts a pair of raw values into a validated { latitude, longitude } object.
 * @param {string|number} rawLat
 * @param {string|number} rawLon
 * @returns {{ latitude: number, longitude: number }}
 */
const parseCoordinates = (rawLat, rawLon) => ({
  latitude: parseLatitude(rawLat),
  longitude: parseLongitude(rawLon),
});

/**
 * Returns a GeoJSON Point for MongoDB 2dsphere index compatibility.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {{ type: string, coordinates: number[] }}
 */
const toGeoJSONPoint = (latitude, longitude) => ({
  type: "Point",
  coordinates: [longitude, latitude], // GeoJSON is [lon, lat]
});

module.exports = { parseLatitude, parseLongitude, parseCoordinates, toGeoJSONPoint };
