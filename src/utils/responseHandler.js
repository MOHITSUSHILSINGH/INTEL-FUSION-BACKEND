/**
 * src/utils/responseHandler.js
 *
 * WHY: Centralising response shaping enforces a consistent API contract across
 * every controller without duplicating the envelope structure (DRY).
 * Consumers (frontend, API clients) can rely on the same top-level keys
 * regardless of which endpoint they hit.
 */

"use strict";

/**
 * Sends a successful JSON response.
 *
 * @param {import('express').Response} res
 * @param {*}       data        - Payload to return.
 * @param {string}  [message]   - Optional human-readable message.
 * @param {number}  [status]    - HTTP status (default 200).
 */
const sendSuccess = (res, data, message = "Success", status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Sends a created (201) JSON response.
 *
 * @param {import('express').Response} res
 * @param {*}      data
 * @param {string} [message]
 */
const sendCreated = (res, data, message = "Resource created successfully") => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Sends an error JSON response.
 * Used exclusively by the global error middleware; controllers throw AppError.
 *
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} message
 * @param {*}      [details]
 */
const sendError = (res, status, message, details = null) => {
  const body = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (details) body.details = details;
  return res.status(status).json(body);
};

module.exports = { sendSuccess, sendCreated, sendError };
