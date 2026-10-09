# 06 — Live Demo Checklist

> Follow top to bottom. Do the **pre-flight** before the viva starts. Have the fallback plan
> ready in case Wi-Fi or the database misbehaves.

## A. Pre-flight (do 15–20 minutes before)

1. **MongoDB running** — local service on `27017` (`mongodb://127.0.0.1:27017/rakshasafe`).
   - Quick check: open a Mongo shell or Compass and confirm the server accepts connections.
2. **Env files present** — `backend/.env` copied from `.env.example`, `frontend/.env` copied
   from `.env.example`, `ai-service` env if needed. Never show secret values on screen.
3. **Dependencies installed** — run once, ahead of time:
   - `backend\`: `npm install`
   - `frontend\`: `npm install`
   - `ai-service\`: create venv and `pip install -r requirements.txt`
4. **Seed accounts** (so you don't rely on registering live):
   - `backend\`: `npm run seed:admin`
   - `backend\`: `npm run seed:responder`
   - Keep the admin + responder credentials handy (do NOT display passwords on the projector).
5. **Build sanity** (optional but good): `backend\: npm run typecheck`, `frontend\: npm run build`.
6. **Browser** — open two tabs (or two browsers): one for the USER, one for the ADMIN. Keep a
   third ready for the RESPONDER if time allows.
7. **Screen** — close email/chat; set browser zoom ~100%; have this checklist on a second
   device, not the projected screen.

## B. Start the three services (3 terminals)

Open three terminals in the repo root and run:

```powershell
# Terminal 1 — AI service (start first; core SOS does not depend on it)
cd ai-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Backend API
cd backend
npm run dev

# Terminal 3 — Frontend
cd frontend
npm run dev
```

Expected:

- AI service: Uvicorn running on `http://0.0.0.0:8000`.
- Backend: listening on port `5000`; DB connect log; do not paste the MONGO_URI into slides.
- Frontend: Vite ready on `http://localhost:5173`.

**Health check first (always demo this):**

```powershell
curl http://localhost:5000/api/health
```

Expect JSON with a healthy status and `db.connected: true`. If DB is false, fix the DB before
continuing (see Fallback).

## C. Demo script (10–12 minutes)

### Step 1 — Landing & Login (1 min)
1. Open `http://localhost:5173`.
2. Point out the landing hero, the four feature cards (Women Safety, Disaster Response, Live
   Location, Rescue Teams), and the navbar info dialogs.
3. Log in as the USER. Note the role-based redirect to `#/dashboard`.

### Step 2 — Dashboard (1 min)
1. Show the welcome hero, SOS button, and summary tiles (total incidents, active, contacts,
   location status).
2. Show the Emergency Helplines section (static national numbers — always available even
   offline).
3. Note the quick-access tiles: Contacts, Nearby Resources, Report Unsafe Area.

### Step 3 — Raise an incident (SOS) (3 min) — the core demo
1. Click **SOS**. Walk the four steps: **details → location → review → done**.
2. Show that the browser asks for GPS permission.
   - Allow it → location captured and shown on the review step.
4. Fill a realistic scenario, e.g. category "Women Safety", priority HIGH, a clear description.
5. On **review**, show the summary, then **submit**.
6. After submit:
   - Show the incident appear on the dashboard with its status badge.
   - Open the incident detail and show the **risk assessment** (score + level + factors).
   - Show the map with the pinned location and nearby facilities.

### Step 4 — Risk assessment (1–2 min)
1. Open `POST/GET risk` result in the UI.
2. Explain the score is `raksha-risk-v1`, deterministic, with documented weights.
3. (Optional, if Gemini configured) show the explanation paragraph; state it explains but
   never changes the score.

### Step 5 — Nearby & enrichment (1 min)
1. Show nearby hospitals/police from OpenStreetMap (Overpass) on the map.
2. Show the weather tile (Open-Meteo).
3. State clearly: OSM discovery results are never stored.

### Step 6 — Admin view (2–3 min)
1. Switch to the ADMIN tab; log in.
2. Open the **Admin Dashboard**: user count, incidents by status/priority/type, recent
   incidents, teams, assignments, facilities, report verification, risk distribution, recent
   activity — all live aggregations.
3. Show **assign an incident to a rescue team** (status moves to ASSIGNED).
4. Show the audit log entry created by the action.

### Step 7 — Responder view (1–2 min, if time)
1. Log in as RESPONDER in the third tab.
2. Show their panel lists **only** their team's assignments.
3. Open a scoped incident detail.
4. Move the assignment `ASSIGNED → EN_ROUTE → ON_SCENE → COMPLETED`.
5. Return to admin/user to show the status reflected.

### Step 8 — Honest engineering points (30 sec)
- In-app notification recorded as DELIVERED.
- SMS/Email records honestly show NOT_CONFIGURED (no provider configured).
- Location denial path: mention it shows "denied" and offers manual address search.

## D. What to say if a service is down

| Failure | Fallback line to say |
|---|---|
| AI service down | "The backend detects the AI service is unreachable and uses its deterministic local fallback — the SOS flow still works." |
| MongoDB down | "DB-dependent routes return a clean 503 via `requireDb`; enrichment routes like weather and nearby keep working." |
| Internet/OSM/weather down | "External discovery is optional; the app shows an unavailable state and core flow continues." |
| Frontend build issue | Fall back to the committed screenshots in `documentation/test-evidence/screenshots/`. |
| No GPS on the machine | Use the manual address search step; say "we never fabricate coordinates." |

## E. Evidence to have open (just in case)

- `documentation/test-evidence/README.md` and the screenshots folder.
- Chapter 6 test summary in the Black Book.
- This checklist on a second device.

## F. Do's and Don'ts

**Do**
- Start with `/api/health`.
- Demo the SOS flow as your headline.
- Speak the honest limitations proactively.

**Don't**
- Never show `.env` contents or any key/password.
- Don't claim SMS/Email is delivered.
- Don't quote test numbers other than the recorded ones.
- Don't navigate into `node_modules` or private caches on the projected screen.

## G. Rapid command reference

```powershell
# Backend
cd backend
npm run dev              # start API
npm run typecheck        # types
npm test                 # unit + integration
npm run verify:models    # model schema sanity
npm run verify:ai-failures

# Frontend
cd frontend
npm run dev              # start UI
npm run build            # production build
npm run preview          # preview build

# AI service
cd ai-service
python -m uvicorn app.main:app --port 8000 --reload
```
