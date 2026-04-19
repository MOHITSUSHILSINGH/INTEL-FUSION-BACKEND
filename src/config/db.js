/**
 * src/config/db.js
 *
 * WHY: Isolating the DB connection in its own module means:
 *  - The rest of the codebase never touches `mongoose.connect` directly (SRP).
 *  - Retry logic, event hooks, and index creation live in one maintainable place.
 *  - Tests can mock this module without touching every repository.
 */

"use strict";

const mongoose = require("mongoose");
const env = require("./env");
const logger = require("../utils/logger");

/** Mongoose 7+ drops the deprecated options – only keep what's still valid. */
const MONGOOSE_OPTS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

/**
 * Connects to MongoDB with exponential back-off retry.
 * @param {number} retries  - remaining attempts
 * @param {number} delay    - ms to wait before next attempt
 */
const connectDB = async (retries = 5, delay = 2000) => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, MONGOOSE_OPTS);
    logger.info(`MongoDB connected: ${conn.connection.host}`);

    // ── Connection lifecycle hooks ─────────────────────────────────────────
    mongoose.connection.on("disconnected", () =>
      logger.warn("MongoDB disconnected – attempting reconnect…")
    );
    mongoose.connection.on("reconnected", () =>
      logger.info("MongoDB reconnected")
    );
  } catch (err) {
    if (retries === 0) {
      logger.error("MongoDB connection failed after all retries:", err.message);
      process.exit(1);
    }
    logger.warn(`MongoDB connection failed – retrying in ${delay}ms (${retries} left)…`);
    await new Promise((res) => setTimeout(res, delay));
    return connectDB(retries - 1, delay * 2);
  }
};

module.exports = connectDB;
