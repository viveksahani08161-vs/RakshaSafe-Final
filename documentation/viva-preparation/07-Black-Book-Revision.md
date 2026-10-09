# 07 — Black Book Revision (Chapter by Chapter)

> Aligned to the actual Black Book. Use this to connect your spoken answers to the printed
> report. Where the report and the code differ, be honest and say so (see the last section).

## Document identity (know these by heart)

| Field | Value |
|---|---|
| Title | RakshaSafe — AI-Powered Women Safety and Disaster Emergency Response System |
| Student | Vivek Lorikprasad Sahani |
| Roll No. | 42 |
| Guide | Asst. Prof. Sourabh Suryawanshi |
| College | D.T.S.S. College of Commerce (Autonomous), Mumbai – 400097 |
| Academic Year | 2026–27 |

## Chapter 1 — Introduction

Remember these points:
- Background of women safety and disaster management in India.
- Problem statement: delay and poor coordination during emergencies.
- Objectives of the system (fast reporting, automatic risk scoring, nearby help, coordinated
  response).
- Scope: web app covering safety + disaster incidents, with roles USER / ADMIN / RESPONDER.
- Organization of the report.

Likely question: *"What was your problem statement?"* → Delay in reporting and lack of a
single location-aware, risk-scored platform connecting citizens to responders.

## Chapter 2 — Survey of Technology

Remember:
- Why React 19 + TypeScript + Vite + Tailwind 4 for the frontend.
- Why Node.js + Express + TypeScript + Mongoose for the backend.
- Why MongoDB for the database.
- Why Python + FastAPI for the AI/risk service.
- Why Leaflet + OpenStreetMap instead of paid map SDKs.
- Comparison with alternatives (e.g., Angular/Vue, Django/Rails, PostgreSQL/MySQL,
  Google Maps).

Likely question: *"Why MongoDB over a relational database?"* → Flexible document model for
varied emergency data, fast iteration, and natural nesting of location and context data.

> Note: Do **not** modify Chapter 2 of the final report. Revise from it only.

## Chapter 3 — Requirement and Analysis

Remember:
- Functional requirements: authentication, incident CRUD, risk assessment, nearby resources,
  emergency contacts, notifications, unsafe reports, rescue teams, admin management.
- Non-functional requirements: security, availability, explainability, graceful degradation,
  usability, honesty (no fabricated data).
- Feasibility: technical, economic, operational.
- Requirements baseline (see `documentation/REQUIREMENTS_BASELINE.md`).
- Use-case analysis: citizen raises incident; admin manages/assigns; responder updates.
- Incident categories: Women Safety, Medical Emergency, Accident, Fire, Flood, Earthquake,
  Other Emergency.

Likely question: *"What are your functional vs non-functional requirements?"* → Answer using
the two lists above; emphasize graceful degradation and explainability as non-functional
requirements.

> Note: Do **not** modify Chapter 3 of the final report. Revise from it only.

## Chapter 4 — System Design

Remember:
- Three-tier architecture diagram (frontend / backend / AI service / MongoDB).
- Module design and interactions.
- DFD levels, use-case diagram, ER diagram, class/sequence design as shown.
- Database schema design for the collections.
- API design (REST under `/api`).
- The risk engine design: `raksha-risk-v1` deterministic weights and bands.

Likely question: *"Draw/explain your architecture."* → Three tiers, backend orchestrates,
AI service stateless with fallback, MongoDB persistence, external services server-side.

Likely question: *"Explain your ER/collections."* → Refer to the 15 collections summary in
`05-Technical-Deep-Dive.md`.

## Chapter 5 — System Implementation

Remember:
- Frontend implementation: components, pages (SOS, Dashboard, Admin, Responder), hash routing,
  map, location honesty, i18n, theme.
- Backend implementation: routes → controllers → services → models, middleware (auth,
  requireDb, rateLimit, error), validators, utils.
- AI service implementation: FastAPI app, `POST /risk/assess`, `risk.py` engine, optional
  Gemini explanation.
- Integrations: Nominatim, Overpass, Open-Meteo, Gemini.
- Security implementation: bcrypt, JWT, safe serializers, role guards.
- Notification implementation: in-app DELIVERED; SMS/Email NOT_CONFIGURED.

Likely question: *"Show where the risk scoring is implemented."* → `ai-service/app/risk.py`
(engine) and `backend/src/services/riskAssessment.ts` (fallback + orchestration).

## Chapter 6 — System Testing

Remember the exact results:
- **Unit:** 36 suites, 127 checks, all passed.
- **Integration:** 67 cases passed (Supertest + mongodb-memory-server).
- **API functional (live):** 101 cases across 27 modules, all passed.
- **Browser / E2E:** 16 journeys, 15 passed; T14 found layout defect **D1**.
- **Levels:** 5 (unit, integration, API functional, browser E2E, manual).
- Out of scope: penetration testing, large-scale load testing, CI/CD testing.

Likely question: *"What defect did you find and how did you handle it?"* → T14 found layout
defect D1; documented honestly in the evidence rather than hidden.

Likely question: *"Show a test case."* → Pick one unit test (e.g., risk bands) and one
integration test (e.g., register → login → create incident).

## Chapter 7 — Conclusion and Future Scope

Remember:
- Conclusion: a complete, tested, three-tier safety platform with explainable AI and honest
  engineering.
- Limitations: no real SMS/Email provider; rule-based (not ML) risk; single-instance rate
  limiter; dependence on external map/weather availability.
- Future scope: real SMS/Email providers, real-time WebSockets, ML risk model once data
  exists, offline support, more Indian languages, wearables/shake-to-SOS, mobile app via
  Capacitor.

Likely question: *"What is your future scope?"* → List the items above in priority order.

## Chapter 8 — Appendix / Supporting Material

- SRS tables and detailed test-evidence tables.
- Screenshots in `documentation/test-evidence/screenshots/`.
- Diagrams in `chapter6_diagrams_bw/`.

## Black Book vs actual code — honest mismatches (be ready)

| # | Report / older doc says | Actual implementation | How to answer |
|---|---|---|---|
| 1 | `README.md` claims "no business modules implemented yet" | System is fully implemented | "The README is stale; it predates the build. The code and Chapter 6 evidence are current." |
| 2 | Scope baseline lists USER and ADMIN | Code adds a third role RESPONDER | "RESPONDER was added as a deliberate extension for field rescue teams, documented in the design." |
| 3 | Testing tools mentioned as Jest/Supertest in places | Node `node:test` runner + `tsx`; Supertest used for integration; **no Jest** | "We use the Node built-in test runner. Supertest is used at the HTTP integration level. Jest is not used." |
| 4 | Linting implied as ESLint | Frontend uses **oxlint** | "We use oxlint for fast linting." |
| 5 | Messaging imagined as delivered | SMS/Email honestly `NOT_CONFIGURED`; only in-app is DELIVERED | "Delivery for SMS/Email is intentionally marked NOT_CONFIGURED because no provider is configured." |
| 6 | AI sometimes described loosely | Risk engine is deterministic rule-based; Gemini is explain-only | "The scoring is deterministic; Gemini only explains, it never scores." |

> If an examiner finds one of these, agree calmly, state the accurate version, and show the
> code or the test evidence. Honesty here is a strength.

## 60-second chapter sweep (memorize)

1. Intro — problem, objectives, scope.
2. Survey — why this stack.
3. Requirements — functional, non-functional, use cases.
4. Design — 3-tier architecture, 15 collections, REST API, risk model.
5. Implementation — routes/controllers/services/models, auth, integrations, notifications.
6. Testing — 36/127, 67, 101/27, 16 journeys, defect D1, 5 levels.
7. Conclusion — honest limitations + future scope.
8. Appendix — evidence and diagrams.
