/**
 * src/routes/intelligence.routes.js
 *
 * WHY: Keeping route definitions separate from the controller means we can
 * see at a glance what middleware chain each endpoint has without reading
 * controller or service code (Separation of Concerns).
 *
 * Route middleware order per endpoint:
 *   validate → controller → errorHandler (registered globally)
 */

"use strict";

const { Router } = require("express");
const intelligenceController = require("../controllers/intelligence.controller");
const { validate } = require("../middlewares/validation.middleware");
const { getAllQuerySchema } = require("../validators/intelligence.validator");

const router = Router();

/**
 * @swagger
 * /intelligence/all:
 *   get:
 *     summary: Fetch all intelligence markers
 *     tags: [Intelligence]
 *     parameters:
 *       - in: query
 *         name: sourceType
 *         schema:
 *           type: string
 *           enum: [OSINT, HUMINT, IMINT]
 *       - in: query
 *         name: minConfidence
 *         schema: { type: number }
 *       - in: query
 *         name: maxConfidence
 *         schema: { type: number }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100 }
 *     responses:
 *       200:
 *         description: Paginated list of intelligence records
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 */
router.get(
  "/all",
  validate(getAllQuerySchema, "query"),
  intelligenceController.getAll.bind(intelligenceController)
);

/**
 * @swagger
 * /intelligence/nearby:
 *   get:
 *     summary: Geo-proximity search around a coordinate
 *     tags: [Intelligence]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: radius
 *         description: Search radius in metres (default 50000)
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Records within the specified radius
 */
router.get(
  "/nearby",
  intelligenceController.getNearby.bind(intelligenceController)
);

/**
 * @swagger
 * /intelligence/{id}:
 *   get:
 *     summary: Fetch a single intelligence marker by ID
 *     tags: [Intelligence]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Intelligence record
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  intelligenceController.getById.bind(intelligenceController)
);

/**
 * @swagger
 * /intelligence/{id}:
 *   delete:
 *     summary: Delete an intelligence marker by ID
 *     tags: [Intelligence]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted record
 *       404:
 *         description: Not found
 */
router.delete(
  "/:id",
  intelligenceController.deleteById.bind(intelligenceController)
);

module.exports = router;
