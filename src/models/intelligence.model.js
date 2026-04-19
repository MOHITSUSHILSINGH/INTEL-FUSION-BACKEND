/**
 * src/models/intelligence.model.js
 *
 * WHY: Defining the schema in its own module (not inside the repository or service)
 * keeps the persistence layer thin and ensures the model is the single source of
 * truth for structure, validation, and indexing (SRP).
 *
 * Index strategy:
 *  - 2dsphere on `location` for proximity / bounding-box geo queries.
 *  - Compound index on (sourceType, createdAt) for time-range filtered dashboards.
 *  - Index on confidenceScore for filtered intelligence feeds.
 */

"use strict";

const mongoose = require("mongoose");
const { SOURCE_TYPE_VALUES } = require("../constants/intelligenceTypes");

const IntelligenceSchema = new mongoose.Schema(
  {
    // ── Core identity ─────────────────────────────────────────────────────────
    sourceType: {
      type: String,
      enum: SOURCE_TYPE_VALUES,
      required: [true, "sourceType is required"],
      index: true,
    },

    // ── Human-readable content ────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
      maxlength: [500, "title must be ≤ 500 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Geospatial (stored both as flat fields for API convenience and as
    //    a GeoJSON Point for MongoDB geo queries) ────────────────────────────
    latitude: {
      type: Number,
      required: [true, "latitude is required"],
      min: [-90, "latitude must be ≥ -90"],
      max: [90, "latitude must be ≤ 90"],
    },
    longitude: {
      type: Number,
      required: [true, "longitude is required"],
      min: [-180, "longitude must be ≥ -180"],
      max: [180, "longitude must be ≤ 180"],
    },
    /**
     * GeoJSON Point – enables $near, $geoWithin, $geoIntersects operators.
     * Auto-populated from latitude/longitude via pre-save hook below.
     */
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude] – GeoJSON ordering
        default: [0, 0],
      },
    },

    // ── Media ─────────────────────────────────────────────────────────────────
    imageUrl: {
      type: String,
      default: null,
    },

    // ── Provenance & confidence ───────────────────────────────────────────────
    confidenceScore: {
      type: Number,
      min: [0, "confidenceScore must be ≥ 0"],
      max: [100, "confidenceScore must be ≤ 100"],
      default: 50,
      index: true,
    },

    // ── Flexible key-value bag for source-specific attributes ─────────────────
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,           // Adds createdAt and updatedAt automatically
    versionKey: false,          // Remove __v field
    toJSON: { virtuals: true }, // Include virtual `id` in JSON output
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
IntelligenceSchema.index({ location: "2dsphere" });
IntelligenceSchema.index({ sourceType: 1, createdAt: -1 });
IntelligenceSchema.index({ confidenceScore: -1 });

// ── Pre-save hook: sync GeoJSON point from flat lat/lon fields ────────────────
IntelligenceSchema.pre("save", function (next) {
  if (this.isModified("latitude") || this.isModified("longitude")) {
    this.location = {
      type: "Point",
      coordinates: [this.longitude, this.latitude], // GeoJSON: [lon, lat]
    };
  }
  next();
});

// ── Virtual: expose Mongoose _id as `id` string ───────────────────────────────
IntelligenceSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const Intelligence = mongoose.model("Intelligence", IntelligenceSchema);

module.exports = Intelligence;
