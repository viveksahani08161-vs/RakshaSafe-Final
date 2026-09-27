# Raksha Safe - Live End-to-End Test Evidence

This folder contains the real, browser-executed end-to-end test run for the
Raksha Safe application (React + Vite frontend, Node/Express backend,
Python AI scoring service, MongoDB Atlas).

## Contents

- `real_full_test.js` - the full Puppeteer automation script (user, admin and
  responder phases). Requires sharp'less `puppeteer-core` and system Chrome.
- `real_screens/` - 24 real screenshots captured from live running services.
- `screenshots/` - copy of the same 24 screenshots (embedded into Chapter 6).

## How the run was executed

1. Start all three services:
   - Backend: `npm run dev` in `../../backend` (uses MongoDB Atlas via `.env`)
   - AI service: `python src/main.py` in `../../ai-service` (or its run script)
   - Frontend: `npm run dev` in `../../frontend` (serves `http://localhost:5173`)
2. Seed admin and responder accounts:
   ```powershell
   $env:MONGO_URI = (Select-String -Path backend\.env -Pattern '^MONGO_URI=').Line.Substring(10)
   $env:ADMIN_EMAIL='admin@rakshasafe.local'; $env:ADMIN_PHONE='+919888000001'
   $env:ADMIN_PASSWORD='Admin@1234'; $env:ADMIN_NAME='Raksha Admin'
   npm run seed:admin
   $env:RESPONDER_EMAIL='responder@rakshasafe.local'; $env:RESPONDER_PHONE='+919888000002'
   $env:RESPONDER_PASSWORD='Resp@1234'; $env:RESPONDER_NAME='Raksha Responder'
   npm run seed:responder
   ```
3. Execute the browser suite:
   ```powershell
   npm install --no-save puppeteer-core
   node documentation\test-evidence\real_full_test.js
   ```

## Test users used in the run

| Role | Identifier | Password |
| --- | --- | --- |
| User (registered via UI) | priya<timestamp>@raksha.test | Secure@123 |
| Admin (seeded) | admin@rakshasafe.local | Admin@1234 |
| Responder (seeded) | responder@rakshasafe.local | Resp@1234 |

> The incident created during the run is a REAL record in the MongoDB Atlas
> database with status `REPORTED` (e.g. reference `6ab919d7c8617854356d5b8e`,
> category Women Safety, priority CRITICAL). It is not a mock or placeholder.

## Screenshot map (24)

| # | File | Screen |
| --- | --- | --- |
| 01 | 01_login_page | Login page |
| 02 | 02_register_page | Registration page (empty) |
| 03 | 03_register_form_filled | Registration filled with test user |
| 04 | 04_user_dashboard_after_register | User dashboard after sign-up |
| 05 | 05_sos_page | SOS form (step 1 - details) |
| 06 | 06_sos_form_filled | SOS filled (Safety / Women Safety / Critical) |
| 07 | 07_sos_location_step | SOS step 2 - location |
| 08 | 08_sos_review_step | SOS step 3 - review |
| 09 | 09_incident_confirmed | Incident recorded confirmation |
| 10 | 10_dashboard_with_incident | Dashboard showing the new incident |
| 11 | 11_notifications_page | Notifications page |
| 12 | 12_resources_page | Nearby resources |
| 13 | 13_emergency_contacts_page | Emergency contacts |
| 14 | 14_profile_page | User profile |
| 15 | 15_before_admin_login | Logged-out home (admin login) |
| 16 | 16_admin_login_filled | Admin login form filled |
| 17 | 17_admin_dashboard | Admin dashboard |
| 18 | 18_admin_incidents | Admin - incidents list |
| 19 | 19_admin_users | Admin - users |
| 20 | 20_admin_facilities | Admin - facilities |
| 21 | 21_admin_teams | Admin - rescue teams |
| 22 | 22_admin_unsafe_reports | Admin - unsafe area reports |
| 23 | 23_reports_page | Reports / analytics |
| 24 | 24_responder_dashboard | Responder dashboard |

## Verification

- Screenshot files are real captures (verify with `Get-ChildItem *.png`).
- Incident record confirmed live via admin API:
  `GET /api/admin/incidents` returned the CRITICAL Women Safety incident
  with status REPORTED (total 5 incidents in database at run time).