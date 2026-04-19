/**
 * src/exceptions/AppError.js
 *
 * WHY: Extending the native Error class with `statusCode` and `isOperational`
 * lets the global error middleware distinguish between:
 *  - Operational errors (bad input, not-found, auth failure) → safe to surface
 *    to the client with a meaningful message.
 *  - Programmer errors (null pointer, unhandled rejection) → log & return 500
 *    without leaking internal stack traces to the client.
 */

"use strict";

class AppError extends Error {
  /**
   * @param {string}  message     - Human-readable error description.
   * @param {number}  statusCode  - HTTP status code (4xx client, 5xx server).
   * @param {Object}  [details]   - Optional structured details (validation errors, etc.).
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.isOperational = true; // Signals this is a known, handled error path
    this.details = details;

    // Captures the real stack trace excluding this constructor frame
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Convenience factory methods ─────────────────────────────────────────────

  /** 400 – Malformed request body / invalid params */
  static badRequest(message, details) {
    return new AppError(message, 400, details);
  }

  /** 404 – Resource does not exist */
  static notFound(message = "Resource not found") {
    return new AppError(message, 404);
  }

  /** 422 – Request is well-formed but semantically invalid */
  static unprocessable(message, details) {
    return new AppError(message, 422, details);
  }

  /** 500 – Unexpected internal error */
  static internal(message = "Internal server error") {
    return new AppError(message, 500);
  }

  /** 413 – Uploaded file too large */
  static fileTooLarge(message = "File size exceeds limit") {
    return new AppError(message, 413);
  }

  /** 415 – Unsupported media / file type */
  static unsupportedMediaType(message = "Unsupported file type") {
    return new AppError(message, 415);
  }
}

module.exports = AppError;
