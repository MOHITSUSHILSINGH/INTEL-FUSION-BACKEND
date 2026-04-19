/**
 * src/middlewares/validation.middleware.js
 *
 * WHY: A reusable higher-order middleware factory keeps validation logic
 * completely out of controllers (SRP) and avoids copy-pasting Joi `.validate()`
 * calls across every route handler (DRY).
 *
 * Usage in routes:
 *   router.post('/', validate(createIntelligenceSchema), controller.create);
 */

"use strict";

const AppError = require("../exceptions/AppError");

/**
 * Returns an Express middleware that validates `req[target]` against `schema`.
 *
 * @param {import('joi').Schema} schema  - Joi schema to validate against.
 * @param {'body'|'query'|'params'} [target='body'] - Which part of req to validate.
 * @returns {import('express').RequestHandler}
 */
const validate = (schema, target = "body") => {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,   // Collect ALL errors, not just the first
      stripUnknown: true,  // Remove undeclared keys silently (security)
      convert: true,       // Coerce types (e.g. string "50" → number 50)
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      }));
      return next(AppError.badRequest("Validation failed", details));
    }

    // Replace req[target] with the coerced/stripped value so downstream
    // handlers always receive clean, typed data.
    req[target] = value;
    next();
  };
};

module.exports = { validate };
