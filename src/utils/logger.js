/**
 * src/utils/logger.js
 *
 * WHY: Using Winston instead of console.log:
 *  - Structured JSON output in production enables log aggregation (Datadog, CloudWatch).
 *  - Log levels let us suppress debug noise in production without code changes.
 *  - The combined file transport retains a persistent audit trail on disk.
 */

"use strict";

const { createLogger, format, transports } = require("winston");
const env = require("../config/env");

const { combine, timestamp, printf, colorize, json, errors } = format;

// ── Human-readable format for development ────────────────────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }), // Attach stack traces to Error objects
  printf(({ level, message, timestamp, stack }) =>
    stack
      ? `[${timestamp}] ${level}: ${message}\n${stack}`
      : `[${timestamp}] ${level}: ${message}`
  )
);

// ── Structured JSON format for production ────────────────────────────────────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: env.isProduction ? "info" : "debug",
  format: env.isProduction ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    // Persist errors to file in all environments
    new transports.File({ filename: "logs/error.log", level: "error" }),
    ...(env.isProduction
      ? [new transports.File({ filename: "logs/combined.log" })]
      : []),
  ],
  // Prevent unhandled exceptions from crashing the process silently
  exceptionHandlers: [new transports.File({ filename: "logs/exceptions.log" })],
  rejectionHandlers: [new transports.File({ filename: "logs/rejections.log" })],
});

module.exports = logger;
