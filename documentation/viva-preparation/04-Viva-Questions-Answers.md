# 04 — Viva Questions & Answers (100+)

> Grouped A–J. Answers are short and exam-ready. Where a number is quoted, it is a real
> project number. Never invent statistics beyond these.

---

## A. Project & Domain

**A1. What is your project?**
RakshaSafe — an AI-powered women safety and disaster emergency response system. Citizens
raise incidents with location; the system scores risk, shows nearby resources, notifies
contacts, and lets admins/responders manage the response.

**A2. Who is the intended user?**
Three users: a citizen (USER) who reports emergencies, an administrator (ADMIN) who manages
the system, and a field responder (RESPONDER) who handles assignments.

**A3. What problem does it solve?**
It removes delay in emergencies by capturing incident + location + risk in one action and
connecting the citizen to responders and nearby help.

**A4. What types of incidents are supported?**
Two broad types: SAFETY and DISASTER. Categories include Women Safety, Medical Emergency,
Accident, Fire, Flood, Earthquake, and Other Emergency.

**A5. What is an "incident"?**
A single emergency report created by a user, containing type, category, description,
priority, status, and an optional location.

**A6. What are the four risk levels?**
LOW, MEDIUM, HIGH, CRITICAL.

**A7. What is the incident lifecycle?**
`REPORTED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`, plus `CANCELLED`.

**A8. Is this a real deployed product?**
It is a working academic project with real integrations (live maps, weather, geocoding). It is
production-shaped but not commercially deployed.

**A9. What is your individual contribution?**
Full-stack implementation of the three services, the risk engine, the security layer, and the
test suite, under the guidance of Asst. Prof. Sourabh Suryawanshi.

**A10. Why women safety *and* disaster response together?**
Both share the same core need — fast, location-aware emergency reporting and coordinated
response. One engine serves both, which is more efficient and more useful.

---

## B. Architecture & Design

**B1. Describe your architecture.**
Three tiers: React frontend (5173) → Express REST API (5000) → FastAPI AI service (8000), with
MongoDB as the data store. The backend orchestrates everything and owns persistence.

**B2. Why three services?**
Separation of concerns, independent scaling, and fault isolation. If the AI service fails, the
backend still serves using a local fallback.

**B3. What design pattern does the backend use?**
Layered MVC-style: routes → controllers → services → models, with shared middleware.

**B4. How does the frontend talk to the backend?**
Through a small typed `api()` helper. Base URL is `VITE_API_BASE_URL` or `/api`, and Vite
proxies `/api` to port 5000 in development.

**B5. How does routing work in the frontend?**
Hash-based routing (`#/dashboard`, `#/sos`, `#/incident/:id`). No React Router dependency;
a small custom hash-route module handles navigation.

**B6. What does the backend do if MongoDB is down?**
It still starts. The `requireDb` middleware rejects DB-dependent routes with a clean 503,
while enrichment routes (weather, nearby, geocode) keep working.

**B7. What is the role of `server.ts` vs `app.ts`?**
`app.ts` builds the Express app (middleware, routes, error handling). `server.ts` binds it to
the network (host `0.0.0.0`, port from env) and connects the database.

**B8. How is CORS configured?**
Allowed origins come from `CORS_ORIGIN` (default includes localhost 5173 and 4173).

**B9. What is the request lifecycle for a new incident?**
Rate-limit check → auth check → validate body → save incident → save location → call AI
service for risk → store risk → record notifications → return response.

**B10. How do you keep controllers small?**
Business logic lives in services (risk, notifications, geocoding, weather, nearby resources);
controllers only handle HTTP in/out.

**B11. What is an enrichment module?**
UI features that add context around an incident/location: map, nearby facilities, weather,
address. They extend the incident without changing its core data.

**B12. Why not put the map inside MongoDB?**
Map discovery comes from live OpenStreetMap and is ephemeral. Storing it would go stale and
add no value. Only curated facilities are stored.

**B13. What is the difference between a Facility and an OSM result?**
Facilities are curated DB records (managed by admin). OSM results are live discovery results
that are never stored.

**B14. How is configuration handled?**
Central `env.ts` module per service, validated at startup. Secrets come from environment only,
never committed.

**B15. What is the benefit of a monorepo?**
One repository holds frontend, backend, AI service, and documentation, so versioning and
testing stay consistent.

---

## C. Frontend

**C1. Why React 19?**
Component reuse, declarative UI, and fast re-render for a responsive SOS flow. React 19 is the
current stable version in our stack.

**C2. Why TypeScript?**
Compile-time type safety, better autocompletion, and fewer runtime bugs in a safety-critical
app.

**C3. Why Tailwind CSS 4?**
Utility-first styling keeps the UI consistent and fast to build without maintaining separate
CSS files.

**C4. What is the SOS flow?**
Four steps: details → location → review → done. It minimizes typing and clicks during an
emergency.

**C5. How does the app get location?**
`requestDeviceLocation()` uses the browser Geolocation API. It returns honest states:
available, denied, timeout, unavailable, unsupported.

**C6. What if the user denies location permission?**
The app shows the denied state and lets the user manually search an address via geocoding. It
never invents coordinates.

**C7. Why Leaflet instead of Google Maps?**
Leaflet with OpenStreetMap tiles is free, open, and needs no API key or billing.

**C8. How is the map loaded?**
Lazily, via dynamic import, so the map library does not bloat the initial bundle.

**C9. How does login know where to send the user?**
After login, the role decides the route: ADMIN → admin dashboard, RESPONDER → responder
panel, USER → dashboard.

**C10. How is auth state shared across components?**
Through an `AuthProvider` React context (`useAuth`) that holds the user and token.

**C11. Where is the token stored?**
localStorage (remember me) or sessionStorage, under the key `rakshasafe.token`.

**C12. What does the dashboard show?**
A welcome hero with an SOS button, summary tiles (total incidents, active, contacts, location
status), emergency helplines, and the user's incident list.

**C13. What are the quick-access tools?**
Emergency Contacts, Nearby Resources, and Report Unsafe Area.

**C14. How does the UI handle loading and errors?**
With skeleton loaders, empty states, and error states with retry buttons. Aborted requests are
ignored cleanly.

**C15. Is the UI responsive?**
Yes — it uses responsive Tailwind classes and works on mobile and desktop.

---

## D. Backend & API

**D1. What framework is the backend?**
Node.js with Express and TypeScript.

**D2. Is the API REST-based?**
Yes. Resource-oriented routes under `/api` with standard HTTP verbs.

**D3. What is the health endpoint?**
`GET /api/health` returns status plus database state (`db.state`, `db.connected`).

**D4. List the main route groups.**
auth, incidents, emergency-contacts, facilities, nearby-resources, nearby (OSM), weather,
notifications, rescue-teams, responder, unsafe-reports, geocode, admin.

**D5. How is authentication done?**
JWT bearer tokens. `requireAuth` verifies the token and re-checks the user in the database.

**D6. How is authorization done?**
Role middleware: `requireAdmin` and `requireResponder` guard admin and responder routes.

**D7. What is `requireDb`?**
Middleware that returns 503 when MongoDB is not connected, so requests fail fast instead of
hanging.

**D8. How is a new incident created?**
`POST /api/incidents`, rate-limited to 10/min per IP, validated, then persisted and scored.

**D9. What does the incident controller return?**
Safe incident objects — no internal fields or sensitive data leakage.

**D10. How are emergency contacts managed?**
`GET/POST /api/emergency-contacts` and `PATCH/DELETE /:id`. A partial-unique index enforces at
most one primary contact per user.

**D11. How does the responder get only their data?**
The responder routes derive identity from the JWT and filter every query by the teams the
caller belongs to.

**D12. What can a responder do?**
List own-team assignments, view scoped incident detail, list in-app notifications, and update
assignment status along the allowed workflow.

**D13. What is an AdminLog?**
An audit record of administrative actions: who did what, to which target, and when.

**D14. How are notifications recorded?**
After a successful primary write, notification documents are inserted: one IN_APP record
(DELIVERED) and one per opted SMS/Email contact (honestly NOT_CONFIGURED).

**D15. Why "record after success"?**
So a notification is only logged when the underlying action actually happened — no false
notifications.

**D16. What is `recordEventSafe`?**
A best-effort wrapper: a notification failure is logged but never fails or duplicates the main
operation.

**D17. How does the geocode route work?**
It proxies OpenStreetMap Nominatim server-side, authenticated, with an 8-second timeout and
country filter for India.

**D18. Why proxy geocoding through the backend?**
To protect the external service from abuse, keep API keys/headers server-side, and apply
rate-limiting and caching.

**D19. How does the nearby route work?**
It queries Overpass for hospitals, clinics, police, fire stations, etc., with progressive
radius search (1 km → 2.5 km → 5 km) until results are found.

**D20. What error format does the API use?**
Consistent JSON: `{ success: false, error: "...", details?: [...] }`.

---

## E. Database

**E1. Which database and ODM?**
MongoDB with Mongoose.

**E2. Why MongoDB?**
Flexible document model suits varied emergency data shapes and fast iteration.

**E3. How many collections?**
15, each with a Mongoose schema.

**E4. Name the core collections.**
users, locations, incidents, incidentupdates, riskassessments, unsafeareareports,
emergencycontacts, facilities, rescueteams, rescueassignments, notifications, adminlogs,
disastercategories, reports, riskzones/reportcounters.

**E5. What identifies a document?**
MongoDB `_id` (ObjectId), validated for shape before use.

**E6. How is the user schema structured?**
name, email (unique), phone, passwordHash, role (USER/ADMIN/RESPONDER), isActive, language,
timestamps.

**E7. How do you prevent duplicate accounts?**
Unique indexes on email (and phone per design), enforced by the database.

**E8. How is the incident linked to its location?**
By a `locationId` reference to the locations collection.

**E9. How is an incident linked to a category on risk?**
RiskAssessment references the incident and stores score, level, factors, model version, and
assessedAt.

**E10. What is a partial-unique index and where is it used?**
It enforces uniqueness only for matching documents. Used so each user has at most one primary
emergency contact.

**E11. How does the dashboard query data?**
Using MongoDB aggregation pipelines (`$group`, `$sort`, `$limit`) — all counts are live.

**E12. Does the app store PII in dashboards?**
No. Dashboard responses exclude stored password hashes and secret values.

---

## F. AI / Risk Engine

**F1. What is the AI service?**
A Python FastAPI service exposing `POST /risk/assess` and `GET /health`.

**F2. What is the model name?**
`raksha-risk-v1`.

**F3. What algorithm does it use?**
A weighted, rule-based additive scoring algorithm — deterministic, not ML.

**F4. Why not machine learning?**
Explainability, reproducibility, and no training data yet. In safety systems, a transparent
score is more defensible than a black box.

**F5. Give the exact scoring weights.**
Base by priority: LOW 15, MEDIUM 35, HIGH 60, CRITICAL 80. Disaster: +5. Verified nearby
reports: +6 each, cap 30. Unverified reports: +2 each, cap 10. Active nearby incidents: +3
each, cap 15. Clamp 0–100.

**F6. What are the risk bands?**
Score < 25 → LOW; < 50 → MEDIUM; < 75 → HIGH; ≥ 75 → CRITICAL.

**F7. What is the nearby radius for the risk engine?**
2 km, using the Haversine formula.

**F8. Why Haversine?**
It computes great-circle distance between two lat/long points accurately for nearby ranges.

**F9. What is stored with each assessment?**
Score, level, contributing factors, model version, and timestamp.

**F10. What is Gemini's exact role?**
An optional natural-language explanation of the already-computed result. It never scores and
never writes to the database.

**F11. What happens if Gemini is unavailable?**
The system uses a built-in deterministic explanation. The score is unaffected.

**F12. How does the backend call the AI service?**
Over HTTP with a configurable timeout (`AI_SERVICE_TIMEOUT_MS`, default 10000 ms).

**F13. What if the AI service is down?**
The backend uses its local fallback risk calculation. The SOS flow never breaks.

**F14. Is the risk score stored or recomputed?**
It is computed on demand and stored as a RiskAssessment, and can be re-fetched.

**F15. Can two identical incidents get different scores?**
No — the engine is deterministic, so identical inputs give identical scores.

**F16. Where is the risk logic documented?**
In `ai-service/app/risk.py`, with the weights written explicitly in code and in the
documentation.

---

## G. Security

**G1. How are passwords stored?**
Hashed with bcrypt, 12 salt rounds. Plain text is never stored or returned.

**G2. What is in the JWT payload?**
Only `sub` (user id) and `role`. No sensitive data.

**G3. How long do tokens last?**
According to `JWT_EXPIRES_IN` (default 7 days).

**G4. How are protected routes secured?**
`requireAuth` verifies the token, and then re-loads the user from the database (preferring
live DB state over the token).

**G5. What is the `toSafeUser` pattern?**
A serializer that strips `passwordHash` and internal fields before sending a user to clients.

**G6. How is role escalation prevented?**
Public registration always forces role USER. Role changes are only possible through the
admin-only update path, which is validated.

**G7. How do you rate-limit abuse?**
An in-memory fixed-window limiter keyed by IP and route. Incident creation and unsafe reports
are capped at 10/min.

**G8. What are the limiter's limitations, stated honestly?**
It is per-instance (not shared across servers), so it suits a single-instance deployment.

**G9. How do you prevent leaking secrets?**
Secrets live only in environment variables; the repo commits `.env.example` with names, not
values.

**G10. How do you handle errors without leaking internals?**
The global error handler returns generic messages for 500s and never exposes stack traces to
clients.

**G11. Is CSRF a concern?**
We use bearer tokens in the Authorization header (not cookie-based sessions), which reduces
classic CSRF exposure.

**G12. How do responders avoid seeing others' data?**
Every responder query is constrained to the caller's team memberships derived from the JWT.

---

## H. Testing & Quality

**H1. What testing levels did you use?**
Five: unit, integration, API functional, browser end-to-end, and manual.

**H2. Give the unit test numbers.**
36 suites, 127 checks, all passed.

**H3. Give the integration test numbers.**
67 cases passed.

**H4. Give the API functional test numbers.**
101 cases across 27 modules, all passed (live environment).

**H5. Give the browser/E2E numbers.**
16 journeys, 15 passed; T14 found layout defect D1.

**H6. What test runner is used?**
The Node.js built-in test runner with `tsx` for TypeScript.

**H7. Is Supertest used?**
Yes — Supertest is used in the integration tests for HTTP-level assertions, together with
mongodb-memory-server for an in-memory database. The test runner itself is the Node.js built-in
`node:test` runner (not Jest).

**H8. What linter is used?**
oxlint (frontend), not ESLint.

**H9. What defect is documented?**
D1, a layout defect found by browser journey T14. It is recorded honestly in the evidence.

**H10. Do you test failure cases?**
Yes — including database down and AI service down, to prove graceful degradation.

**H11. Why is honest testing emphasized?**
Because it is a safety system; hiding defects would be unethical and dangerous.

**H12. What is out of scope for testing?**
Penetration testing, large-scale load testing, and CI/CD pipeline testing.

---

## I. Deployment, Tools & Process

**I1. How is the frontend deployed?**
As a static build suitable for hosts like Cloudflare Pages, and optionally packaged as an
Android app with Capacitor.

**I2. What is Capacitor used for?**
Wrapping the web app into a native Android shell (`appId: com.rakshasafe.app`).

**I3. Are deployment secrets committed?**
No. Secrets are supplied as environment variables at deploy time.

**I4. What tools did you use?**
VS Code, Git, npm, Node.js, Python, MongoDB, and the Node test runner.

**I5. What is the repository structure?**
`frontend/`, `backend/`, `ai-service/`, and `documentation/` in one monorepo.

**I6. What is your development port setup?**
Frontend 5173, backend 5000, AI service 8000, MongoDB 27017.

**I7. How is the environment kept consistent?**
`.env.example` files per service document all required variables by name.

**I8. How is the code organized in the backend?**
config, controllers, middleware, models, routes, services, utils, validators, scripts, tests.

**I9. What is the `scripts/` folder for?**
Seed and maintenance scripts: seed admin, seed responder, update admin, purge test data,
verify models, verify AI failures.

**I10. Is there a README?**
Yes, but it is stale — it claims no business modules are implemented. The code is the source
of truth; flag this mismatch honestly if asked.

---

## J. Future Scope & Tricky Questions

**J1. What is your biggest limitation?**
No real SMS/Email provider, so contact messaging is recorded as NOT_CONFIGURED rather than
delivered.

**J2. How would you make the AI a true ML system?**
Collect real incident outcomes and train a classifier, then A/B test it against the rule
engine behind the same API.

**J3. How would you support real-time updates?**
Add WebSockets (e.g., Socket.IO) or server-sent events to push status changes to clients.

**J4. How would you make it multi-instance scalable?**
Move the rate limiter to Redis and add a shared session/queue layer.

**J5. How would you handle offline areas?**
A service worker plus local queue that syncs incidents when connectivity returns.

**J6. "Your risk engine might be wrong." How do you respond?**
It is transparent and tunable — the weights are explicit and can be adjusted. For a first
version, explainability and reproducibility were prioritized over opaque accuracy.

**J7. "Isn't rule-based logic outdated?"**
No. Many production risk/fraud engines are rule-based or hybrid because they are auditable. ML
can be added later behind the same interface.

**J8. How is your project different from existing apps?**
It combines women safety and disaster response, uses an explainable risk engine, integrates
live open map/weather data, and is honest about what it cannot do.

**J9. What would you do differently if you restarted?**
Add real messaging and real-time transport earlier, and add automated end-to-end coverage in
CI from day one.

**J10. Why should this project be considered successful?**
It delivers a complete, working, tested, three-tier safety platform with real integrations,
documented limitations, and honest evidence — all built and understood end to end.

**J11. Can you explain your project in one sentence?**
RakshaSafe turns a single SOS action into a scored, located, notified, and assigned emergency
response, using an explainable AI risk engine at its core.

**J12. What did you personally implement?**
The full three-tier implementation: React frontend, Express/MongoDB backend with JWT security,
the FastAPI deterministic risk engine, external integrations, and the test suite.
