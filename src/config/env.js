/**
 * src/config/env.js
 *
 * WHY: Centralising env-var access in one place means:
 *  1. A single crash-early validation at boot instead of silent undefined surprises deep
 *     in the request lifecycle.
 *  2. Every module imports typed constants rather than raw process.env strings, which
 *     makes the dependency graph explicit and the code easier to test / mock.
 */

"use strict";

require("dotenv").config();

/**
 * Validates that a required env variable exists; throws if not.
 * @param {string} name  - variable name
 * @param {string} [def] - optional default value
 * @returns {string}
 */
const required = (name, def) => {
  const val = process.env[name] ?? def;
  if (val === undefined || val === "") {
    throw new Error(`[Config] Missing required environment variable: ${name}`);
  }
  return val;
};

const env = {
  NODE_ENV: required("NODE_ENV", "development"),
  PORT: parseInt(required("PORT", "5000"), 10),

  // MongoDB
  MONGO_URI: required("MONGO_URI", "mongodb://localhost:27017/intel_fusion_db"),

  // AWS S3 (optional – omitting disables S3 uploads gracefully)
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || null,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || null,
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || null,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Derived helpers
  get isProduction() {
    return this.NODE_ENV === "production";
  },
  get isDevelopment() {
    return this.NODE_ENV === "development";
  },
  get s3Enabled() {
    return !!(this.AWS_ACCESS_KEY_ID && this.AWS_SECRET_ACCESS_KEY && this.AWS_S3_BUCKET);
  },
};

module.exports = env;
