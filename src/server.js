/**
 * src/server.js
 *
 * WHY: This file is intentionally minimal – it is the process entry point,
 * responsible only for:
 *  1. Connecting to MongoDB.
 *  2. Binding the Express app to a port.
 *  3. Registering OS-level signal handlers for graceful shutdown.
 *
 * All application logic is in app.js so this file stays clean and tests can
 * import app.js without triggering a DB connection or port bind.
 */

"use strict";

const app = require("./app");
const connectDB = require("./config/db");
const env = require("./config/env");
const logger = require("./utils/logger");

// ── Graceful shutdown helper ──────────────────────────────────────────────────
let server;

const shutdown = async (signal) => {
  logger.info(`${signal} received – shutting down gracefully…`);
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10 s if the server hangs
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
};

// ── Boot sequence ─────────────────────────────────────────────────────────────
const boot = async () => {
  // Step 1: Connect to MongoDB (retries internally)
  await connectDB();

  // Step 2: Start listening
  server = app.listen(env.PORT, () => {
    logger.info(`🚀  Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    logger.info(`📖  API Docs → http://localhost:${env.PORT}/api/docs`);
    logger.info(`❤️   Health  → http://localhost:${env.PORT}/health`);
  });

  // Step 3: Handle OS termination signals
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Step 4: Catch any unhandled promise rejections that escape try/catch
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Promise Rejection:", reason);
    shutdown("unhandledRejection");
  });
};

boot().catch((err) => {
  logger.error("Fatal boot error:", err);
  process.exit(1);
});
