# 05 — Technical Deep Dive

> For technical examiners and follow-up questions. Everything here maps to real files.

## 1. High-level architecture

```
                     HTTP/JSON                    HTTP/JSON
  ┌──────────────┐  ────────────►  ┌──────────────┐  ─────────►  ┌──────────────┐
  │  Frontend    │                 │  Backend API │              │  AI Service  │
  │ React + Vite │  ◄────────────  │  Express/TS  │  ◄─────────  │ FastAPI/Py   │
  │   :5173      │                 │    :5000     │              │    :8000     │
  └──────┬───────┘                 └──────┬───────┘              └──────────────┘
         │                                │
         │                         ┌──────▼───────┐        External (server-side):
         │                         │   MongoDB    │        • Nominatim (geocode)
         │                         │   :27017     │        • Overpass  (nearby OSM)
         │                         └──────────────┘        • Open-Meteo (weather)
         │                                                 • Gemini (optional, explain-only)
         └── Leaflet map tiles (OSM) directly in browser
```

Key principle: **the backend owns all persistence and orchestration**. The AI service is
stateless and replaceable. External discovery data is ephemeral and never stored.

## 2. Repository layout

```
Raksha/
├─ frontend/            # React 19 + TS + Vite + Tailwind 4 + Leaflet
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ pages/         # SosPage, LoginPage, RegisterPage, DashboardPage, Admin*, Responder*
│  │  ├─ components/    # ui/*, map/SafetyMap, enrichment/LocationEnrichment, auth/*, dashboard/*
│  │  └─ lib/           # api.ts, AuthProvider.tsx, auth-context, geolocation.ts,
│  │                    # hash-route, incidents, resources, i18n, notifications, theme, useEnrichment
│  ├─ vite.config.ts    # dev proxy /api -> :5000, /ai -> :8000
│  └─ capacitor.config.ts  # appId com.rakshasafe.app
├─ backend/             # Node 22 + Express + TS + Mongoose
│  └─ src/
│     ├─ app.ts, server.ts
│     ├─ config/        # env.ts, db.ts
│     ├─ routes/        # index, auth, incidents, admin, responder, nearby, weather,
│     │                 # geocode, emergencyContacts, facilities, notifications, rescueTeams,
│     │                 # unsafeReports, nearbyResources
│     ├─ controllers/   # auth, incident, risk, admin*, responder, notification, ...
│     ├─ services/      # riskAssessment, geminiExplanation, notifications, geocoding,
│     │                 # nearbyResources, osmPlaces, weather, reports
│     ├─ models/        # 15 Mongoose schemas
│     ├─ middleware/    # auth.ts, requireDb.ts, rateLimit.ts, error.ts
│     ├─ validators/    # auth.ts, incident.ts, emergencyContact.ts, nearby.ts
│     ├─ utils/         # errors, jwt, password, geo, export, phone, search
│     ├─ scripts/       # seedAdmin, seedResponder, updateAdmin, purgeTestData, verify*
│     └─ tests/         # unit/*.test.ts, integration/*.test.ts
├─ ai-service/          # Python 3.12 + FastAPI
│  └─ app/
│     ├─ main.py        # FastAPI app, GET /health, POST /risk/assess
│     ├─ risk.py        # raksha-risk-v1 deterministic engine
│     └─ config.py
└─ documentation/       # baseline, test evidence, Black Book, this viva pack
```

## 3. API surface (backend, base `/api`)

| Method & Path | Auth | Purpose |
|---|---|---|
| GET `/health` | none | Service + DB state |
| POST `/auth/register` | none | Create user (role forced USER) |
| POST `/auth/login` | none | Issue JWT |
| POST `/auth/logout` | token | Client-side token clear |
| GET `/auth/me` | token | Current safe user |
| PATCH `/auth/profile` | token | Update own profile |
| GET/POST `/incidents` | token | List own / create (rate 10/min) |
| GET/PATCH/DELETE `/incidents/:id` | token | Detail / update / cancel |
| GET `/incidents/:id/updates` | token | Status history |
| POST/GET `/incidents/:id/risk` | token | Assess / fetch risk |
| GET `/incidents/:id/nearby-resources` | token | Nearby around incident |
| GET/POST `/emergency-contacts` | token | List / create |
| PATCH/DELETE `/emergency-contacts/:id` | token | Update / delete |
| GET/POST `/facilities` | token | Curated facilities |
| GET `/nearby-resources` | token | DB + optional external |
| GET `/nearby` | token | Live OSM/Overpass discovery |
| GET `/weather` | token | Open-Meteo current weather |
| GET `/geocode` | token | Address → coordinates |
| GET `/reverse` (geocode route) | token | Coordinates → address |
| GET/POST `/notifications` | token | User notifications |
| GET/POST `/rescue-teams` | admin | Manage teams |
| GET/PATCH `/responder/assignments` | responder | Own-team assignments |
| GET `/responder/incidents/:id` | responder | Scoped incident detail |
| GET `/responder/notifications` | responder | In-app only |
| GET/POST/PATCH/DELETE `/unsafe-reports` | token | Unsafe area reports (rate 10/min) |
| `/admin/*` | admin+db | Dashboard, users, teams, facilities, reports, assignments |

## 4. Authentication & authorization flow

1. **Register** — validate (name 2–100, valid email, valid phone, password 8–128) → hash
   with bcrypt (12 rounds) → save with role `USER` (forced) → return safe user.
2. **Login** — accept email or phone as identifier → find user → `bcrypt.compare` → sign JWT
   `{ sub: userId, role }` → return safe user + token.
3. **Protected request** — `Authorization: Bearer <jwt>` → `requireAuth` verifies signature
   and expiry → loads the user from DB (live state wins over token) → attaches `req.auth`.
4. **Role gate** — `requireAdmin` / `requireResponder` check `req.auth.role`.
5. **DB gate** — `requireDb` blocks DB routes with 503 if `mongoose.connection.readyState !== 1`.

Security properties: no plain-text passwords, no secrets in tokens, safe serializers strip
`passwordHash` and `__v`, unique indexes prevent duplicate accounts.

## 5. Risk engine — `raksha-risk-v1`

Deterministic additive model. Inputs: incident priority/type, counts of verified/unverified
reports, and active incidents within a 2 km radius (Haversine).

```
score = BASE[priority]                       # LOW 15, MEDIUM 35, HIGH 60, CRITICAL 80
if type == DISASTER:      score += 5
score += min(verified_reports   * 6, 30)
score += min(unverified_reports * 2, 10)
score += min(active_incidents   * 3, 15)
score = clamp(score, 0, 100)

level = score < 25 ? LOW
      : score < 50 ? MEDIUM
      : score < 75 ? HIGH
      :              CRITICAL
```

Stored per assessment: score, level, contributing factors, `modelVersion`, `assessedAt`.

**Backend fallback:** if `AI_SERVICE_URL` is unreachable within `AI_SERVICE_TIMEOUT_MS`, the
backend's own `riskAssessment` service computes the same logic locally. The AI service can
never become a single point of failure.

**Gemini layer:** `geminiExplanation.ts` optionally asks Gemini for a one-paragraph
explanation. It cannot change the score or write to the DB. On any failure it falls back to a
template explanation. `GEMINI_API_KEY` is optional.

## 6. Notification model (honest delivery)

On a successful event (`incident.created`, `incident.status.changed`, `incident.assigned`,
`incident.assignment.updated`):

- **1 × IN_APP** record → status `DELIVERED` (storing and serving *is* in-app delivery).
- **1 × SMS** per contact with `notifyViaSms` → status `NOT_CONFIGURED` (no provider).
- **1 × EMAIL** per contact with `notifyViaEmail` → status `NOT_CONFIGURED`.

`recordEventSafe` wraps this so a notification failure is logged but never corrupts the main
operation. Responders only ever receive the IN_APP channel (contact-channel records reference
the owner's private contacts).

## 7. Location honesty model

`geolocation.ts` never fabricates coordinates. It returns an explicit state:
`available | denied | timeout | unavailable | unsupported`. On failure the UI keeps the
latitude/longitude (if any) and shows "unavailable", or lets the user search an address.

## 8. Rate limiting

`rateLimit({ windowMs, max })` — in-memory fixed-window, keyed by `ip:route`. Used on incident
creation and unsafe reports (10/min). A `reap()` routine clears expired buckets once the map
exceeds 10,000 entries. Documented limitation: per-instance (use Redis for multi-instance).

## 9. Error handling

- Custom `HttpError` with factory helpers: `badRequest(400)`, `unauthorized(401)`,
  `forbidden(403)`, `notFoundError(404)`, `conflict(409)`, `serviceUnavailable(503)`.
- Global `errorHandler` maps: `HttpError` → its status; duplicate key (code 11000) → 409 with
  the conflicting field; Mongoose validation → 400 with field details; bad JSON → 400;
  payload too large → 413; unknown → 500 (generic message, full error logged server-side).
- If headers are already sent, it delegates to the default handler to avoid
  `ERR_HTTP_HEADERS_SENT`.

## 10. External integrations

| Integration | Used for | Auth | Stored? |
|---|---|---|---|
| Nominatim (OSM) | Forward + reverse geocoding | none | No |
| Overpass (OSM) | Nearby hospitals/police/fire | none | No |
| Open-Meteo | Weather | none | No |
| Google Gemini | Optional explanation | API key (optional) | No |

All external calls are server-side, time-bounded, and failure-isolated.

## 11. Environment variables (names only)

**Backend:** `NODE_ENV`, `PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `AI_SERVICE_URL`,
`AI_SERVICE_TIMEOUT_MS`, `GEMINI_API_KEY` (optional), `GEMINI_MODEL`, `GEMINI_TIMEOUT_MS`,
`CORS_ORIGIN`, `LOG_LEVEL`, `GOOGLE_PLACES_API_KEY` (optional), `NEARBY_EXTERNAL_ENABLED`,
`NEARBY_EXTERNAL_TIMEOUT_MS`, `NEARBY_RADIUS_KM`.
**AI service:** `SERVICE_NAME`, `VERSION`, `HOST`, `PORT`, `LOG_LEVEL`, `CORS_ORIGINS`.
**Frontend:** `VITE_API_BASE_URL`, `VITE_PROXY_TARGET`, `VITE_AI_PROXY_TARGET`.

> Never read out secret values. Refer to variables by name only.

## 12. Testing strategy

Five levels, with these recorded results:

- **Unit** — 36 suites, 127 checks, all passed.
- **Integration** — 67 cases passed.
- **API functional (live)** — 101 cases across 27 modules, all passed.
- **Browser / E2E** — 16 journeys, 15 passed; T14 found layout defect D1.
- **Manual** — exploratory and accessibility checks.

Run with the Node built-in test runner (`node:test`) via `tsx`. Integration tests use
**Supertest** for HTTP assertions and **mongodb-memory-server** for an in-memory database.
Linting uses `oxlint`. Jest is not used.

## 13. Data model (15 collections, summaries)

| Collection | Purpose | Notable fields |
|---|---|---|
| users | Accounts | name, email(unique), phone, passwordHash, role, isActive |
| locations | Captured coordinates | latitude, longitude, address, accuracy, capturedAt |
| incidents | Emergency reports | type, category, priority, status, userId, locationId |
| incidentupdates | Status history | statusFrom, statusTo, comment, updatedBy |
| riskassessments | Risk results | riskScore, riskLevel, factors, modelVersion, assessedAt |
| unsafeareareports | Community reports | category, severity, isVerified, coordinates |
| emergencycontacts | Per-user contacts | name, phone, email, notifyViaSms/Email, isPrimary |
| facilities | Curated resources | facilityType, isOperational, coordinates, phone |
| rescueteams | Field teams | name, members[], isActive |
| rescueassignments | Incident↔team | incidentId, teamId, status |
| notifications | Event records | incidentId, channel, status, attemptCount |
| adminlogs | Audit trail | adminId, action, targetType, targetId, ipAddress |
| disastercategories | Disaster taxonomy | code, name |
| reports | Generated reports | type, range, counts |
| riskzones / reportcounters | Aggregation helpers | zone data / sequence counters |

## 14. Deployment shape

- Frontend: static build (Cloudflare Pages-style) or Android via Capacitor.
- Backend: Node process bound to `0.0.0.0` on `PORT`.
- AI service: Uvicorn/FastAPI on `PORT`.
- Database: MongoDB connection via `MONGO_URI` with bounded exponential retry.
- Secrets: environment only; never committed.

## 15. Design decisions worth defending

- **Deterministic AI over ML** — explainability and reproducibility first.
- **Fallback everywhere** — AI down, DB down, external APIs down: the core SOS flow survives.
- **Honest states** — never fake a location or a delivered message.
- **Safe serializers** — sensitive fields stripped at the boundary.
- **Separation of services** — independent change and scaling.
- **Live aggregations for the dashboard** — no hard-coded metrics.
