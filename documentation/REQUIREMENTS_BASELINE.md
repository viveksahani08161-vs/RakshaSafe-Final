# RakshaSafe — Requirements Baseline

**Project:** RakshaSafe – AI-Powered Women Safety and Disaster Emergency Response System
**Baseline source of truth:**
- `CHAPTER_2_UPDATED.pdf` (Chapter 2 — Survey of Technology)
- `chapter_3_update_new.pdf` (Chapter 3 — Requirement and Analysis)

This document is an extraction of the FINAL project documents. It is the authoritative baseline for all future application development. **Do not modify the source PDF documents.**

---

## 1. Project Purpose

Raksha is a centralized, web-based **Women Safety and Disaster Management System**. It allows registered users to create emergency incidents (SOS requests), share location when available, and access organized emergency-resource information. Administrators monitor incidents, update statuses, assign rescue resources, and maintain structured records (users, incidents, locations, notifications, facilities, rescue teams, risk data, reports).

The system is a **web application** (React-based), not a native mobile app.

## 2. Scope

In scope:
- SOS / emergency incident creation and management
- Location processing and association with incidents
- Emergency facility records (hospitals, shelters, police/fire stations, relief centres)
- Registered rescue-team records and rescue assignments
- Incident status workflow and chronological incident history
- Notification management (in-app, email, SMS, WhatsApp when configured)
- Unsafe-area reporting and verification
- Risk-zone management and risk assessment (AI service)
- Administrative dashboard, analytics, reports
- Role-based access control (User / Administrator)
- Administrative activity logging
- Configurable external providers (communication, maps, AI)

Out of scope (explicit system limitations — Raksha does NOT claim to provide):
- Automatic police FIR registration
- Guaranteed police / ambulance / rescue-team response
- Exact rescue ETA
- Guaranteed 24×7 emergency response
- Real-time hospital bed availability (unless connected to a reliable source)
- Offline emergency communication (unless specifically implemented)
- Physical response coordination — assignment/status features are **software-based record management only**

## 3. Functional Requirements

1. User registration and login
2. User authentication
3. Role-based authorization
4. User profile management
5. Emergency contact management
6. SOS and incident creation
7. Incident information management
8. Location processing
9. Emergency facility management
10. Rescue-team management
11. Rescue assignment management
12. Incident status management
13. Notification management
14. Incident history management
15. Unsafe-area reporting
16. Risk-zone management
17. Risk assessment
18. Administrative dashboard
19. Analytics and reporting
20. Resource search and filtering
21. Administrative activity logging
22. Secure access to protected information

## 4. Non-Functional Requirements

1. **Security** — protect user accounts, passwords, incidents, location, emergency contacts, administrative and risk-related information. JWT-based authorization and secure password hashing (bcrypt).
2. **Performance** — reasonable response time for login, SOS submission, resource search, dashboard loading, status update, notification creation.
3. **Usability** — simple interface with clear labels: SOS/Emergency, Submit Request, View Status, Find Hospital, Find Shelter, Emergency Contacts, Admin Dashboard.
4. **Responsiveness** — works on desktop, laptop, tablet, mobile; interface adjusts to screen size.
5. **Reliability** — incident persists after successful submission; failed external services must not corrupt the incident record.
6. **Scalability** — accommodate additional users, incidents, resources, and admin records without a complete redesign.
7. **Maintainability** — modular structure: Authentication, User Management, SOS/Incident Management, Location, Facilities, Rescue Teams, Notifications, Risk Assessment, Administration, Analytics.
8. **Compatibility** — works with commonly used modern browsers.
9. **Data Integrity** — accurate relationships between records; e.g., an incident references a valid user and an available location where applicable.
10. **Availability** — application available while hosting, database, network, and required external services are operational.

## 5. User Role

A User can:
- Register, login, logout
- Manage profile and account information
- Manage emergency contacts
- Create SOS / emergency incidents (select incident type, enter description)
- Share location where available
- View own incidents, incident status, and incident history
- View notifications
- Search / filter emergency resources (hospitals, shelters, etc.)
- View relevant risk information where provided
- Submit unsafe-area reports

## 6. Administrator Role

An Administrator can:
- Login securely
- View all emergency incidents, incident details, and available locations
- Update incident status
- Manage facilities
- Manage rescue-team records
- Create and manage rescue assignments
- Review and verify unsafe-area reports
- Manage risk-zone information
- View dashboard statistics
- Generate reports
- Monitor administrative activity
- View analytics (full access vs. limited for users)

## 7. Module List

| Module | Description |
|---|---|
| Authentication | Registration, login, logout, JWT token-based access |
| User Management | Profile and account management |
| SOS / Incident Management | Incident creation, status, monitoring |
| Location | Geolocation capture and association with incidents/resources |
| Facilities | Hospital, shelter, police/fire station, relief centre records |
| Rescue Teams | Registered response-team records |
| Rescue Assignments | Incident-to-team assignment records |
| Notifications | In-app/Email/SMS/WhatsApp delivery tracking |
| Risk Assessment | Python/FastAPI AI service, risk score/level |
| Administration | Dashboard, reports, activity logs, unsafe-area/risk-zone review |
| Analytics | Statistics and report generation |

## 8. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js |
| Frontend Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Backend Runtime | Node.js |
| Backend Framework | Express.js |
| API Architecture | REST API |
| AI Backend | Python |
| AI Framework | FastAPI |
| AI Integration | Configured AI Service API (separate layer) |
| Database | MongoDB (Mongoose ODM) |
| Authentication | JSON Web Token (JWT) |
| Password Security | bcrypt (secure hashing) |
| Location | Browser/Device Geolocation API |
| Maps | Configured Map Service (OpenStreetMap + Leaflet.js) |
| Communication | Configured Email / SMS / WhatsApp providers |
| Dev Environment | Visual Studio Code, Bolt |
| Version Control | Git, GitHub |
| Testing | Jest / Supertest (where implemented) |
| Deployment | Configured Cloud Hosting Environment |

## 9. Frontend Architecture

- Web-based **SPA** in **React.js + TypeScript**, built with **Vite**, styled with **Tailwind CSS**.
- Multiple screens/modules: login, user profile, SOS/incident management, emergency contacts, emergency resources, notifications, risk information, admin dashboard, reports.
- Reusable components; TypeScript type safety for maintainability.
- Fully responsive (desktop, laptop, tablet, mobile).
- Communicates with the backend REST API; maps rendered with Leaflet.js over OpenStreetMap (where configured).

## 10. Backend Architecture

- **Node.js + Express.js** REST API layer between frontend and MongoDB.
- Handles application requests, database communication, user authentication, and all system modules.
- References between documents maintained at application level using **Mongoose** schemas/validation (MongoDB has no relational FKs).
- Backend keeps data processing secure and consistent.

## 11. AI Architecture

- **Python + FastAPI** service, kept **separate** from the Node.js backend.
- Connected to the main backend through an API when required (`Configured AI Service API`).
- Used for **risk assessment**: processes incident and location-related factors and produces:
  - Risk score (range 0–100)
  - Risk level: LOW / MEDIUM / HIGH / CRITICAL
  - Model version
  - Input factors
  - Assessment time
- Result is **decision support only** — not a guaranteed prediction and does not replace professional emergency assessment.
- Separation makes AI functionality independently modifiable/extensible.

## 12. Authentication / Security Requirements

- Users register and log in; credentials validated.
- Passwords **never stored in plain text**; securely hashed with bcrypt.
- Role of logged-in account identified (USER / ADMIN).
- Unauthorized users cannot access administrator functions.
- Protected API operations require proper authorization; secure **token-based access (JWT)**.
- Users can log out.
- Only required personal information is collected.
- Sensitive data protected: accounts, passwords, incidents, locations, contacts, admin info, risk info.
- Admin logs accessible only to authorized administrators.

## 13. Location / Map Requirements

- Uses **Browser/Device Geolocation API**; permission requested where required.
- Captures when available: latitude, longitude, address/label, city, state, country, accuracy, capture time.
- Location associated with the relevant incident.
- **Unavailable location is handled gracefully — no false location is ever assumed.**
- Location data access is restricted to authorized users/functions.
- Maps: **OpenStreetMap** data source with **Leaflet.js** display of incident locations and risk zones on the admin interface (depends on configured map service availability).

## 14. Communication Requirements

- Notifications for: incident creation, acknowledgement, assignment, status change, resolution, cancellation, system updates.
- Channels: **In-app, Email, SMS, WhatsApp** — depending on configured providers.
- Delivery depends on provider availability and configuration; failures are handled without corrupting incident records.
- Provider responses recorded on the notification record.

## 15. MongoDB Collections (15)

| # | Collection | Purpose |
|---|---|---|
| 1 | `Users` | User accounts and profile info |
| 2 | `EmergencyContacts` | User emergency contacts |
| 3 | `Incidents` | SOS and emergency incident records |
| 4 | `Locations` | Geographic location information |
| 5 | `Notifications` | Notification records and delivery status |
| 6 | `RescueTeams` | Registered response-team information |
| 7 | `RescueAssignments` | Incident-to-team assignment records |
| 8 | `IncidentUpdates` | Incident history and status updates |
| 9 | `UnsafeAreaReports` | User-submitted unsafe-area reports |
| 10 | `RiskZones` | Structured risk-zone information |
| 11 | `RiskAssessments` | Risk scores and assessment results |
| 12 | `Facilities` | Hospitals, shelters, police/fire stations, relief centres |
| 13 | `DisasterCategories` | Emergency/disaster categories |
| 14 | `AdminLogs` | Administrative activity records |
| 15 | `Reports` | Generated reports and analytics records |

## 16. Database Fields and Relationships

Relationships are maintained as **ObjectId references at the application level** (Mongoose), not relational foreign keys. All critical data integrity is enforced by Mongoose schemas/validation.

### 1) Users
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `name` | String | Required |
| `email` | String | Required, Unique |
| `phone` | String | Required, Unique |
| `passwordHash` | String | Required, Hashed |
| `role` | String | Required, Enum: USER / ADMIN |
| `language` | String | Optional |
| `createdAt` | Date | Auto |
| `updatedAt` | Date | Auto |

### 2) EmergencyContacts
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `userId` | ObjectId | Ref → Users |
| `name` | String | Required |
| `phone` | String | Required |
| `email` | String | Optional |
| `relationship` | String | Optional |
| `notifyViaSms` | Boolean | Required |
| `notifyViaEmail` | Boolean | Required |
| `createdAt` / `updatedAt` | Date | Auto |

### 3) Incidents
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `userId` | ObjectId | Ref → Users |
| `type` | String | Required, Safety / Disaster |
| `category` | String | Required |
| `description` | String | Required |
| `priority` | String | Required, LOW / MEDIUM / HIGH / CRITICAL |
| `status` | String | Required, Enum (workflow) |
| `locationId` | ObjectId | Ref → Locations, Optional |
| `createdAt` | Date | Auto |
| `resolvedAt` | Date | Optional |

### 4) Locations
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `latitude` | Number | Required |
| `longitude` | Number | Required |
| `address` | String | Optional |
| `city` | String | Optional |
| `state` | String | Optional |
| `country` | String | Optional |
| `accuracy` | Number | Optional |
| `createdAt` / `updatedAt` | Date | Auto |

### 5) Notifications
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `incidentId` | ObjectId | Ref → Incidents |
| `contactId` | ObjectId | Ref → EmergencyContacts, Optional |
| `channel` | String | Required, Email / SMS / WhatsApp / In-App |
| `status` | String | Required, Enum (see §20) |
| `providerResponse` | String | Optional |
| `attemptCount` | Number | Required |
| `lastAttemptAt` | Date | Optional |
| `createdAt` / `updatedAt` | Date | Auto |

### 6) RescueTeams
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `name` | String | Required |
| `teamType` | String | Required, Police / Medical / Fire / NGO / Volunteer |
| `phone` | String | Required |
| `email` | String | Optional |
| `isActive` | Boolean | Required |
| `specializations` | Array | Optional |
| `serviceArea` | String | (documented in Ch.3 §3.4.1.8) |
| `createdAt` / `updatedAt` | Date | Auto |

### 7) RescueAssignments
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `incidentId` | ObjectId | Ref → Incidents |
| `teamId` | ObjectId | Ref → RescueTeams |
| `assignedBy` | ObjectId | Ref → Users |
| `assignedAt` | Date | Auto |
| `status` | String | Required, Enum (see §19) |
| `notes` | String | Optional |
| `createdAt` / `updatedAt` | Date | Auto |

### 8) IncidentUpdates
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `incidentId` | ObjectId | Ref → Incidents |
| `updatedBy` | ObjectId | Ref → Users |
| `statusFrom` | String | Optional |
| `statusTo` | String | Required |
| `comment` | String | Optional |
| `createdAt` | Date | Auto |

### 9) UnsafeAreaReports
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `reportedBy` | ObjectId | Ref → Users |
| `locationId` | ObjectId | Ref → Locations |
| `category` | String | Required |
| `description` | String | Required |
| `severity` | String | Required |
| `isVerified` | Boolean | Required |
| `createdAt` / `updatedAt` | Date | Auto |

### 10) RiskZones
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `name` | String | Required |
| `riskLevel` | String | Required |
| `geometry` | Object | Required (geographic boundary) |
| `factors` | Array | Optional |
| `lastAssessedAt` | Date | Optional |
| `isActive` | Boolean | Required |
| `createdAt` / `updatedAt` | Date | Auto |

### 11) RiskAssessments
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `locationId` | ObjectId | Ref → Locations |
| `riskScore` | Number | Required, range 0–100 |
| `riskLevel` | String | Required, LOW / MEDIUM / HIGH / CRITICAL |
| `modelVersion` | String | Required |
| `inputFactors` | Array | Optional |
| `assessedAt` | Date | Auto |
| `createdAt` | Date | Auto |

### 12) Facilities
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `name` | String | Required |
| `facilityType` | String | Required, Hospital / Shelter / Police Station / Fire Station / Relief Centre |
| `locationId` | ObjectId | Ref → Locations |
| `phone` | String | Required |
| `capacity` | Number | Optional |
| `isOperational` | Boolean | Required |
| `operatingHours` | String | Optional |
| `createdAt` / `updatedAt` | Date | Auto |

### 13) DisasterCategories
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `name` | String | Required |
| `code` | String | Required, Unique |
| `description` | String | Optional |
| `defaultPriority` | String | Required |
| `requiresResponseTeam` | Boolean | Required |
| `isActive` | Boolean | Required |
| `createdAt` / `updatedAt` | Date | Auto |

### 14) AdminLogs
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `adminId` | ObjectId | Ref → Users |
| `action` | String | Required |
| `targetType` | String | Required |
| `targetId` | ObjectId | Optional |
| `details` | String | Optional |
| `ipAddress` | String | Optional |
| `createdAt` | Date | Auto |

### 15) Reports
| Field | Type | Constraint |
|---|---|---|
| `_id` | ObjectId | PK, auto-generated |
| `generatedBy` | ObjectId | Ref → Users |
| `title` | String | Required |
| `reportType` | String | Required |
| `filters` | Object | Optional |
| `dataSnapshot` | Object | Optional |
| `format` | String | Required, PDF / CSV / JSON |
| `createdAt` | Date | Auto |
| `expiresAt` | Date | Optional |

## 17. Incident Types

Incident **examples** (Ch.3 §3.4.1.5): Women Safety, Medical Emergency, Accident, Fire, Flood, Earthquake, Other Emergency.

Incident `type` field: **Safety / Disaster**.

Categories are administratively maintained via the **DisasterCategories** collection (name, code, description, default priority, response-team requirement, active status), so categories can be extended without restructuring the application.

## 18. Incident Status Workflow

```
REPORTED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
```
An incident may also be marked **CANCELLED** where applicable.

- Every status change is stored as an **IncidentUpdate** record and can generate a notification.
- Incident history records: creation, status change, assignment, progress update, resolution, closure, cancellation, administrative comments.

## 19. Rescue Assignment Workflow

Administrators create a software-based assignment between an **Incident** and a registered **RescueTeam**:

```
ASSIGNED → EN_ROUTE → ON_SCENE → COMPLETED
```
Also allowed: **CANCELLED**.

Assignment record: `incidentId`, `teamId`, `assignedBy`, `assignedAt`, `status`, `notes`. These statuses represent information recorded in the app **only** — not guaranteed physical movement or response.

## 20. Notification Statuses

`QUEUED` | `SENT` | `DELIVERED` | `FAILED` | `NOT_CONFIGURED` | `UNAVAILABLE`

Recorded per notification: incident ID, contact ID, channel, status, provider response, attempt count, last attempt time, created date.

## 21. Risk Assessment Requirements

- Python + FastAPI service, configurable AI service integration.
- Produces: risk score (0–100), risk level (LOW/MEDIUM/HIGH/CRITICAL), model version, input factors, assessment time.
- Stored in `RiskAssessments` (ties to `Locations`).
- Decision-support only; not a guaranteed prediction.

## 22. Unsafe-Area Reporting

- Users submit reports: reporter, location, category, description, severity.
- **Not automatically treated as a confirmed dangerous location** until reviewed.
- Administrators review and verify reports (`isVerified`).
- Report data feeds analytics (unsafe-area report counts, risk-level distribution).

## 23. Risk Zones

- Structured records: name, risk level, geographic boundary (geometry object), risk factors, last assessment date, active status.
- Managed only by administrators.
- Displayable on the map interface (Leaflet/OpenStreetMap where configured).
- Users may view relevant risk information where provided.

## 24. Admin Dashboard

Displayed from **actual stored data**:
- Total users, total incidents
- Incidents by status: reported, acknowledged, assigned, in-progress, resolved, closed, cancelled
- Active incidents, recent incidents, incident categories, priority information
- Available facilities, registered rescue teams
- Recent activities, notifications
- Basic statistics

## 25. Analytics

Generated from stored data (not presented as future predictions):
- Number of incidents
- Incidents by type
- Incidents by priority
- Incidents by status
- Monthly incident count
- Number of facilities / shelters
- Number of registered rescue teams
- Unsafe-area reports
- Risk-level distribution

## 26. Reports

- Admin-generated, stored in the `Reports` collection.
- Report record: generated by, title, report type, filters, data snapshot, format (**PDF / CSV / JSON**), created at, optional expiry.
- The application also stores structured data that supports report generation across modules.

## 27. Administrative Logging

- Every administrative action logged: admin ID, action, target type, target ID, action details, IP address (where collected), date/time.
- Logs accessible **only to authorized administrators**.
- Dashboard can monitor recent administrative/system activity.

## 28. System Constraints

1. Internet connectivity required for normal web functionality.
2. Location functionality depends on browser/device permission.
3. Location accuracy depends on device and available location services.
4. Map functionality depends on the configured map service.
5. External email, SMS, WhatsApp services depend on provider availability/configuration.
6. Database availability affects application functionality.
7. Hosting performance affects response time.
8. Unauthorized users must not access protected information.
9. Location information must be protected.
10. Emergency response cannot be guaranteed by the software.
11. Automatic police FIR generation is not assumed.
12. Exact rescue ETA is not assumed.
13. 24×7 police/ambulance integration is not assumed unless implemented.
14. Real-time hospital bed availability is not assumed (unless connected to a reliable source).
15. Offline emergency functionality is not assumed (unless specifically implemented).
16. Risk assessment results are software-generated decision support, not guaranteed predictions.
17. Notification delivery depends on configured external communication providers.

### Hardware Requirements (development baseline)

- Processor: Intel Core i5 / AMD Ryzen 5 or equivalent
- RAM: minimum 8 GB
- Storage: minimum 256 GB SSD
- Display: 1080p or higher recommended
- Network: stable internet connection
- Development device: normal laptop/desktop
- Mobile: smartphone with location capability (recommended)

## 29. External Service Dependencies

| Dependency | Purpose | Failure Behavior |
|---|---|---|
| Configured Email / SMS / WhatsApp providers | Notification delivery | Notifications recorded as `FAILED`/`UNAVAILABLE`; incident record unaffected |
| Configured map service (e.g., OpenStreetMap + Leaflet) | Map display of incidents/risk zones/resources | App functions without map where not configured |
| Configured AI service API (Python/FastAPI) | Risk assessment | Risk assessment unavailable without service; core app unaffected |
| Browser/Device Geolocation API | Location capture | Unavailable location → no false location stored |
| MongoDB database | All data storage | DB availability affects application functionality |

## 30. Optional / Future Features (from tech survey)

- **Voice-based emergency interaction** (speech recognition) as alternative SOS input — not required in core app.
- **Automated translation / multilingual support** (e.g., Google Translate) via configured external service.
- **ML-based intelligent alert analysis** (Decision Tree / Random Forest) to reduce false/accidental alerts.
- Real-time facility availability — only if connected to a reliable maintained source.

---

## Testing & Verification

- Backend tested with **Jest / Supertest** (where implemented).
- Reliability: incident persists after successful submission; external service failures must not corrupt incident records.
- Compatibility: modern browsers; responsive across device sizes.

*Generated from the final project documents. Approved on <approval date>.*