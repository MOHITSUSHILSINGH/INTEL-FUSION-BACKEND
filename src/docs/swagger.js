/**
 * src/docs/swagger.js
 *
 * WHY: Swagger UI serves live, interactive API documentation from the same
 * codebase that powers the server, so docs never drift from implementation.
 * Using swagger-jsdoc with inline JSDoc comments keeps the spec co-located
 * with the route definitions (locality of reference).
 */

"use strict";

const swaggerJsdoc = require("swagger-jsdoc");
const env = require("../config/env");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Multi-Source Intelligence Fusion Dashboard API",
      version: "1.0.0",
      description:
        "Ingests OSINT, HUMINT, and IMINT from multiple file formats and exposes geo-tagged " +
        "intelligence markers for map-based frontends.",
      contact: { name: "API Support", email: "support@intel-fusion.io" },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api`,
        description: "Local development server",
      },
    ],
    components: {
      schemas: {
        IntelligenceRecord: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64f3b2c1e4b0a12345678901" },
            sourceType: {
              type: "string",
              enum: ["OSINT", "HUMINT", "IMINT"],
              example: "HUMINT",
            },
            title: { type: "string", example: "Suspicious activity near port" },
            description: { type: "string", example: "Observed 3 vessels without AIS signal" },
            latitude: { type: "number", example: 25.774 },
            longitude: { type: "number", example: -80.19 },
            imageUrl: { type: "string", nullable: true, example: "https://s3.amazonaws.com/..." },
            confidenceScore: { type: "number", example: 75 },
            metadata: { type: "object" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        UploadResult: {
          type: "object",
          properties: {
            total: { type: "integer", example: 100 },
            inserted: { type: "integer", example: 97 },
            skippedErrors: {
              type: "array",
              items: { type: "string" },
              example: ["Row 4: latitude NaN is not a number"],
            },
          },
        },
        ApiSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: { type: "object" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        ApiError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            details: { type: "object", nullable: true },
            timestamp: { type: "string", format: "date-time" },
          },
        },
      },
    },
    tags: [
      { name: "Intelligence", description: "Query and manage intelligence records" },
      { name: "Upload", description: "Ingest intelligence from various file formats" },
    ],
  },
  // Scan all route files for @swagger JSDoc comments
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
