# VeoLMS — Backend

> Production-grade REST API for the VeoLMS Learning Management System.  
> Built with **Node.js · Express 5 · TypeScript · MongoDB · Redis · Razorpay · Bunny CDN**

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Packages & Why](#packages--why)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [API Overview](#api-overview)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js (ESM + CommonJS via ts-node) |
| Framework | Express 5 |
| Language | TypeScript 6 |
| Database | MongoDB (via Mongoose 9) |
| Cache / OTP store | Upstash Redis (serverless) |
| Auth | JWT (access + refresh tokens) in httpOnly cookies |
| Payments | Razorpay |
| File storage | Bunny Storage (avatars, thumbnails) |
| Video hosting | Bunny Stream (HLS videos) |
| Email | Brevo (Sendinblue) transactional API |
| Validation | Zod |
| Testing | Jest + Supertest |

---

## Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── config.ts          # Centralised env-var config with production guards
│   │   ├── db.ts              # MongoDB connection
│   │   ├── redis.ts           # Upstash Redis client
│   │   └── swagger.ts         # Swagger/OpenAPI spec setup
│   │
│   ├── controllers/           # HTTP layer — reads req, calls service, writes res
│   │   ├── admin.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── coupon.controller.ts
│   │   ├── course.controller.ts
│   │   ├── enrollment.controller.ts
│   │   ├── otp.controller.ts
│   │   └── payment.controller.ts
│   │
│   ├── middleware/            # Express middleware (applied in index.ts)
│   │   ├── auth.middleware.ts        # requireAuth + requireRole guards
│   │   ├── cors.middleware.ts        # Strict origin whitelist
│   │   ├── csrf.middleware.ts        # Double-submit cookie CSRF protection
│   │   ├── error.middleware.ts       # Global error handler
│   │   ├── optionalAuth.middleware.ts # Soft auth (guest or user)
│   │   ├── rateLimiter.middleware.ts  # Per-route IP rate limiters
│   │   ├── req.middleware.ts         # Request logger
│   │   ├── upload.middleware.ts      # Multer — image (5 MB) & video (500 MB)
│   │   └── validate.middleware.ts    # Zod schema validation wrapper
│   │
│   ├── models/                # Mongoose document schemas
│   │   ├── course.model.ts
│   │   ├── enrollment.model.ts
│   │   ├── instructor.model.ts
│   │   ├── lesson.model.ts
│   │   ├── payment.model.ts
│   │   ├── progress.model.ts
│   │   ├── section.model.ts
│   │   └── user.model.ts
│   │
│   ├── repositories/          # Database access layer (one per model)
│   │   ├── course.repository.ts
│   │   ├── coupon.repository.ts
│   │   ├── enrollment.repository.ts
│   │   ├── lesson.repository.ts
│   │   ├── payment.repository.ts
│   │   ├── progress.repository.ts
│   │   ├── section.repository.ts
│   │   └── user.repository.ts
│   │
│   ├── routes/                # Express routers — wires middleware + controller
│   │   ├── admin.route.ts
│   │   ├── auth.route.ts
│   │   ├── coupon.route.ts
│   │   ├── course.route.ts
│   │   ├── enrollment.route.ts
│   │   ├── payment.route.ts
│   │   └── webhook.route.ts   # Bunny Stream video-encoded webhook
│   │
│   ├── services/              # Business logic layer
│   │   ├── admin.service.ts
│   │   ├── auth.service.ts
│   │   ├── bunny.storage.service.ts   # Bunny Storage REST client
│   │   ├── bunny.stream.service.ts    # Bunny Stream REST client
│   │   ├── coupon.service.ts
│   │   ├── course.service.ts
│   │   ├── email.service.ts           # Brevo transactional emails
│   │   ├── enrollment.service.ts
│   │   ├── otp.service.ts
│   │   └── payment.service.ts
│   │
│   ├── types/                 # Shared TypeScript interfaces
│   │   └── auth.types.ts
│   │
│   ├── utils/                 # Pure utility functions
│   │   ├── email.ts           # Email template helpers
│   │   ├── error.ts           # AppError class
│   │   ├── jwt.ts             # generateTokens / verifyToken
│   │   ├── otp.ts             # generateOTP / hashOTP (HMAC-SHA256) / verifyOTPHash
│   │   ├── price.util.ts      # Price + discount + tax calculator
│   │   └── token.util.ts      # generateAccessToken helper
│   │
│   ├── validators/            # Zod schemas per domain
│   │   ├── auth.validator.ts
│   │   ├── course.validator.ts
│   │   ├── payment.validator.ts
│   │   └── progress.validator.ts
│   │
│   ├── __tests__/             # Jest integration tests
│   │
│   └── index.ts               # App entry — middleware stack + route mounting
│
├── .env                       # Local secrets (git-ignored)
├── .env.example               # Template — copy to .env and fill in values
├── nodemon.json               # Nodemon watch config
├── tsconfig.json
└── package.json
```

---

## Packages & Why

### Runtime Dependencies

| Package | Version | Why |
|---|---|---|
| **express** | ^5 | Web framework. v5 adds async error propagation — `next(error)` works automatically inside async route handlers without try/catch boilerplate. |
| **mongoose** | ^9 | MongoDB ODM. Provides schema validation, virtuals, middleware hooks, and typed document interfaces. |
| **@upstash/redis** | ^1 | Serverless Redis HTTP client for Upstash. Used for OTP storage (TTL-based), OTP attempt counters, and resend cooldowns. Zero persistent connections — safe for serverless. |
| **bcryptjs** | ^3 | Password hashing (cost 10). Also used to hash refresh tokens before DB storage, so a stolen DB dump cannot be replayed. |
| **jsonwebtoken** | ^9 | Signs and verifies JWT access tokens (15 min) and refresh tokens (7 days). |
| **cookie-parser** | ^1.4 | Parses `Cookie` headers so `req.cookies` works — needed for reading `accessToken`, `refreshToken`, and `csrfToken` cookies. |
| **cors** | ^2.8 | Handles CORS preflight and restricts API access to an explicit origin whitelist. |
| **helmet** | ^8 | Sets 11 HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) in a single `app.use()`. |
| **express-mongo-sanitize** | ^2.2 | Strips `$` and `.` from user input to prevent NoSQL injection attacks in MongoDB queries. |
| **express-rate-limit** | ^8.5 | IP-based rate limiting. Applied per-route: auth (10/15 min), OTP (5/5 min), general (100/10 min). |
| **multer** | ^2.2 | Multipart form-data parser for file uploads. Memory storage for images (→ Bunny Storage), disk storage for videos (→ Bunny Stream). |
| **zod** | ^4 | TypeScript-first schema validation. Every request body is validated before hitting the controller. |
| **razorpay** | ^2.9 | Official Razorpay Node.js SDK. Used to create payment orders. Signatures verified with `crypto.createHmac`. |
| **axios** | ^1.18 | HTTP client used to call Bunny Storage and Bunny Stream REST APIs. |
| **@getbrevo/brevo** | ^6 | Official Brevo (Sendinblue) SDK for sending transactional emails (OTP, welcome, enrollment confirmation). |
| **slugify** | ^1.6 | Converts course titles to clean URL slugs (`My Course` → `my-course`). |
| **dotenv** | ^17 | Loads `.env` file into `process.env` at startup. |
| **swagger-jsdoc** | ^6 | Generates OpenAPI spec from JSDoc comments in route files. |
| **swagger-ui-express** | ^5 | Serves the interactive API docs at `/api/docs`. |
| **winston** | ^3.19 | Structured logging. Used for production-grade log levels and transports. |

### Dev Dependencies

| Package | Why |
|---|---|
| **typescript** | Strict static typing across the entire codebase. |
| **ts-node** | Runs TypeScript directly in development (via nodemon). |
| **nodemon** | Watches source files and restarts the server on change. |
| **jest** | Testing framework for unit and integration tests. |
| **ts-jest** | Jest transformer that compiles TypeScript before running tests. |
| **supertest** | HTTP assertion library — makes real requests against the Express app without starting a network server. |
| **prettier** | Opinionated code formatter. Keeps the codebase consistently styled. |
| **@types/\*** | TypeScript declaration files for all libraries that don't ship their own. |

---

## Environment Variables

Copy `.env.example` → `.env` and fill in your values. All variables marked **Required** will throw a startup error in production if missing.

```bash
cp .env.example .env
```

### Server

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `4001` | No | TCP port the Express server listens on |
| `NODE_ENV` | `development` | No | `development` / `production` / `test` |
| `LOG_LEVEL` | `info` | No | Winston log level |

### Database

| Variable | Default | Required | Description |
|---|---|---|---|
| `MONGODB_URL` | — | **Yes** | Full MongoDB connection string (Atlas or self-hosted) |
| `UPSTASH_REDIS_REST_URL` | — | **Yes** | Upstash Redis REST endpoint URL |
| `UPSTASH_REDIS_REST_TOKEN` | — | **Yes** | Upstash Redis REST auth token |

### JWT

| Variable | Default | Required | Description |
|---|---|---|---|
| `JWT_ACCESS_SECRET` | dev fallback | **Yes (prod)** | Secret for signing access tokens (min 256-bit random) |
| `JWT_REFRESH_SECRET` | dev fallback | **Yes (prod)** | Secret for signing refresh tokens |
| `ACCESS_TOKEN_EXP` | `15m` | No | Access token lifetime (ms/zeit format) |
| `REFRESH_TOKEN_EXP` | `7d` | No | Refresh token lifetime |
| `ACCESS_TOKEN_EXP_SEC` | `900` | No | Access token lifetime in seconds (used for cache TTLs) |
| `REFRESH_TOKEN_EXP_SEC` | `604800` | No | Refresh token lifetime in seconds |

### OTP

| Variable | Default | Required | Description |
|---|---|---|---|
| `OTP_HMAC_SECRET` | dev fallback | **Yes (prod)** | HMAC-SHA256 key used to hash OTPs before Redis storage |
| `OTP_TTL` | `600` | No | OTP expiry in seconds (default 10 min) |
| `OTP_RESEND_COOLDOWN` | `180` | No | Seconds before resend is allowed (default 3 min) |
| `OTP_MAX_VERIFY_ATTEMPTS` | `5` | No | Max failed OTP attempts before invalidation |
| `OTP_RATE_MAX_PER_HOUR` | `5` | No | Max OTP sends per email per hour |

### Email (Brevo)

| Variable | Default | Required | Description |
|---|---|---|---|
| `BREVO_API_KEY` | — | **Yes** | Brevo API key from dashboard → API Keys |
| `FROM_EMAIL` | — | **Yes** | Verified sender email address |
| `FROM_NAME` | — | **Yes** | Display name shown to recipients |

### Payments (Razorpay)

| Variable | Default | Required | Description |
|---|---|---|---|
| `RAZORPAY_TEST_API_KEY` | — | **Yes** | Razorpay key ID (use test key for staging) |
| `RAZORPAY_TEST_API_SECRET` | — | **Yes** | Razorpay key secret — used for HMAC signature verification |

### Bunny Storage (Images)

| Variable | Default | Required | Description |
|---|---|---|---|
| `BUNNY_STORAGE_ZONE` | — | **Yes** | Storage zone name from Bunny dashboard |
| `BUNNY_STORAGE_API_KEY` | — | **Yes** | Storage zone API password |
| `BUNNY_STORAGE_HOST` | `storage.bunnycdn.com` | No | Regional storage hostname (e.g. `de.storage.bunnycdn.com`) |
| `BUNNY_CDN_URL` | — | **Yes** | Pull-zone CDN base URL (e.g. `https://myzone.b-cdn.net`) |

### Bunny Stream (Videos)

| Variable | Default | Required | Description |
|---|---|---|---|
| `BUNNY_STREAM_LIBRARY_ID` | — | **Yes** | Video library ID from Bunny Stream dashboard |
| `BUNNY_STREAM_API_KEY` | — | **Yes** | Video library API key |
| `BUNNY_STREAM_CDN_HOSTNAME` | — | **Yes** | Stream CDN hostname (e.g. `vz-xxxx.b-cdn.net`) |

### Cache

| Variable | Default | Required | Description |
|---|---|---|---|
| `REDIS_USER_TTL` | `86400` | No | User cache TTL in seconds (default 24 hours) |

---

## Scripts

```bash
npm run dev          # Start dev server with hot-reload (nodemon + ts-node)
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled production build
npm test             # Run Jest test suite
npm run test:watch   # Jest in watch mode
npm run test:coverage# Jest with coverage report
npm run format       # Prettier format all files
```

---

## API Overview

All routes are prefixed with `/api`. Interactive docs available at `/api/docs` (Swagger UI).

| Group | Prefix | Auth |
|---|---|---|
| Auth & OTP | `/api/auth` | Public + Cookie |
| Courses (public) | `/api/courses` | Public |
| Courses (admin) | `/api/admin/courses` | Admin only |
| Sections (admin) | `/api/admin/sections` | Admin only |
| Lessons (admin) | `/api/admin/lessons` | Admin only |
| Enrollments | `/api/enrollments` | Authenticated |
| Progress | `/api/watch-record` | Authenticated |
| Payments | `/api/payments` | Authenticated |
| Coupons | `/api/coupons` | Admin only |
| Admin dashboard | `/api/admin` | Admin only |
| Webhooks | `/api/webhooks` | Public (Bunny CDN) |
