# 08 — Last-Minute Revision

> Read this in the final 30–60 minutes. Numbers, names, and quick answers only.

## The 15 numbers/names to memorize

| Item | Value |
|---|---|
| Project name | RakshaSafe |
| Full title | AI-Powered Women Safety and Disaster Emergency Response System |
| Student / Roll | Vivek Lorikprasad Sahani / 42 |
| Guide | Asst. Prof. Sourabh Suryawanshi |
| Frontend port | 5173 |
| Backend port | 5000 |
| AI service port | 8000 |
| Risk model name | `raksha-risk-v1` |
| Risk bands | <25 LOW, <50 MEDIUM, <75 HIGH, ≥75 CRITICAL |
| Base scores | LOW 15, MEDIUM 35, HIGH 60, CRITICAL 80 |
| Risk nearby radius | 2 km |
| Collections in MongoDB | 15 |
| Unit tests | 36 suites / 127 checks, all passed |
| Integration tests | 67 cases passed |
| API functional tests | 101 cases / 27 modules, all passed |
| Browser E2E | 16 journeys, 15 passed, defect D1 |

## The one-line answers (rapid fire)

- **3 tiers:** React frontend → Express backend → FastAPI AI service, with MongoDB.
- **AI is:** deterministic weighted risk scoring; Gemini only explains.
- **Auth:** JWT + bcrypt (12 rounds) + role middleware.
- **Roles:** USER, ADMIN, RESPONDER.
- **Workflow:** REPORTED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED (+CANCELLED).
- **Notifications:** in-app DELIVERED; SMS/Email NOT_CONFIGURED.
- **Location:** never fabricated; honest states.
- **Maps:** Leaflet + OpenStreetMap; weather via Open-Meteo; geocode via Nominatim.
- **Testing runner:** Node `node:test` + tsx; Supertest for integration; oxlint for lint.
- **Failures handled:** AI down → local fallback; DB down → clean 503; external down → unavailable state.

## The exact risk formula (say it in one breath)

Base by priority (15/35/60/80), +5 if disaster, +6 per verified report (cap 30), +2 per
unverified report (cap 10), +3 per active nearby incident (cap 15), clamp 0–100, then band it.

## The 8 honest points (say these before they ask)

1. Risk engine is **rule-based, not ML** — for explainability.
2. Gemini is **optional and explain-only**.
3. SMS/Email are **NOT_CONFIGURED** — no provider.
4. Rate limiter is **in-memory** (single-instance).
5. `README.md` is **stale** — code is current.
6. RESPONDER is an **added** role beyond the original scope.
7. Test runner is **node:test**, not Jest.
8. Defect **D1** was found by E2E journey T14 and documented.

## Revision order (if you only have 30 minutes)

1. This file (8 min) — numbers and one-liners.
2. `01-Project-Overview.md` elevator pitch (4 min).
3. `04` groups **F (AI)**, **G (Security)**, **H (Testing)** (10 min).
4. `06` demo script sections B–C (5 min).
5. `07` mismatches table (3 min).

## If you have 2 hours

1. Read `02` (easy answers) fully.
2. Read `03` (Hinglish) fully and speak a few aloud.
3. Read `05` (technical deep dive) fully.
4. Skim `04` all groups.
5. Rehearse the demo once end to end.

## Do's and Don'ts (final)

**Do**
- Breathe, then answer in 3–6 sentences.
- Start technical answers from the architecture, then drill down.
- Admit limitations confidently — it shows maturity.
- Quote only recorded test numbers.
- Say "I'll check the code" rather than guessing.

**Don't**
- Don't memorize exact query syntax—explain the approach.
- Don't claim ML/AI capabilities the engine doesn't have.
- Don't say "sent SMS/Email"; say "recorded as not configured."
- Don't show `.env` or any keys/passwords.
- Don't read the stale README as fact.

## Emergency phrases

- "The scoring is deterministic, so identical inputs give identical scores."
- "If the AI service is down, the backend uses its local fallback — the SOS flow never breaks."
- "Passwords are bcrypt-hashed; plain text is never stored."
- "We scope every responder query to their own teams."
- "This is documented as a known limitation in Chapter 7."

## Mental model of the whole system (one picture)

```
User raises incident ──► Backend saves + stores location
                             │
                             ├──► AI service: raksha-risk-v1 → score + level
                             │        (fallback: backend local engine)
                             ├──► Nearby resources (DB + OpenStreetMap)
                             ├──► Weather (Open-Meteo) + geocode (Nominatim)
                             └──► Notifications (in-app DELIVERED; SMS/Email NOT_CONFIGURED)

Admin sees live dashboard ──► assigns rescue team ──► audit log
Responder sees OWN team only ──► ASSIGNED → EN_ROUTE → ON_SCENE → COMPLETED
```

Good luck. You built this — speak like the owner.
