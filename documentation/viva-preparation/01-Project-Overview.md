# 01 — Project Overview

> One-page summary you should be able to say in 60–90 seconds.

## Basic Details

| Field | Value |
|---|---|
| Project title | **RakshaSafe — AI-Powered Women Safety and Disaster Emergency Response System** |
| Student | Vivek Lorikprasad Sahani |
| Roll No. | 42 |
| Guide | Asst. Prof. Sourabh Suryawanshi |
| College | D.T.S.S. College of Commerce (Autonomous), Mumbai – 400097 |
| Academic Year | 2026–27 |
| Testing date on record | 02-Oct-2026 |

## What the project is (plain words)

RakshaSafe is a web-based emergency response platform. A person in danger (women safety
issue, accident, fire, flood, etc.) can raise an **incident** with one tap, attach their
GPS location, and the system will:

1. **Assess the risk** of that incident automatically (Low / Medium / High / Critical).
2. **Show nearby emergency facilities** (hospitals, police, fire stations) on a map.
3. **Notify** the user's emergency contacts (in-app now; SMS/Email are recorded as
   *not configured* rather than faking delivery).
4. Let an **admin** track, verify and assign the incident to a **rescue team**.
5. Let a **responder** (field team member) see only their team's assignments and move
   them through the rescue workflow.

## Three services, one system

| Layer | Technology | Port | Responsibility |
|---|---|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 + Leaflet | 5173 | UI, map, SOS flow, admin dashboard |
| Backend (API) | Node.js + Express + TypeScript + Mongoose (MongoDB) | 5000 | Auth, incidents, risk orchestration, notifications, admin |
| AI service | Python 3.12 + FastAPI | 8000 | Deterministic risk scoring engine (`raksha-risk-v1`) |

The backend calls the AI service for scoring, and always has a **local fallback** if the AI
service is down — the system never stops working just because AI is unavailable.

## The one-line "AI" story (be honest)

The risk engine is **rule-based / deterministic**, not a black-box ML model. It is named
`raksha-risk-v1`. It uses documented weights (incident priority, disaster flag, verified
reports, unverified reports, active nearby incidents) and returns a score 0–100 plus a
level. Google Gemini is an **optional explanation layer only** — it writes a human-friendly
sentence about the score, but it **never** changes the score and is never required. This is
a strength, not a weakness: results are reproducible and explainable.

## Main modules

- **Authentication & Roles** — register, login, JWT, safe user profile. Roles: `USER`,
  `ADMIN`, `RESPONDER`.
- **Incident Management** — create/read/update/cancel incidents with status workflow
  `REPORTED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED` (+ `CANCELLED`).
- **Location** — GPS capture (never fabricated; honest denied/timeout/unavailable states),
  reverse geocoding, address search.
- **Risk Assessment** — score + level + contributing factors, stored per incident.
- **Nearby Resources** — DB facilities + live OpenStreetMap (Overpass) discovery; OSM
  results are never stored.
- **Unsafe Area Reports** — crowd-sourced unsafe-location reports with verification.
- **Emergency Contacts** — per-user contacts, exactly one primary.
- **Notifications** — in-app events recorded truthfully; SMS/Email honestly report
  `NOT_CONFIGURED`.
- **Rescue Teams & Assignment** — team membership, assignment workflow.
- **Admin Panel** — live MongoDB aggregation dashboard, user/team/facility/report mgmt,
  audit log.
- **Responder Panel** — own-team assignments, incident detail, status updates.
- **Enrichment** — weather (Open-Meteo) and map context around a location.

## Database (15 Mongoose collections)

`users`, `locations`, `incidents`, `incidentupdates`, `riskassessments`,
`unsafeareareports`, `emergencycontacts`, `facilities`, `rescueteams`,
`rescueassignments`, `notifications`, `admindlogs`/`adminlogs`, `disastercategories`,
`reports`, `reportcounters`, `riskzones` (15 domains).

## Verified test evidence (from Chapter 6 — use these exact numbers)

- **Unit testing:** 36 suites, 127 checks, all passed.
- **Integration testing:** 67 cases passed.
- **API functional (live):** 101 cases across 27 modules, all passed.
- **Browser / E2E:** 16 journeys, 15 passed; T14 found layout defect **D1** (honest).
- Testing is done at **5 levels**.

> Important: these are the only test numbers you should quote. Do not invent extra numbers.

## Honest notes / known mismatches (say these confidently if asked)

1. `README.md` in the repo is **stale** — it still says "no business modules implemented
   yet", but the project is fully implemented. Do not read the README as the source of truth.
2. The original scope baseline mentioned `USER` and `ADMIN`; the implementation adds a third
   role `RESPONDER`. This is documented as a deliberate extension for field teams.
3. Frontend linting uses **oxlint** (not ESLint). Tests use the **Node.js built-in test
   runner** (`node:test`) with `tsx` — **not Jest**. Integration tests do use **Supertest**
   for HTTP-level assertions and **mongodb-memory-server** for an in-memory database.
4. SMS/Email delivery is **not configured** (no third-party provider keys). The system is
   honest about this instead of pretending messages were sent.

## Deployment

- Frontend is built for static hosting (Cloudflare Pages style) and can also be packaged
  as an Android app via **Capacitor** (`appId: com.rakshasafe.app`).
- The repo does **not** commit deployment secrets or provider keys; env vars are supplied
  at deploy time.

## Elevator pitch (say this)

> "RakshaSafe is a three-tier emergency response system. A woman or any citizen raises an
> SOS incident from the React app. The Express backend stores it in MongoDB and calls a
> FastAPI risk engine that scores the danger from 0 to 100. Admins see a live dashboard and
> assign rescue teams; responders update the field status. We use OpenStreetMap for nearby
> hospitals and police, Open-Meteo for weather, and JWT-based role security. The risk model
> is fully deterministic and explainable, with an optional Gemini layer that only explains
> the score — it never changes it."
