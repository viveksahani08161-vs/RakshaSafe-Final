# -*- coding: utf-8 -*-
"""Rebuild the 14 flowcharts inside Chapter_4_RakshaSafe_Activity_Diagrams.mdj
with REAL project behavior (verified against backend/src + frontend/src) and a
clean vertical column layout (spine + left/right branches), matching the style
of the produced flowcharts.

Only the 'Chapter 4 System Interface Flows' model is rewritten; the
'RakshaSafe - ER & DFD (real data)' model and every other project element
are left untouched.
"""
import json
import secrets

MDJ = r'C:\Users\SAI\Desktop\Raksha\documentation\staruml\Chapter_4_RakshaSafe_Activity_Diagrams.mdj'
MODEL_NAME = "Chapter 4 System Interface Flows"


def gid():
    return secrets.token_hex(16)


# chart = (name, chars, flows, notes, cols)  ; cols: {nid: 'L'|'C'|'R'}
FLOWCHARTS = [
    # ------------------------- 4.2.1 LOGIN -------------------------
    ("Flowchart 4.2.1: Login", [
        ("start", "initial", "Start"),
        ("enter", "action", "Enter email or phone\n(identifier) + password"),
        ("req", "decis", "Both fields non-empty?"),
        ("err", "action", "Show 'Required' error under\nboth fields (client-side)"),
        ("post", "action", "POST /api/auth/login\n(rate limited 40/15 min)"),
        ("cred", "decis", "Account exists, is\nactive & password\nmatches?"),
        ("cred_err", "action", "401: 'Invalid credentials.'\nNo account enumeration\n(login never reveals users)"),
        ("role", "decis", "Account role?"),
        ("r_admin", "action", "Redirect: /#/admin/dashboard\n(ADMIN)"),
        ("r_resp", "action", "Redirect: /#/responder\n(RESPONDER)"),
        ("r_user", "action", "Redirect: /#/dashboard\n(USER)"),
        ("fin", "final", "End"),
    ], [
        ("start", "enter", None),
        ("enter", "req", None),
        ("req", "post", "yes"),
        ("req", "err", "no"),
        ("err", "enter", None),
        ("post", "cred", None),
        ("cred", "role", "yes"),
        ("cred", "cred_err", "no"),
        ("cred_err", "enter", None),
        ("role", "r_admin", "ADMIN"),
        ("role", "r_resp", "RESPONDER"),
        ("role", "r_user", "USER"),
        ("r_admin", "fin", None),
        ("r_resp", "fin", None),
        ("r_user", "fin", None),
    ], [
        ("requireAuth verifies JWT then re-reads the account from\nMongoDB on every request, so deactivation / role change\ntakes effect immediately, not at token expiry.", "cred"),
        ("Session bootstrap: GET /api/auth/me on load; 401\nclears the token and redirects to /login.", "r_user"),
    ],
        {"err": "L", "cred_err": "L", "r_resp": "R", "r_user": "R"}),

    # ------------------------- 4.2.2 REGISTRATION -------------------------
    ("Flowchart 4.2.2: Registration", [
        ("start", "initial", "Start"),
        ("form", "action", "Enter name, email, phone,\npassword, confirm + terms"),
        ("val", "decis", "Client validation passes?"),
        ("valerr", "action", "Field errors: name 2-100, email\nformat, +91 mobile, password 8-128,\nconfirm match, terms checked"),
        ("post", "action", "POST /api/auth/register\n(rate limited 20/hr)"),
        ("dup", "decis", "Email or phone already\nregistered?"),
        ("duperr", "action", "409: 'An account with this email\nalready exists.' or '...this phone\nnumber already exists.'"),
        ("hash", "action", "Hash password (bcrypt)\nrole forced to USER"),
        ("create", "action", "Create account\n201 { user, token }"),
        ("redir", "action", "Redirect /#/dashboard\n(registering user is always USER)"),
        ("fin", "final", "End"),
    ], [
        ("start", "form", None),
        ("form", "val", None),
        ("val", "post", "yes"),
        ("val", "valerr", "no"),
        ("valerr", "form", None),
        ("post", "dup", None),
        ("dup", "hash", "no"),
        ("dup", "duperr", "yes"),
        ("duperr", "form", None),
        ("hash", "create", None),
        ("create", "redir", None),
        ("redir", "fin", None),
    ], [
        ("The client can never self-assign a role: role is\nhardcoded to USER on the server.", "hash"),
        ("Phone is normalized (+91, dashes, spaces stripped) to\n10 digits before validation and lookup.", "form"),
    ],
        {"valerr": "L", "duperr": "L"}),

    # ------------------------- 4.2.3 USER DASHBOARD -------------------------
    ("Flowchart 4.2.3: User Dashboard", [
        ("start", "initial", "Start"),
        ("load", "action", "On load (parallel):\nGET /api/incidents (200 max)\nGET /api/emergency-contacts (100 max)"),
        ("gps", "action", "Then, non-blocking: device GPS\nstate tile (loading/idle/available/\ndenied/timeout/unavailable/unsupported)"),
        ("loadfail", "decis", "Incidents / contacts\nfailed to load?"),
        ("errstate", "action", "ErrorState with Retry; contacts tile\nshows a dash with a 'Try again' warning"),
        ("hero", "action", "Render welcome hero (SOS button +\nquick-access tiles: contacts, resources,\nreport-unsafe) + stat tiles"),
        ("stats", "action", "Tiles: Total | Active =\nREPORTED/ACKNOWLEDGED/ASSIGNED/\nIN_PROGRESS | Contacts | Location"),
        ("helpline", "action", "EmergencyHelplines section"),
        ("list", "action", "My Incidents list: status badge,\ntype / priority, category, description,\ntime, location yes/no, View details"),
        ("empty", "decis", "No incidents yet?"),
        ("empty_state", "action", "EmptyState: 'raise first\nincident' => /#/sos"),
        ("alert", "action", "Info alert: response is made by\nadministrators, not by the app"),
        ("fin", "final", "End"),
    ], [
        ("start", "load", None),
        ("load", "gps", None),
        ("gps", "loadfail", None),
        ("loadfail", "errstate", "yes"),
        ("loadfail", "hero", "no"),
        ("errstate", "hero", None),
        ("hero", "stats", None),
        ("stats", "helpline", None),
        ("helpline", "list", None),
        ("list", "empty", None),
        ("empty", "empty_state", "yes"),
        ("empty", "alert", "no"),
        ("empty_state", "alert", None),
        ("alert", "fin", None),
    ], [
        ("Incident list is capped at 200 and contacts at 100\nserver-side. Dashboard hides failures with a dash instead\nof showing a false zero.", "stats"),
        ("The Location tile reflects device GPS only and is never\nconflated with stored incident locations.", "gps"),
    ],
        {"errstate": "L", "empty_state": "L"}),

    # ------------------------- 4.2.4 SOS CREATION -------------------------
    ("Flowchart 4.2.4: SOS Creation", [
        ("start", "initial", "Start"),
        ("d1", "action", "Step Details:\ntype (Safety|Disaster), category,\ndescription (up to 2000), priority\n(LOW..CRITICAL)"),
        ("dval", "decis", "Details valid?"),
        ("dverr", "action", "Hardcoded validation: 'Select Safety\nor Disaster.' / 'Select a category.' /\n'Describe what is happening.'"),
        ("d2", "action", "Step Location:\n'Use device location' or\n'Continue without location'"),
        ("gpsout", "decis", "GPS outcome?"),
        ("gpsok", "action", "available: capture lat,lng\n+/-N m; nearby section loads\n(25 km, grouped)"),
        ("gpsno", "action", "denied/timeout/unavailable/\nunsupported: outcome alert +\nRetry / Allow location button"),
        ("skp", "action", "Skipped: 'No coordinates will be\nattached' - no false location\nis ever assumed"),
        ("m1", "merge", "Merge"),
        ("d3", "action", "Step Review: summary rows Type /\nCategory / Priority / Details /\nLocation; 'Not provided, no\ncoordinates attached.' when absent"),
        ("review", "action", "'Review emergency request' is\ndisabled while acquiring or until an\nexplicit choice (outcome or skipped)"),
        ("submit", "action", "POST /api/incidents\n(type, category, description,\npriority, location?)"),
        ("noleak", "action", "location key is omitted entirely\nwhen skipped - zero coordinates\nare never invented"),
        ("succ", "decis", "Submission succeeds?"),
        ("srv", "action", "Server: userId from JWT; status\nforced REPORTED; creates Location\nif given; recordEventSafe inc event,\nbest-effort; rate limit 10/min"),
        ("fail", "action", "'Submission failed': message shown;\nstay on Review to retry"),
        ("done", "action", "Done: 'SOS recorded' + Reference /\nCategory / Priority / Recorded +\ndisclaimer (no dispatch guarantee);\nGo to dashboard / Report another"),
        ("fin", "final", "End"),
    ], [
        ("start", "d1", None),
        ("d1", "dval", None),
        ("dval", "d2", "yes"),
        ("dval", "dverr", "no"),
        ("dverr", "d1", None),
        ("d2", "gpsout", None),
        ("gpsout", "gpsok", "available"),
        ("gpsout", "gpsno", "denied /\ntimeout /\nunavailable"),
        ("gpsout", "skp", "skipped"),
        ("gpsok", "m1", None),
        ("gpsno", "m1", None),
        ("skp", "m1", None),
        ("m1", "d3", None),
        ("d3", "review", None),
        ("review", "submit", None),
        ("submit", "noleak", None),
        ("noleak", "succ", None),
        ("succ", "srv", "yes"),
        ("succ", "fail", "no"),
        ("fail", "m1", None),
        ("srv", "done", None),
        ("done", "fin", None),
    ], [
        ("Coordinates come only from the device: available /\ndenied / timeout / unavailable / unsupported are all real\noutcomes - never defaulted.", "gpsout"),
        ("SOS creation is a poisoning vector: incident creation\nis capped at 10 per minute per IP.", "srv"),
    ],
        {"dverr": "L", "gpsno": "L", "skp": "R", "fail": "L"}),

    # ------------------------- 4.2.5 INCIDENT DETAIL -------------------------
    ("Flowchart 4.2.5: Incident Detail", [
        ("start", "initial", "Start"),
        ("load", "action", "Open /#/incident/:id\n3 parallel requests: GET /incidents/:id\n+ /updates + /risk"),
        ("nf", "decis", "Incident 404?"),
        ("nfstate", "action", "'Incident not found': 'This incident\ndoes not exist or is not yours.'"),
        ("sum", "action", "Summary panel: Type / Priority /\nDescription / Reported / Resolved\n(only if resolvedAt)"),
        ("loc", "action", "Location panel or 'No location was\ncaptured for this incident.' +\nLocationEnrichment (reverse address +\nweather) when a location exists"),
        ("near", "action", "Nearby resources via\nGET /incidents/:id/nearby-resources\n(no location => no-location card)"),
        ("atable", "decis", "canManage? status in\nREPORTED/ACKNOWLEDGED\nAND no assignments"),
        ("edit", "action", "Edit + Delete shown; Edit modal\n(Type/Category/Description/Priority)\n=> PATCH /incidents/:id"),
        ("blocked", "action", "Edit/Delete hidden + editing-blocked\nalert (server 409: 'Editing/deletion\nis only available for your new,\nunassigned cases...')"),
        ("del", "decis", "Delete confirmed?"),
        ("deldo", "action", "DELETE /incidents/:id -> toast\n-> back to /#/dashboard\n(no cascading deletes server-side)"),
        ("assign", "action", "Response assignment card when exists:\nteam name (type), phone tel link,\nAssigned date"),
        ("hist", "action", "History timeline oldest first; empty\n=> 'No updates yet' + 'About response'\ninfo alert (no guaranteed response)"),
        ("fin", "final", "End"),
    ], [
        ("start", "load", None),
        ("load", "nf", None),
        ("nf", "nfstate", "yes"),
        ("nf", "sum", "no"),
        ("nfstate", "fin", None),
        ("sum", "loc", None),
        ("loc", "near", None),
        ("near", "atable", None),
        ("atable", "edit", "yes"),
        ("atable", "blocked", "no"),
        ("edit", "del", None),
        ("edit", "assign", None),
        ("blocked", "assign", None),
        ("del", "deldo", "yes"),
        ("del", "assign", "no"),
        ("deldo", "fin", None),
        ("assign", "hist", None),
        ("hist", "fin", None),
    ], [
        ("Identity comes from the JWT, never the body; reads use\n{ _id, userId } so another user's id returns 404, not 403.", "load"),
        ("The backend performs no cascading deletes on incident\nremoval - location, notifications and updates stay.", "deldo"),
    ],
        {"nfstate": "R", "blocked": "R", "deldo": "L"}),

    # ------------------------- 4.2.6 EMERGENCY CONTACTS -------------------------
    ("Flowchart 4.2.6: Emergency Contacts", [
        ("start", "initial", "Start"),
        ("load", "action", "GET /api/emergency-contacts\n(capped 100): cards with name,\nrelationship, tel/mailto links,\nSMS / Email / no-auto-alerts badge"),
        ("form", "action", "Add / Edit form: name, phone,\nemail (opt), relationship (opt),\nnotifyViaSms (default true),\nnotifyViaEmail (default false),\nisPrimary (default false)"),
        ("val", "decis", "Server validation passes?"),
        ("verr", "action", "Per-field errors mapped to inputs:\nname 2-100, valid phone (normalized),\nvalid email, booleans true/false only"),
        ("save", "action", "POST /api/emergency-contacts or\nPATCH /:id (owner always from JWT)"),
        ("w404", "action", "Other user's id => scoped lookup\n{ _id, userId } => 404 'Contact\nnot found.' - never 403"),
        ("prim", "decis", "isPrimary?"),
        ("primset", "action", "Mark as primary contact\n(badge shown; primary selects alert\npreference)"),
        ("del", "action", "Delete => danger dialog =>\nDELETE /:id"),
        ("fin", "final", "End"),
    ], [
        ("start", "load", None),
        ("load", "form", None),
        ("form", "val", None),
        ("val", "save", "yes"),
        ("val", "verr", "no"),
        ("verr", "form", None),
        ("save", "w404", None),
        ("w404", "prim", None),
        ("prim", "primset", "yes"),
        ("prim", "del", "no"),
        ("primset", "del", None),
        ("del", "fin", None),
    ], [
        ("isPrimary shows the primary badge; the SMS/Email alert\nflags decide which channels receive incident events.", "form"),
    ],
        {"verr": "L", "primset": "R"}),

    # ------------------------- 4.2.7 RESOURCE LOOKUP -------------------------
    ("Flowchart 4.2.7: Resource Lookup", [
        ("start", "initial", "Start"),
        ("sec", "action", "Resources page - three independent\nsections: Nearby facilities (OSM) /\nRegistered rescue teams / Stored\nemergency facilities"),
        ("osm", "action", "Nearby: 'Use my location' ->\nrequestDeviceLocation()"),
        ("osmdecis", "decis", "GPS outcome?"),
        ("osmerr", "action", "Outcome error key (denied/timeout/\nunavailable/unsupported/invalid)\n+ Retry button"),
        ("osmok", "action", "GET /api/nearby (progressive search\n1 -> 2.5 -> 5 km; haversine distance\n2 dp; source OSM; NEVER stored)"),
        ("osmempty", "decis", "Empty even at 5 km?"),
        ("osmemptystate", "action", "Honest empty-state copy (5 km radius\nmention only) - no invented list"),
        ("osmlist", "action", "Cards: name, distance, phone,\naddress, directions + attribution +\nRefresh / Clear location"),
        ("teams", "action", "Rescue teams: GET /api/rescue-teams\n?teamType&search (active only); cards:\nname, type badge, Call team (tel),\nView location, specialization"),
        ("fac", "action", "Emergency facilities: GET /api/facilities\n?facilityType&search (operational only);\ncards: name, type, phone, capacity,\noperating hours"),
        ("note", "action", "Reference-data disclaimer: never\nclaims dispatch, availability, ETA\nor guaranteed response"),
        ("fin", "final", "End"),
    ], [
        ("start", "sec", None),
        ("sec", "osm", None),
        ("osm", "osmdecis", None),
        ("osmdecis", "osmok", "available"),
        ("osmdecis", "osmerr", "denied /\nother"),
        ("osmerr", "osmdecis", None),
        ("osmok", "osmempty", None),
        ("osmempty", "osmemptystate", "yes"),
        ("osmempty", "osmlist", "no"),
        ("osmemptystate", "teams", None),
        ("osmlist", "teams", None),
        ("teams", "fac", None),
        ("fac", "note", None),
        ("note", "fin", None),
    ], [
        ("/api/nearby searches progressively 1 -> 2.5 -> 5 km\nand stops at the first radius with results; radiusKm if\nsent must be 1..5, else 400.", "osmok"),
        ("OSM records are discovery results only and are never\nstored in the database.", "osmok"),
    ],
        {"osmerr": "L", "osmemptystate": "L"}),

    # ------------------------- 4.2.8 UNSAFE REPORTING -------------------------
    ("Flowchart 4.2.8: Unsafe Reporting", [
        ("start", "initial", "Start"),
        ("form", "action", "Form: category (poorLighting /\nisolatedArea / suspiciousActivity /\nharassmentConcern / unsafeTransport /\nbrokenCCTV / other), severity (low /\nmedium / high / critical), description\n(up to 2000) + live counter"),
        ("locreq", "decis", "Location captured?"),
        ("locerr", "action", "Blocked: 'A location is required for\nan unsafe-area report.' - unlike\nincidents, no submit without coords"),
        ("rev", "action", "Reverse-geocode lat,lng -> area name;\nhonest fallback: 'Location captured.\nAddress could not be determined.'"),
        ("val", "decis", "Category, severity &\ndescription valid?"),
        ("verr", "action", "Field errors shown; submit disabled\nwhile GPS acquiring"),
        ("post", "action", "POST /api/unsafe-reports\n(rate limited 10/min)"),
        ("srv", "action", "Server: isVerified forced false -\nuser submissions are never\nauto-confirmed"),
        ("list", "action", "List card: category, severity badge,\nVerified / Pending badge, location + 4-dp\ncoords + accuracy; Edit (optional location\nreplacement) / Delete"),
        ("admin", "action", "Admin reviews: PATCH isVerified true\n=> badge becomes Verified"),
        ("fin", "final", "End"),
    ], [
        ("start", "form", None),
        ("form", "locreq", None),
        ("locreq", "rev", "yes"),
        ("locreq", "locerr", "no"),
        ("locerr", "fin", None),
        ("rev", "val", None),
        ("val", "post", "yes"),
        ("val", "verr", "no"),
        ("verr", "form", None),
        ("post", "srv", None),
        ("srv", "list", None),
        ("list", "admin", None),
        ("admin", "fin", None),
    ], [
        ("Key asymmetry: unsafe reports REQUIRE coordinates;\nincidents allow submission without them.", "locreq"),
        ("Delete removes only the report - the linked Location\nrecord is preserved.", "list"),
    ],
        {"locerr": "R", "verr": "L"}),

    # ------------------------- 4.2.9 RISK ASSESSMENT -------------------------
    ("Flowchart 4.2.9: Risk Assessment", [
        ("start", "initial", "Start"),
        ("panel", "action", "RiskPanel on incident: interactive\nAssess button for the owner;\nread-only for admins"),
        ("hasloc", "decis", "Incident has a stored location?"),
        ("noloc", "action", "noLocation state - no assessment is\ngenerated without coordinates"),
        ("post", "action", "POST /api/incidents/:id/risk"),
        ("ok", "decis", "Assessment succeeds?"),
        ("fail", "action", "'Assessment failed. Please try again.'\n- dismissible alert"),
        ("get", "action", "GET /incidents/:id/risk -> render\nstored score, level and factor list"),
        ("fin", "final", "End"),
    ], [
        ("start", "panel", None),
        ("panel", "hasloc", None),
        ("hasloc", "post", "yes"),
        ("hasloc", "noloc", "no"),
        ("noloc", "fin", None),
        ("post", "ok", None),
        ("ok", "get", "yes"),
        ("ok", "fail", "no"),
        ("fail", "fin", None),
        ("get", "fin", None),
    ], [
        ("The UI never recalculates risk - values come only from\nstored backend assessments.", "get"),
        ("Enrichment (weather / address / OSM) is advisory and\nnever gates the primary flow.", "panel"),
    ],
        {"noloc": "R", "fail": "R"}),

    # ------------------------- 4.2.10 NOTIFICATIONS -------------------------
    ("Flowchart 4.2.10: Notifications", [
        ("start", "initial", "Start"),
        ("load", "action", "GET /api/notifications (own incidents\nonly, newest first, limit 100; contact\nnames resolved from own contacts)"),
        ("parse", "action", "Event label parsed from providerResponse\n(e.g. in-app:incident.status.changed:\nREPORTED->ACKNOWLEDGED); unknown labels\nfall back - never invented"),
        ("ch", "decis", "Channel?"),
        ("inapp", "action", "In-App: status DELIVERED - the app\nitself is the in-app provider, so\nstorage + serving IS delivery"),
        ("email", "action", "Email / SMS / WhatsApp: status badge\n(SENT / QUEUED / FAILED)"),
        ("nc", "decis", "status = NOT_CONFIGURED?"),
        ("ncbadge", "action", "NOT CONFIGURED badge + 'no provider\nconfigured' note (contact channels -\nnever rendered as sent)"),
        ("dot", "action", "Unread = gold border/dot via local\ncursor 'rakshasafe.notifications.seen';\n'Mark all read' writes timestamp"),
        ("link", "action", "Click -> 'Incident update' context /\nlink to incident (responder list filters\nto In-App only for privacy)"),
        ("fin", "final", "End"),
    ], [
        ("start", "load", None),
        ("load", "parse", None),
        ("parse", "ch", None),
        ("ch", "inapp", "In-App"),
        ("ch", "email", "Email /\nSMS /\nWhatsApp"),
        ("inapp", "nc", None),
        ("email", "nc", None),
        ("nc", "ncbadge", "yes"),
        ("nc", "dot", "no"),
        ("ncbadge", "dot", None),
        ("dot", "link", None),
        ("link", "fin", None),
    ], [
        ("Read state is client-only (localStorage cursor); all\nrecord data comes from the backend.", "dot"),
        ("Emission: one In-App record DELIVERED per event plus\none SMS/EMAIL record per opted contact - both honestly\nNOT_CONFIGURED (no external provider exists).", "ncbadge"),
    ],
        {"inapp": "L", "email": "R", "ncbadge": "L"}),

    # ------------------------- 4.2.11 PROFILE -------------------------
    ("Flowchart 4.2.11: Profile", [
        ("start", "initial", "Start"),
        ("read", "action", "Read view: name, email, phone,\nlanguage (dash when unset),\nmember-since, role badge"),
        ("edit", "action", "Edit: change name, email, phone,\nlanguage (trimmed)"),
        ("val", "decis", "Client validation ok?"),
        ("verr", "action", "Field-level errors shown"),
        ("patch", "action", "PATCH /api/auth/profile\n{ name, email, phone, language? }"),
        ("dup", "decis", "Email/phone already in use\nby another account?"),
        ("duperr", "action", "409 conflict error (uniqueness\nenforced across other accounts)"),
        ("save", "action", "Replace in-memory user + success\nalert (profile.saved)"),
        ("fin", "final", "End"),
    ], [
        ("start", "read", None),
        ("read", "edit", None),
        ("edit", "val", None),
        ("val", "patch", "yes"),
        ("val", "verr", "no"),
        ("verr", "edit", None),
        ("patch", "dup", None),
        ("dup", "save", "no"),
        ("dup", "duperr", "yes"),
        ("duperr", "edit", None),
        ("save", "fin", None),
    ], [
        ("Server requires at least one field to change; an empty\nlanguage string clears the field.", "patch"),
    ],
        {"verr": "L", "duperr": "L"}),

    # ------------------------- 4.2.12 ADMIN DASHBOARD -------------------------
    ("Flowchart 4.2.12: Admin Dashboard", [
        ("start", "initial", "Start"),
        ("auth", "action", "requireAuth + requireAdmin: GET\n/admin/dashboard"),
        ("deny", "decis", "Access allowed?"),
        ("denyerr", "action", "401 'Your session has expired.' / 403\n'Administrator access required.' /\naccess-denied description"),
        ("cards", "action", "4 stat cards: Users / Active incidents /\nTotal incidents / Rescue teams (active)\n(all drill-down links)"),
        ("ov", "action", "Incident overview (statuses with count > 0\ndesc; priorities LOW..CRITICAL) +\noperational snapshot (facilities\noperational, teams active, unsafe total)"),
        ("fresh", "decis", "Fresh system? (incidents total 0\nAND users total <= 1)"),
        ("getstart", "action", "Getting-started empty state"),
        ("stay", "action", "Stay on dashboard (drill-down to\n/admin/incidents, /admin/teams,\n/admin/facilities, /admin/unsafe-reports)"),
        ("fin", "final", "End"),
    ], [
        ("start", "auth", None),
        ("auth", "deny", None),
        ("deny", "cards", "yes"),
        ("deny", "denyerr", "no"),
        ("denyerr", "fin", None),
        ("cards", "ov", None),
        ("ov", "fresh", None),
        ("fresh", "getstart", "yes"),
        ("fresh", "stay", "no"),
        ("getstart", "stay", None),
        ("stay", "fin", None),
    ], [
        ("Admin routes are mounted behind requireAuth,\nrequireAdmin and requireDb.", "auth"),
    ],
        {"denyerr": "R", "getstart": "L"}),

    # ------------------------- 4.2.13 ADMIN INCIDENTS -------------------------
    ("Flowchart 4.2.13: Admin Incidents", [
        ("start", "initial", "Start"),
        ("list", "action", "GET /admin/incidents?page&limit(<=50)\n&status&priority&type&search (debounced;\nsearch matches category or description,\nregex-escaped)"),
        ("fv", "decis", "Filters valid?"),
        ("fverr", "action", "400: 'Status must be one of: ...' /\n'Priority must be one of: ...' /\n'Type must be Safety or Disaster.'"),
        ("table", "action", "Table: Category / Type / Priority /\nStatus / Reported / View ->\n/admin/incidents/:id"),
        ("st", "action", "Detail: PATCH /admin/incidents/:id/status\n{ status, comment? <=500 }"),
        ("tv", "decis", "Transition allowed?\nREPORTED->ACKNOWLEDGED|CANCELLED ...\nRESOLVED->CLOSED; CLOSED/CANCELLED\nterminal"),
        ("tverr", "action", "400: 'Cannot move from X to Y.\nAllowed: A, B.' or 'Incident is X;\nits status can no longer change.'"),
        ("tdo", "action", "Save incident FIRST, then IncidentUpdate\nhistory row + AdminLog (status update,\nIP) + owner notified (best-effort)"),
        ("assign", "action", "Assignment: POST /admin/incidents/:id/\nassignments { teamId, notes? } - team\noptions from active teams only"),
        ("av", "decis", "Team active & no duplicate\nactive assignment?"),
        ("averr", "action", "400 'Rescue team is not active.' /\n409 'This team already has an active\nassignment for the incident.' / 404"),
        ("ado", "action", "Create ASSIGNED assignment (assignedBy\n= admin); incident status NOT changed\n(must advance by hand); log create +\nnotify incident.assigned:teamName"),
        ("as", "action", "Assignment status PATCH /admin/\nassignments/:id (ASSIGNED->EN_ROUTE->\nON_SCENE->COMPLETED | CANCELLED);\nlogs assignment update; owner not notified"),
        ("fin", "final", "End"),
    ], [
        ("start", "list", None),
        ("list", "fv", None),
        ("fv", "table", "yes"),
        ("fv", "fverr", "no"),
        ("fverr", "list", None),
        ("table", "st", None),
        ("st", "tv", None),
        ("tv", "tdo", "yes"),
        ("tv", "tverr", "no"),
        ("tverr", "st", None),
        ("tdo", "assign", None),
        ("assign", "av", None),
        ("av", "ado", "yes"),
        ("av", "averr", "no"),
        ("averr", "assign", None),
        ("ado", "as", None),
        ("as", "fin", None),
    ], [
        ("Incident status is decoupled from assignment status:\ncreating an assignment leaves the incident untouched.",
         "ado"),
        ("ASSIGNED->... assignment transitions are shared with the\nresponder flow (one ALLOWED_ASSIGNMENT_TRANSITIONS map).",
         "as"),
    ],
        {"fverr": "L", "tverr": "L", "averr": "L"}),

    # ------------------------- 4.2.14 ADMIN MASTERS -------------------------
    ("Flowchart 4.2.14: Admin Masters", [
        ("start", "initial", "Start"),
        ("mods", "action", "Admin master modules: users,\nfacilities, rescue teams (+members),\nemergency contacts, unsafe reports,\nreports"),
        ("users", "action", "Users: list (name/email/phone -\npasswords never searchable); detail loads\na wide activity bundle; PATCH name /\nemail/phone/language/role/isActive"),
        ("self", "decis", "Self-protection / last-admin\nrule applies?"),
        ("selferr", "action", "Blocked 400: 'You cannot change your\nown admin role.' / 'You cannot delete\nyour own administrator account.' /\n'Cannot demote the last active admin.'"),
        ("udel", "action", "DELETE user = real deletion: cascades\nowned updates, assignments, notifications,\ncontacts, incidents, unsafe reports,\nreports, team membership"),
        ("orphan", "action", "Locations / risk assessments deleted\nonly if orphaned (still referenced\nrecords retained)"),
        ("fac", "action", "Facilities & teams: CRUD + isActive\n(gates operational / active counts);\nmembers add/remove (drives responder\nvisibility via team membership)"),
        ("cont", "action", "Emergency contacts: list all, edit,\ndelete (per-user view)"),
        ("unsafe", "action", "Unsafe reports: list, verify (PATCH\nisVerified), delete - submissions\nalways start unverified"),
        ("reports", "action", "Reports: generate, list, get, export,\ndelete"),
        ("audit", "action", "Every admin action writes AdminLogs\n(admin, target, time, requesting IP)"),
        ("fin", "final", "End"),
    ], [
        ("start", "mods", None),
        ("mods", "users", None),
        ("users", "self", None),
        ("self", "selferr", "yes"),
        ("self", "udel", "no"),
        ("selferr", "mods", None),
        ("udel", "orphan", None),
        ("orphan", "fac", None),
        ("fac", "cont", None),
        ("cont", "unsafe", None),
        ("unsafe", "reports", None),
        ("reports", "audit", None),
        ("audit", "fin", None),
    ], [
        ("Deactivation is not deletion here: DELETE /admin/users\nperforms a real cascade removal.", "udel"),
        ("Global facilities, rescue teams and other users are\npreserved during a user deletion.", "orphan"),
    ],
        {"selferr": "R"}),
]


def node_type(kind):
    return {
        "initial": "UMLInitialNode",
        "action": "UMLAction",
        "decis": "UMLDecisionNode",
        "merge": "UMLMergeNode",
        "final": "UMLActivityFinalNode",
        "flowend": "UMLFlowFinalNode",
    }[kind]


def action_size(text):
    lines = text.split("\n")
    w = min(max(150.0, max(len(line) for line in lines) * 7.4 + 44), 400.0)
    return w, max(56.0, 16 + 22 * len(lines))


COL_X = {"C": 280.0, "L": 0.0, "R": 560.0}
ROW_H = 170.0
Y0 = 90.0


def build_activity(act_name, chars, flows, notes, cols):
    act_id = gid()
    node_models = []
    node_ids = {}
    kind_by = {}
    col_by = {}
    for nid, kind, text in chars:
        nm = {
            "_type": node_type(kind), "_id": gid(),
            "_parent": {"$ref": act_id}, "name": text,
        }
        node_models.append(nm)
        node_ids[nid] = nm["_id"]
        kind_by[nid] = kind
        col_by[nid] = cols.get(nid, "C")

    edge_models = []
    edge_map = {}
    for src, dst, guard in flows:
        em = {
            "_type": "UMLControlFlow", "_id": gid(),
            "_parent": {"$ref": act_id},
            "source": {"$ref": node_ids[src]}, "target": {"$ref": node_ids[dst]},
        }
        if guard:
            em["guard"] = guard
        edge_models.append(em)
        edge_map[(src, dst)] = em["_id"]

    # depth = BFS layering from the initial node (loop back-edges never inflate)
    start = chars[0][0]
    depth = {nid: 0 for nid, _k, _t in chars}
    queue = [start]
    for cur in queue:
        for src, dst, _g in flows:
            if src == cur and depth[dst] == 0 and dst != start:
                depth[dst] = depth[cur] + 1
                queue.append(dst)
    # vertical slot per (column, depth) - stack same-depth nodes
    slot = {}
    used = {}
    for nid, _k, _t in chars:
        c = col_by[nid]
        d = depth[nid]
        i = used.get((c, d), 0)
        used[(c, d)] = i + 1
        slot[nid] = (c, d, i)
    left = {}
    width = {}
    height = {}
    for nid, _k, text in chars:
        w, h = action_size(text) if kind_by[nid] == "action" else (20.0, 20.0)
        width[nid], height[nid] = w, h
        c, d, i = slot[nid]
        left[nid] = COL_X[c] + i * 40.0
    top = {}
    for nid, _k, _t in chars:
        c, d, i = slot[nid]
        top[nid] = Y0 + d * ROW_H + i * 70.0

    diag_id = gid()
    views = []
    vid_by_nid = {}
    for nid, kind, text in chars:
        vid = gid()
        vid_by_nid[nid] = vid
        x, y = left[nid], top[nid]
        w, h = width[nid], height[nid]
        if kind == "action":
            stereo = gid(); name = gid(); ns = gid(); prop = gid(); cmp = gid()
            lbls = [
                {"_type": "LabelView", "_id": stereo, "_parent": {"$ref": cmp},
                 "font": "Arial;13;0", "left": x, "top": y, "width": 10.0, "height": 13.0,
                 "wordWrap": True, "visible": False},
                {"_type": "LabelView", "_id": name, "_parent": {"$ref": cmp},
                 "font": "Arial;13;1", "left": x + 8, "top": y + 8, "width": w - 16,
                 "height": h - 14, "wordWrap": True, "model": {"$ref": node_ids[nid]},
                 "text": text},
                {"_type": "LabelView", "_id": ns, "_parent": {"$ref": cmp},
                 "font": "Arial;13;0", "left": x, "top": y, "width": 10.0, "height": 13.0,
                 "wordWrap": True, "visible": False},
                {"_type": "LabelView", "_id": prop, "_parent": {"$ref": cmp},
                 "font": "Arial;13;0", "left": x, "top": y, "width": 10.0, "height": 13.0,
                 "wordWrap": True, "visible": False},
            ]
            ncv = {
                "_type": "UMLNameCompartmentView", "_id": cmp,
                "_parent": {"$ref": vid}, "model": {"$ref": node_ids[nid]},
                "font": "Arial;13;0", "left": x, "top": y, "width": w, "height": h,
                "subViews": lbls, "stereotypeLabel": {"$ref": stereo},
                "nameLabel": {"$ref": name}, "namespaceLabel": {"$ref": ns},
                "propertyLabel": {"$ref": prop},
            }
            views.append({
                "_type": "UMLActionView", "_id": vid,
                "_parent": {"$ref": diag_id}, "model": {"$ref": node_ids[nid]},
                "font": "Arial;13;0",
                "containerChangeable": True, "left": x, "top": y, "width": w, "height": h,
                "subViews": [ncv], "nameCompartment": {"$ref": cmp}, "wordWrap": True,
            })
        else:
            views.append({
                "_type": "UMLControlNodeView", "_id": vid,
                "_parent": {"$ref": diag_id}, "model": {"$ref": node_ids[nid]},
                "font": "Arial;13;0", "containerChangeable": True,
                "left": x, "top": y, "width": 20, "height": 20,
            })

    # ---- edge views ----
    for src, dst, guard in flows:
        ev = gid()
        sx = left[src] + width[src] / 2
        sy = top[src] + height[src] / 2
        hx = left[dst] + width[dst] / 2
        hy = top[dst] + height[dst] / 2
        sc, dc = col_by[src], col_by[dst]
        # route: same-column backward loop -> bow to the free side
        if sc == dc and hy < sy:
            side = "R" if sc != "R" else "L"
            mx = COL_X[side] + 60.0 if side == "R" else COL_X[side] + 30.0
            pts = "%s:%s;%s:%s;%s:%s;%s:%s" % (sx, sy, mx, sy, mx, hy, hx, hy)
        else:
            pts = "%s:%s;%s:%s" % (sx, sy, hx, hy)
        n1 = gid(); n2 = gid(); n3 = gid()
        name_lbl = {
            "_type": "EdgeLabelView", "_id": n1, "_parent": {"$ref": ev},
            "model": {"$ref": edge_map[(src, dst)]}, "font": "Arial;13;0",
            "left": (sx + hx) / 2, "top": (sy + hy) / 2, "height": 13,
            "alpha": 0.0, "distance": 15, "hostEdge": {"$ref": ev}, "edgePosition": 1,
        }
        if guard:
            name_lbl["visible"] = True
            name_lbl["text"] = " [" + guard + "]"
        else:
            name_lbl["visible"] = False
        views.append({
            "_type": "UMLControlFlowView", "_id": ev,
            "_parent": {"$ref": diag_id}, "model": {"$ref": edge_map[(src, dst)]},
            "subViews": [
                name_lbl,
                {"_type": "EdgeLabelView", "_id": n2, "_parent": {"$ref": ev},
                 "model": {"$ref": edge_map[(src, dst)]}, "visible": False,
                 "font": "Arial;13;0", "left": (sx + hx) / 2, "top": (sy + hy) / 2,
                 "height": 13, "alpha": 1.5707963267948966, "distance": 30,
                 "hostEdge": {"$ref": ev}, "edgePosition": 1},
                {"_type": "EdgeLabelView", "_id": n3, "_parent": {"$ref": ev},
                 "model": {"$ref": edge_map[(src, dst)]}, "visible": False,
                 "font": "Arial;13;0", "left": (sx + hx) / 2, "top": (sy + hy) / 2,
                 "height": 13, "alpha": -1.5707963267948966, "distance": 15,
                 "hostEdge": {"$ref": ev}, "edgePosition": 1},
            ],
            "font": "Arial;13;0",
            "head": {"$ref": vid_by_nid[dst]}, "tail": {"$ref": vid_by_nid[src]},
            "lineStyle": 1,
            "points": pts,
            "showVisibility": True,
            "nameLabel": {"$ref": n1},
            "stereotypeLabel": {"$ref": n2},
            "propertyLabel": {"$ref": n3},
        })

    # ---- note views + links (placed under their anchor node) ----
    for txt, anchor in notes:
        nv = gid()
        ax, ay = left[anchor], top[anchor]
        aw, ah = width[anchor], height[anchor]
        nx, ny = ax + 6, ay + ah + 14
        nl = gid()
        views.append({
            "_type": "UMLNoteView", "_id": nv, "_parent": {"$ref": diag_id},
            "font": "Arial;11;0", "left": nx, "top": ny,
            "width": 215, "height": 64, "text": txt,
        })
        views.append({
            "_type": "UMLNoteLinkView", "_id": nl, "_parent": {"$ref": diag_id},
            "font": "Arial;13;0", "head": {"$ref": vid_by_nid[anchor]},
            "tail": {"$ref": nv},
            "points": "%s:%s;%s:%s" % (nx + 12, ny, ax + aw / 2, ay + ah / 2),
        })

    diagram = {
        "_type": "UMLActivityDiagram", "_id": diag_id,
        "_parent": {"$ref": act_id}, "name": act_name,
        "ownedViews": views,
    }
    activity = {
        "_type": "UMLActivity", "_id": act_id,
        "_parent": {"$ref": MODEL_REF},
        "name": act_name,
        "nodes": node_models,
        "edges": edge_models,
        "ownedElements": [diagram],
    }
    return activity


MODEL_REF = None


def main():
    global MODEL_REF
    with open(MDJ, encoding="utf-8") as f:
        proj = json.load(f)
    model = next(x for x in proj["ownedElements"]
                 if x.get("_type") == "UMLModel" and x.get("name") == MODEL_NAME)
    MODEL_REF = model["_id"]
    new_activities = []
    for name, chars, flows, notes, cols in FLOWCHARTS:
        new_activities.append(build_activity(name, chars, flows, notes, cols))
    model["ownedElements"] = new_activities
    with open(MDJ, "w", encoding="utf-8") as f:
        json.dump(proj, f, ensure_ascii=False, indent=2)
    print("rebuilt %d flowcharts in %s" % (len(new_activities), MDJ))


if __name__ == "__main__":
    main()