/**
 * src/middlewares/error.middleware.js
 *
 * WHY: A single global error handler is the backbone of clean error propagation:
 *  - Controllers and services just throw (or call next(err)) – they never format
 *    HTTP responses for errors themselves (SRP).
 *  - The handler distinguishes operational errors (AppError) from programmer
 *    errors (unexpected exceptions), ensuring we never leak stack traces to clients
 *    in production.
 *  - Mongoose and JWT error types are normalised here so the rest of the app
 *    never needs to know about them.
 */

"use strict";

const mongoose = require("mongoose");
const AppError = require("../exceptions/AppError");
const { sendError } = require("../utils/responseHandler");
const logger = require("../utils/logger");
const env = require("../config/env");

// ── Mongoose error normalisers ─────────────────────────────────────────────────

/** Turns a Mongoose CastError (bad ObjectId) into a 400 AppError */
const handleCastError = (err) =>
  AppError.badRequest(`Invalid value "${err.value}" for field "${err.path}"`);

/** Turns a Mongoose duplicate-key error into a 409 AppError */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || "field";
  return new AppError(`Duplicate value for "${field}"`, 409);
};

/** Turns Mongoose ValidationError into a 422 AppError with per-field details */
const handleValidationError = (err) => {
  const details = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return AppError.unprocessable("Mongoose validation failed", details);
};

// ── Main error handler middleware ─────────────────────────────────────────────

/**
 * Express 4-argument error middleware.
 * Must be the LAST middleware registered in app.js.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // ── Normalise known third-party error types into AppError ─────────────────
  let error = err;

  if (err instanceof mongoose.Error.CastError) error = handleCastError(err);
  else if (err.code === 11000) error = handleDuplicateKeyError(err);
  else if (err instanceof mongoose.Error.ValidationError) error = handleValidationError(err);
  else if (!(err instanceof AppError)) {
    // Unknown / programmer error – log full details, return generic 500
    logger.error("Unhandled error:", err);
    error = AppError.internal();
  }

  // ── Log operational errors at warn level, unexpected at error ─────────────
  if (error.isOperational) {
    logger.warn(`[${req.method} ${req.originalUrl}] ${error.statusCode}: ${error.message}`);
  } else {
    logger.error(`[${req.method} ${req.originalUrl}]`, error);
  }

  // ── Build response body ───────────────────────────────────────────────────
  const responseDetails = error.details || undefined;

  // In development, include the stack trace for faster debugging
  const devMeta = env.isDevelopment
    ? { stack: error.stack }
    : undefined;

  return sendError(
    res,
    error.statusCode,
    error.message,
    { ...(responseDetails && { details: responseDetails }), ...devMeta }
  );
};

/**
 * Catches requests to undefined routes and forwards a 404 AppError.
 * Register this BEFORE the errorHandler but AFTER all real routes.
 */
const notFoundHandler = (req, _res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

module.exports = { errorHandler, notFoundHandler };
