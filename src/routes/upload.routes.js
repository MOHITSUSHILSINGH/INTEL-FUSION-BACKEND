/**
 * src/routes/upload.routes.js
 *
 * WHY: Upload routes get their own file because they have a distinctly different
 * middleware chain (Multer → [optional Joi] → controller) compared to query
 * routes (Joi → controller). Mixing them in one file would obscure which
 * middleware applies to which route (Readability + SRP).
 */

"use strict";

const { Router } = require("express");
const uploadController = require("../controllers/upload.controller");
const {
  uploadJSON,
  uploadCSV,
  uploadExcel,
  uploadImage,
} = require("../middlewares/upload.middleware");
const { validate } = require("../middlewares/validation.middleware");
const { imageUploadSchema } = require("../validators/intelligence.validator");

const router = Router();

/**
 * @swagger
 * /intelligence/upload/json:
 *   post:
 *     summary: Upload JSON intelligence data (file or raw body)
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       201:
 *         description: Records ingested
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UploadResult' }
 *       400:
 *         description: Bad request / malformed file
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post(
  "/upload/json",
  uploadJSON,
  uploadController.uploadJSON.bind(uploadController)
);

/**
 * @swagger
 * /intelligence/upload/csv:
 *   post:
 *     summary: Upload CSV intelligence data
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with columns latitude,longitude,title,description,sourceType,confidenceScore
 *     responses:
 *       201:
 *         description: Records ingested
 *       400:
 *         description: Bad request
 *       415:
 *         description: Unsupported file type
 */
router.post(
  "/upload/csv",
  uploadCSV,
  uploadController.uploadCSV.bind(uploadController)
);

/**
 * @swagger
 * /intelligence/upload/excel:
 *   post:
 *     summary: Upload Excel intelligence data (.xlsx / .xls)
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Records ingested
 *       415:
 *         description: Unsupported file type
 */
router.post(
  "/upload/excel",
  uploadExcel,
  uploadController.uploadExcel.bind(uploadController)
);

/**
 * @swagger
 * /intelligence/upload/image:
 *   post:
 *     summary: Upload a JPG/JPEG image and create an IMINT record
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image, latitude, longitude]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               confidenceScore:
 *                 type: number
 *     responses:
 *       201:
 *         description: IMINT record created
 *       400:
 *         description: Missing required fields
 *       415:
 *         description: Not a JPG/JPEG
 */
router.post(
  "/upload/image",
  uploadImage,
  validate(imageUploadSchema, "body"),
  uploadController.uploadImage.bind(uploadController)
);

module.exports = router;
