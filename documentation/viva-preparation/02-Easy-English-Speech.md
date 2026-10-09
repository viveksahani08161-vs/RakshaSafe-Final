# 02 — Easy English Speech Answers

> Short, simple, ready-to-speak answers. Read once before the viva, then say them in your
> own voice. Keep each answer to 3–6 sentences.

## 1. What is your project?

RakshaSafe is an AI-powered women safety and disaster emergency response system. It is a web
application where a person can raise an emergency incident, share their live location, and
get help. The system automatically calculates how serious the incident is, shows nearby
hospitals and police stations, and alerts the user's emergency contacts. Admins and rescue
teams can then track and respond to the incident.

## 2. Why did you choose this topic?

Women safety and disaster response are real problems in India. During an emergency, people
lose time searching for helpline numbers or explaining their location. We wanted one system
that captures the incident, the location, and the risk level in a single action, and connects
the citizen to responders quickly.

## 3. What is the main AI part?

The AI part is a risk assessment engine called `raksha-risk-v1`. It takes the incident
priority, whether it is a disaster, how many verified and unverified reports are nearby, and
how many active incidents are in the area. It combines these using fixed weights and produces
a risk score from 0 to 100 and a level — Low, Medium, High, or Critical. It is rule-based, so
the results are explainable and repeatable.

## 4. Is it machine learning?

No, it is a deterministic rule-based engine, not a trained ML model. We chose this on purpose
because in an emergency the result must be transparent and reproducible. We can show exactly
why a score came out the way it did. This makes it safer and easier to defend than a black
box.

## 5. What is the role of Gemini in your project?

Gemini is optional. It only writes a friendly explanation sentence about the score, like "this
incident is critical because it is a flood with several verified reports nearby." It never
calculates the score and never writes to the database. If Gemini is not available, the system
uses its own built-in explanation and keeps working normally.

## 6. What is your technology stack?

The frontend is React 19 with TypeScript, Vite, and Tailwind CSS, and we use Leaflet for
maps. The backend is Node.js with Express and TypeScript, and we use Mongoose to talk to
MongoDB. The AI service is Python with FastAPI. So it is a three-tier architecture: frontend,
backend, and AI service.

## 7. Why did you use three separate services instead of one?

Separation of concerns. The UI team can change the frontend without touching the backend.
The risk engine is written in Python because it is a data and logic service, and it can be
scaled or updated independently. It also means if the AI service is down, the main
application still works using its fallback logic.

## 8. What database did you use and why?

MongoDB with Mongoose. Emergency data is flexible — some incidents have a location, some have
photos or extra fields, and reports have different shapes. MongoDB's document model handles
this naturally. We defined 15 collections, each with a Mongoose schema for validation.

## 9. How does a user raise an incident?

The user opens the SOS page. There is a simple four-step flow: fill the incident details,
capture the location, review everything, and submit. The app asks the browser for GPS
permission; if the user denies it, we honestly show "location denied" and let them search an
address manually instead. We never make up a location.

## 10. What happens after the incident is submitted?

The backend saves the incident in MongoDB, records the location, and calls the risk engine to
get a score. It records notification events — an in-app notification for the user and
notification records for each opted emergency contact. Then the incident appears on the
user's dashboard and in the admin dashboard for tracking.

## 11. How does the risk scoring work?

Each priority level has a base score: Low is 15, Medium is 35, High is 60, and Critical is
80. If it is a disaster, we add 5. Each verified nearby report adds 6, up to a maximum of 30.
Each unverified report adds 2, up to 10. Active incidents nearby add 3 each, up to 15. The
total is clamped between 0 and 100. Below 25 is Low, below 50 is Medium, below 75 is High, and
75 or above is Critical.

## 12. What is the incident status workflow?

An incident starts as REPORTED. It then moves to ACKNOWLEDGED, then ASSIGNED to a rescue
team, then IN_PROGRESS, then RESOLVED, and finally CLOSED. At any point it can be CANCELLED.
Every status change is recorded with a timestamp and who made the change.

## 13. What are the user roles?

There are three roles. USER is a normal citizen who raises incidents. ADMIN manages users,
teams, facilities, reports, and assignments, and sees the dashboard. RESPONDER is a field
team member who sees only their own team's assignments and updates the rescue status.

## 14. How is security handled?

Passwords are hashed with bcrypt using 12 salt rounds, and they are never stored or returned
in plain text. After login we issue a JSON Web Token that contains only the user id and role.
Protected routes verify the token and re-check the user in the database. Admin and responder
routes also check the role and the database connection.

## 15. How do you stop abuse of the API?

We have a lightweight in-memory rate limiter. For example, creating incidents is limited to
10 requests per minute per IP, and unsafe reports have the same limit. There is also a
`requireDb` middleware that returns a clean 503 error instead of letting requests hang when
MongoDB is down.

## 16. What external services do you use?

OpenStreetMap Nominatim for address search and reverse geocoding, Overpass API for finding
nearby hospitals and police stations, Open-Meteo for weather (no API key needed), and
optionally Google Gemini for explanations. OSM discovery results are never stored in our
database.

## 17. How do you handle failures of external services?

Gracefully. If weather is unavailable, the app shows "Weather unavailable" and the incident
still works. If the OSM lookup fails, the nearby route returns a controlled 502. If the AI
service is unreachable, the backend uses its own fallback risk calculation. Nothing external
is allowed to break the core SOS flow.

## 18. What is the admin dashboard?

It is a live dashboard built from MongoDB aggregation queries. It shows user counts, incident
counts by status, priority, and type, recent incidents, rescue team status, assignment
status, facility status, report verification, risk level distribution, notification statuses,
and recent admin activity. Every number comes from live data — nothing is hard-coded.

## 19. What is the responder panel?

Responders are rescue team members. Their panel shows only assignments for teams they belong
to, and the incident details for those assignments. They can move an assignment through
states like ASSIGNED, EN_ROUTE, ON_SCENE, and COMPLETED. This is scoped by the token, so a
responder can never see another team's data.

## 20. What is the unsafe area report feature?

It lets users report unsafe locations, for example a poorly lit street or a dangerous
crossing. Reports have a category and severity and can be verified by admins. Verified reports
increase the risk score of nearby incidents, so community input directly improves safety.

## 21. How did you test the project?

At five levels: unit testing, integration testing, API functional testing, end-to-end browser
testing, and manual testing. The unit tests are 36 suites with 127 checks, all passing. The
integration tests are 67 cases. The live API functional tests are 101 cases across 27 modules,
all passing. The browser end-to-end tests cover 16 journeys; 15 passed and one found a layout
defect that we recorded.

## 22. What defect did you find in testing?

In journey T14, the browser test found a layout defect labelled D1. We are honest about it in
the test evidence. It is a display issue, not a functional failure, and it is documented
rather than hidden.

## 23. Why is testing important in your project?

Because it is a safety system. If the risk score is wrong or an incident is lost, someone
could be in danger. Testing proves that the core flows — register, login, raise incident,
assess risk, notify, assign — actually work under both normal and failure conditions.

## 24. What are the limitations of your project?

SMS and Email delivery are not configured because there is no paid provider. The AI is
rule-based rather than a trained model. It is designed mainly for a single-instance
deployment because the rate limiter is in memory. And the map data depends on
OpenStreetMap's availability.

## 25. What is your future scope?

We can integrate real SMS and Email providers, add real-time WebSocket updates, train a
machine learning model once we have enough real incident data, add offline support for low
network areas, add more Indian languages, and add wearables or a shake-to-SOS feature. We
can also add a mobile app using our existing Capacitor setup.

## 26. Why React and TypeScript?

React gives us reusable components and fast UI updates, which matters during an emergency.
TypeScript catches type errors at compile time, so there are fewer runtime bugs. Together they
give a component-based, type-safe frontend.

## 27. Why Express for the backend?

Express is lightweight, widely used, and easy to structure with routes, controllers, models,
middleware, and services. It lets us keep clean separation between the HTTP layer and the
business logic, and it works well with the Node.js ecosystem.

## 28. Why FastAPI for the AI service?

FastAPI is fast, has automatic request validation with Pydantic, and is built for Python data
services. Python is the natural language for scoring logic and for calling AI libraries like
Gemini later. It also gives us automatic interactive API documentation.

## 29. What did you learn from this project?

We learned full-stack development, how to design a REST API, how to model data in MongoDB,
how to write a secure authentication system, how to integrate third-party APIs, and how to
build an explainable scoring engine. We also learned to test systems honestly, including
testing failure cases like a down database or a down AI service.

## 30. What is unique about your project?

Three things. First, an explainable deterministic risk engine instead of a black-box model.
Second, honest engineering — the app never fakes a location or a sent message. Third, a
complete three-tier system with real role separation between users, admins, and responders,
integrated with live map, weather, and geocoding services.
