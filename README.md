# Multi-Source Intelligence Fusion Dashboard — Backend

A production-ready **Node.js / Express.js / MongoDB** backend that ingests intelligence data from OSINT, HUMINT, and IMINT sources, normalises everything into a unified model, and exposes RESTful APIs for frontend map visualisation.

---

## Architecture Overview

```
HTTP Request
    │
    ▼
Middleware Layer        (Helmet, CORS, Rate Limiter, Morgan, Multer)
    │
    ▼
Validation Layer        (Joi schemas via validation.middleware.js)
    │
    ▼
Controller Layer        (intelligence.controller / upload.controller)
    │  ← no business logic, only req/res handling
    ▼
Service Layer           (intelligence.service / upload.service)
    │  ← all domain rules, normalisation, orchestration
    ▼
Factory Layer           (parser.factory → csvParser / excelParser / jsonParser)
    │
    ▼
Repository Layer        (intelligence.repository)
    │  ← only Mongoose calls live here
    ▼
MongoDB (Mongoose Model with 2dsphere index)
```

---

## Folder Structure

```
src/
├── config/             db.js, env.js
├── constants/          intelligenceTypes.js
├── controllers/        intelligence.controller.js, upload.controller.js
├── docs/               swagger.js
├── exceptions/         AppError.js
├── factories/          parser.factory.js
├── interfaces/         intelligence.interface.js   (JSDoc contracts)
├── middlewares/        error.middleware.js, upload.middleware.js, validation.middleware.js
├── models/             intelligence.model.js
├── repositories/       intelligence.repository.js
├── routes/             intelligence.routes.js, upload.routes.js
├── services/           intelligence.service.js, upload.service.js
├── utils/              csvParser.js, excelParser.js, geoFormatter.js, logger.js, responseHandler.js
├── validators/         intelligence.validator.js
├── app.js
└── server.js
uploads/
├── images/
├── csv/
├── excel/
└── json/
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your MongoDB URI and optional AWS credentials
```

### 3. Run (development)

```bash
npm run dev
```

### 4. Run (production)

```bash
NODE_ENV=production npm start
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/intelligence/upload/json` | Upload JSON file or raw JSON body |
| `POST` | `/api/intelligence/upload/csv` | Upload CSV file |
| `POST` | `/api/intelligence/upload/excel` | Upload Excel file (.xlsx/.xls) |
| `POST` | `/api/intelligence/upload/image` | Upload JPG/JPEG image (IMINT) |
| `GET`  | `/api/intelligence/all` | Get all records (paginated, filterable) |
| `GET`  | `/api/intelligence/nearby` | Geo-proximity search |
| `GET`  | `/api/intelligence/:id` | Get single record |
| `DELETE` | `/api/intelligence/:id` | Delete single record |
| `GET`  | `/health` | Health check |
| `GET`  | `/api/docs` | Swagger UI |

### Query parameters for `GET /all`

| Param | Type | Description |
|-------|------|-------------|
| `sourceType` | `OSINT\|HUMINT\|IMINT` | Filter by source |
| `minConfidence` | number 0–100 | Minimum confidence score |
| `maxConfidence` | number 0–100 | Maximum confidence score |
| `page` | integer | Page number (default 1) |
| `limit` | integer | Records per page (default 100, max 500) |

### Query parameters for `GET /nearby`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `latitude` | number | ✅ | WGS-84 latitude |
| `longitude` | number | ✅ | WGS-84 longitude |
| `radius` | number | ❌ | Search radius in metres (default 50000) |

---

## File Upload Formats

### CSV / Excel columns

| Column | Required | Notes |
|--------|----------|-------|
| `latitude` | ✅ | −90 to 90 |
| `longitude` | ✅ | −180 to 180 |
| `title` | ✅ | Max 500 chars |
| `description` | ❌ | Free text |
| `sourceType` | ❌ | Default: HUMINT |
| `confidenceScore` | ❌ | 0–100, default 50 |
| Any other columns | ❌ | Stored in `metadata` |

### JSON body / file

```json
[
  {
    "latitude": 25.774,
    "longitude": -80.19,
    "title": "Port surveillance alert",
    "description": "Vessel without AIS signal",
    "sourceType": "OSINT",
    "confidenceScore": 82,
    "metadata": { "reportedBy": "sensor-04" }
  }
]
```

### Image upload (multipart/form-data)

| Field | Type | Required |
|-------|------|----------|
| `image` | file (JPG/JPEG) | ✅ |
| `latitude` | number | ✅ |
| `longitude` | number | ✅ |
| `title` | string | ❌ |
| `description` | string | ❌ |
| `confidenceScore` | number | ❌ |

---

## Intelligence Model

```js
{
  sourceType: "OSINT" | "HUMINT" | "IMINT",
  latitude: Number,        // WGS-84
  longitude: Number,       // WGS-84
  location: GeoJSONPoint,  // Auto-populated, enables $near queries
  title: String,
  description: String,
  imageUrl: String | null,
  confidenceScore: Number, // 0–100
  metadata: Object,        // Flexible key-value store
  createdAt: Date,
  updatedAt: Date
}
```

---

## AWS S3 Integration

Set the following variables in `.env` to enable S3 uploads for images:

```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

When these are absent, images are stored locally under `uploads/images/` and served via Express static middleware.

---

## Design Principles Applied

| Principle | Where Applied |
|-----------|---------------|
| **SRP** | Each file has one reason to change |
| **OCP** | `parser.factory.js` registry: add new types without touching existing code |
| **DRY** | `responseHandler`, `geoFormatter`, `AppError` shared across all layers |
| **Repository Pattern** | `intelligence.repository.js` is the only Mongoose touch-point |
| **Service Layer** | Business rules in services, never in controllers |
| **Factory Pattern** | `parser.factory.js` selects parsers by file extension |
| **Clean Architecture** | HTTP → Controller → Service → Repository → DB (dependencies point inward) |
| **Fail Fast** | `env.js` validates all required config at boot; `AppError` has a descriptive factory API |

---

## Security Checklist

- [x] Helmet (security headers)
- [x] CORS with explicit origin whitelist
- [x] Rate limiting per IP
- [x] `express-mongo-sanitize` (NoSQL injection prevention)
- [x] Multer file type + size validation
- [x] Joi input validation on all user-facing inputs
- [x] No stack traces leaked to clients in production
- [x] Environment variables for all secrets
