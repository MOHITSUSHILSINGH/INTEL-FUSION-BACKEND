/**
 * src/app.js
 *
 * WHY: Separating app configuration (middleware + routes) from the HTTP server
 * entry point (server.js) is a Node.js best practice:
 *  - Enables supertest / Jest to import `app` and run integration tests without
 *    actually binding a port.
 *  - Keeps the start-up sequence in server.js clean (connect DB → listen).
 *  - All third-party security middleware is registered in one visible list here
 *    so the security posture of the API is immediately auditable.
 */

"use strict";

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const path = require("path");
const swaggerUi = require("swagger-ui-express");

const env = require("./config/env");
const logger = require("./utils/logger");
const swaggerSpec = require("./docs/swagger");
const intelligenceRoutes = require("./routes/intelligence.routes");
const uploadRoutes = require("./routes/upload.routes");
const { errorHandler, notFoundHandler } = require("./middlewares/error.middleware");

const app = express();

// ── 1. Security headers (must be first) ──────────────────────────────────────
app.use(helmet());

// ── 2. CORS ───────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ── 3. Rate limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP – please try again later.",
    timestamp: new Date().toISOString(),
  },
});
app.use("/api", limiter);

// ── 4. HTTP request logging ───────────────────────────────────────────────────
// Use 'combined' in production for full Apache log format; 'dev' for coloured output
app.use(morgan(env.isProduction ? "combined" : "dev", {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ── 5. Body parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── 6. NoSQL injection prevention ────────────────────────────────────────────
// Strips $ and . from user-supplied keys before they reach Mongoose
app.use(mongoSanitize());

// ── 7. Static files for local image serving ───────────────────────────────────
// When S3 is not configured, uploaded images are served from /uploads/images/
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ── 8. API Documentation ──────────────────────────────────────────────────────
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Intel Fusion API Docs",
    explorer: true,
  })
);

// Health check endpoint – used by load balancers and Kubernetes probes
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── 9. API Routes ─────────────────────────────────────────────────────────────
// Upload routes contain /upload/* sub-paths so they're mounted on the same prefix.
// Order matters: specific routes before parameterised ones.
app.use("/api/intelligence", uploadRoutes);
app.use("/api/intelligence", intelligenceRoutes);

// ── 10. Error handling (must be last) ─────────────────────────────────────────
app.use(notFoundHandler); // Catches all undefined routes → 404 AppError
app.use(errorHandler);    // Formats and sends all errors as JSON

module.exports = app;
