# 📖 RakshaSafe - Project Page Reference

> **Last Updated**: September 2025  
> **Repository**: `viveksahani08161-vs/RakshaSafe-Final`  
> **Branch**: `main`  
> **Tech Stack**: React + TypeScript + Vite + Tailwind CSS + Hash-based Routing

---

## 📋 Table of Contents

| Section | Pages |
|---------|-------|
| [Public / Auth Pages](#-public--auth-pages) | Login, Register |
| [User Dashboard & Features](#-user-dashboard--features) | Dashboard, SOS, Contacts, Resources, Profile, Emergency Contacts, Notifications, Incident Detail, Unsafe Reports |
| [Responder Dashboard](#-responder-dashboard) | Responder Dashboard, Incident Detail, Assignments |
| [Admin Panel](#-admin-panel) | Dashboard, Users, Incidents, Facilities, Teams, Unsafe Reports, Reports, Emergency Contacts, Teams Members |

---

## 🔐 Public / Auth Pages

| Page | Route | File | Description |
|------|-------|------|-------------|
| **Login** | `#/login` | `LoginPage.tsx` | Split-screen login with split-screen design, Google OAuth (disabled), email/phone + password, show/hide password, remember me, sign-up link |
| **Register** | `#/register` | `RegisterPage.tsx` | Account creation with name, email, phone, password, confirm password, validation, terms acceptance |

---

## 👤 User Dashboard & Features

| Page | Route | File | Description |
|------|-------|------|-------------|
| **Dashboard** | `#/dashboard` | `DashboardPage.tsx` | Welcome banner, SOS button, quick stats, emergency helplines, quick actions, nearby resources, recent incidents, recent contacts |
| **SOS** | `#/sos` | `SosPage.tsx` | Multi-step SOS flow: incident type → category → description → priority → location (GPS/manual) → review → submit |
| **Emergency Contacts** | `#/contacts` | `EmergencyContactsPage.tsx` | Add/edit/delete emergency contacts, SMS/email alerts, relationship field |
| **Resources** | `#/resources` | `ResourcesPage.tsx` | Nearby facilities (hospitals, fire stations, police, shelters), rescue teams, search/filter, GPS/manual location, OpenStreetMap directions |
| **Profile** | `#/profile` | `ProfilePage.tsx` | View/edit name, email, phone, language preference, password change, account deletion |
| **Emergency Contacts (User)** | `#/emergency-contacts` | `EmergencyContactsPage.tsx` | Manage personal emergency contacts (same as admin but user-scoped) |
| **Notifications** | `#/notifications` | `NotificationsPage.tsx` | List of incident updates, status changes, assignments, mark as read |
| **Incident Detail (User)** | `#/incident-detail` | `IncidentDetailPage.tsx` | View own incident: type, category, priority, status, location, description, timeline, assignments, risk assessments, nearby resources |
| **Report Unsafe** | `#/report-unsafe` | `UnsafeReportsPage.tsx` | Submit unsafe area report with category, severity, description, GPS location, optional photo |

---

## 🚑 Responder Dashboard

| Page | Route | File | Description |
|------|-------|------|-------------|
| **Responder Dashboard** | `#/responder` | `ResponderDashboardPage.tsx` | Assigned incidents list, active count, quick stats, notifications, quick actions |
| **Incident Detail (Responder)** | `#/responder/incidents/:id` | `ResponderDashboardPage.tsx` + `IncidentDetailPage.tsx` | View assigned incident details, update assignment status (ASSIGNED → EN_ROUTE → ON_SCENE → COMPLETED/CANCELLED), view incident timeline, location, nearby resources |

---

## 🛡️ Admin Panel

### Core Admin Routes

| Page | Route | File | Description |
|------|-------|------|-------------|
| **Admin Dashboard** | `#/admin/dashboard` | `AdminDashboardPage.tsx` | Overview cards (users, incidents, teams, facilities, unsafe reports), incident status breakdown, recent activity |
| **Users Management** | `#/admin/users` | `AdminUsersPage.tsx` | Paginated user list, search, filter by role/status, edit user (name, email, phone, role, status), view details, delete (with safeguards), deactivate/activate |
| **User Detail** | `#/admin/users/:id` | `AdminUserDetailPage.tsx` | Full user profile: profile info, incidents (with status), assignments, history, risk assessments, notifications, unsafe reports, emergency contacts |
| **Incidents Management** | `#/admin/incidents` | `AdminIncidentsPage.tsx` | All incidents list, search/filter (type, status, priority), pagination, view details, assign teams, update status |
| **Incident Detail (Admin)** | `#/admin/incidents/:id` | `AdminIncidentDetailPage.tsx` | Full incident view: details, location, reporter, assignments, timeline, risk assessments, nearby resources, status update |
| **Facilities Management** | `#/admin/facilities` | `AdminFacilitiesPage.tsx` | CRUD for facilities (hospitals, shelters, police, fire, relief), search, filter by type/status, location picker, capacity, hours |
| **Rescue Teams** | `#/admin/teams` | `AdminTeamsPage.tsx` | Team CRUD, member management (add/remove responders), team types, status toggle |
| **Team Members** | `#/admin/teams/:id/members` | `AdminTeamsPage.tsx` (modal) | Add/remove responders, view member details (name, email, phone, role) |
| **Unsafe Reports** | `#/admin/unsafe-reports` | `AdminUnsafeReportsPage.tsx` | Review user-submitted unsafe reports, verify/unverify, search/filter, view details with location |
| **Reports** | `#/admin/reports` | `ReportsPage.tsx` | Generate reports: Incident Summary, Resource Summary, Safety Overview (PDF/CSV/JSON export) |
| **Emergency Contacts (Admin)** | `#/admin/emergency-contacts` | `AdminEmergencyContactsPage.tsx` | View all user emergency contacts, search/filter, edit/delete |

---

## 🔗 Route Map (Hash-based Routing)

```
#/login                          → LoginPage
#/register                       → RegisterPage
#/dashboard                      → DashboardPage
#/sos                            → SosPage
#/contacts                       → EmergencyContactsPage
#/resources                      → ResourcesPage
#/profile                        → ProfilePage
#/emergency-contacts             → EmergencyContactsPage (user-scoped)
#/notifications                  → NotificationsPage
#/incident-detail                → IncidentDetailPage (user view)
#/report-unsafe                  → UnsafeReportsPage (submit)
#/responder                      → ResponderDashboardPage
#/responder/incidents/:id        → IncidentDetailPage (responder view)
#/admin/dashboard                → AdminDashboardPage
#/admin/users                    → AdminUsersPage
#/admin/users/:id                → AdminUserDetailPage
#/admin/incidents                → AdminIncidentsPage
#/admin/incidents/:id            → AdminIncidentDetailPage
#/admin/facilities               → AdminFacilitiesPage
#/admin/teams                    → AdminTeamsPage
#/admin/teams/:id/members        → (modal in AdminTeamsPage)
#/admin/incidents                → AdminIncidentsPage
#/admin/incidents/:id            → AdminIncidentDetailPage
#/admin/facilities               → AdminFacilitiesPage
#/admin/teams                    → AdminTeamsPage
#/admin/teams/:id/members        → (modal)
#/admin/unsafe-reports           → AdminUnsafeReportsPage
#/admin/reports                  → ReportsPage
#/admin/emergency-contacts       → AdminEmergencyContactsPage
```

---

## 🔐 Authentication & RBAC

| Role | Access Level |
|------|--------------|
| **USER** | Dashboard, SOS, Contacts, Resources, Profile, Emergency Contacts, Notifications, Incident Detail, Report Unsafe |
| **RESPONDER** | Responder Dashboard, Responder Incident Detail, Assignments |
| **ADMIN** | All User features + Admin Dashboard, Users, Incidents, Facilities, Teams, Unsafe Reports, Reports, Emergency Contacts |

### Auth Flow
- **JWT-based** authentication with `rakshasafe.token` in localStorage
- **Role-based redirects**: USER→`/dashboard`, ADMIN→`/admin/dashboard`, RESPONDER→`/responder`
- **Route guards**: `RequireAuth`, `RequireAdmin`, `RequireResponder` components
- **Auto-redirect**: Unauthenticated → `/login`, unauthorized role → appropriate dashboard

---

## 🧩 Key Components Reused

| Component | Path | Used In |
|-----------|------|---------|
| `AuthBrand` | `components/auth/AuthBrand.tsx` | Login, Register, Footer |
| `Logo` | `components/ui/Logo.tsx` | Header, Footer, Login, Register |
| `Navbar` | `components/layout/Navbar.tsx` | Admin pages (user/responder nav) |
| `Header` | `components/layout/Header.tsx` | User pages (Logo, notifications, language, profile menu) |
| `Sidebar` | `components/layout/Sidebar.tsx` | Admin pages (navigation) |
| `AppShell` | `components/layout/AppShell.tsx` | Admin layout wrapper |
| `AuthProvider` | `lib/AuthProvider.tsx` | Auth state, login/register/logout, token management |
| `useAuth` | `lib/auth-context.tsx` | Hook for user state, login, logout, register, updateProfile |
| `api` | `lib/api.ts` | Authenticated fetch wrapper (Bearer token) |
| `Hash Router` | `lib/hash-route.ts` | Client-side hash routing (`#/route`) |

---

## 🎨 Design System

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| **Primary** | `#D4A017` (Gold 500) | `#E5B84B` (Gold 400) | Primary buttons, active nav, accents |
| **Secondary** | `#0EA5E9` (Sky 500) | `#38BDF8` (Sky 400) | Secondary buttons, info elements |
| **Background** | `#FFFDF5` (Cream 50) | `#161311` (Ink 950) | Page backgrounds |
| **Surface** | `#FFFFFF` (White) | `#1C1A19` (Ink 900) | Cards, modals, cards |
| **Text Primary** | `#111827` (Ink 950) | `#F5F4F2` (Ink 50) | Primary text |
| **Text Muted** | `#78716C` (Ink 500) | `#A09A93` (Ink 400) | Secondary text |
| **Danger** | `#F43F5E` (Rose 500) | `#F87171` (Rose 400) | Delete, errors, critical actions |
| **Success** | `#10B981` (Emerald 500) | `#34D399` (Emerald 400) | Success states, active status |
| **Warning** | `#F59E0B` (Amber 500) | `#FBBF24` (Amber 400) | Warnings, pending states |

### Border Radius Scale
| Size | Value |
|------|-------|
| `rounded-xl` | `0.75rem` (12px) - Cards, modals, buttons |
| `rounded-2xl` | `1rem` (16px) - Large cards, modals |
| `rounded-lg` | `0.5rem` (8px) - Buttons, inputs |
| `rounded-full` | `9999px` - Badges, avatars |

---

## 🌐 Internationalization (i18n)

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Complete |
| Hindi | `hi` | ✅ Complete |

**Dictionary**: `frontend/src/lib/i18n/dictionary.ts`  
**Keys**: ~1,700 keys (EN+HI)  
**Usage**: `const { t } = useI18n(); t('key.path')`

---

## 🗺️ Navigation Reference (Quick Links)

### User Pages
- [Login](#/login) | [Register](#/register) | [Dashboard](#/dashboard) | [SOS](#/sos)
- [Contacts](#/contacts) | [Resources](#/resources) | [Profile](#/profile)
- [Emergency Contacts](#/emergency-contacts) | [Notifications](#/notifications)
- [Incident Detail](#/incident-detail) | [Report Unsafe](#/report-unsafe)

### Responder
- [Responder Dashboard](#/responder)
- [Incident Detail](#/responder/incidents/:id)

### Admin
- [Admin Dashboard](#/admin/dashboard)
- [Users](#/admin/users) → [User Detail](#/admin/users/:id)
- [Incidents](#/admin/incidents) → [Incident Detail](#/admin/incidents/:id)
- [Facilities](#/admin/facilities)
- [Rescue Teams](#/admin/teams)
- [Unsafe Reports](#/admin/unsafe-reports)
- [Reports](#/admin/reports)
- [Emergency Contacts](#/admin/emergency-contacts)

---

## 📁 File Structure (Key Directories)

```
frontend/
├── src/
│   ├── pages/                    # All page components
│   │   ├── Admin*.tsx           # Admin pages (12 files)
│   │   ├── *.tsx                # User/responder/public pages
│   ├── components/
│   │   ├── ui/                  # Base UI components (Button, Card, Input, etc.)
│   │   ├── layout/              # Header, Navbar, Sidebar, AppShell
│   │   ├── auth/                # AuthBrand, guards
│   │   ├── ui/                  # Base UI kit
│   ├── lib/
│   │   ├── api.ts               # API wrapper
│   │   ├── auth-context.tsx     # AuthProvider, useAuth
│   │   ├── hash-route.ts        # Hash routing
│   │   ├── i18n/                # i18n (dictionary, provider)
│   │   ├── theme.tsx            # ThemeProvider, useTheme
│   │   ├── auth-context.tsx     # AuthContext
│   ├── components/
│   │   ├── ui/                  # 25+ base components
│   │   ├── layout/              # Header, Navbar, Sidebar, AppShell
│   │   ├── auth/                # AuthBrand, guards
│   │   ├── resources/           # NearbyResourcesSection, etc.
│   │   ├── incidents/           # HistoryTimeline
│   │   ├── risks/               # RiskPanel
│   │   └── enrichment/          # LocationEnrichment
├── public/
│   └── assets/
│       ├── raksha-logo.png      # Golden logo
│       └── raksha-logo-blue.png (TODO: add)
└── backend/
    ├── src/
    │   ├── controllers/         # 18 controllers
    │   ├── models/              # 15 models
    │   ├── routes/              # 12 route files
    │   ├── middleware/          # auth, error, requireDb
    │   ├── validators/          # 12 validators
    │   ├── services/            # notifications, nearby, reports
    │   └── utils/               # errors, jwt, search, geo, export
```

---

## 🔗 Quick Navigation (Copy-Paste Ready)

```markdown
# User Pages
[Login](#/login) | [Register](#/register) | [Dashboard](#/dashboard) | [SOS](#/sos)
[Contacts](#/contacts) | [Resources](#/resources) | [Profile](#/profile)
[Emergency Contacts](#/emergency-contacts) | [Notifications](#/notifications)
[Incident Detail](#/incident-detail) | [Report Unsafe](#/report-unsafe)

# Responder
[Responder Dashboard](#/responder) | [Incident Detail](#/responder/incidents/:id)

# Admin
[Admin Dashboard](#/admin/dashboard)
[Users](#/admin/users) → [User Detail](#/admin/users/:id)
[Incidents](#/admin/incidents) → [Incident Detail](#/admin/incidents/:id)
[Facilities](#/admin/facilities) | [Rescue Teams](#/admin/teams)
[Unsafe Reports](#/admin/unsafe-reports) | [Reports](#/admin/reports)
[Emergency Contacts](#/admin/emergency-contacts)
```

---

## 📝 Notes for Developers

1. **All routes use hash-based routing** (`#/route`) for static hosting compatibility
2. **Role-based redirects** handled in `App.tsx` → `useEffect` with `parseHash()`
3. **API calls** use `api()` wrapper from `lib/api.ts` (auto-attaches Bearer token)
4. **i18n**: Use `const { t } = useI18n(); t('key.path')` — keys in `lib/i18n/dictionary.ts`
5. **Theme**: `const { theme, setTheme, toggleTheme } = useTheme()` — `ThemeProvider` wraps `App`
5. **Auth**: `const { user, login, logout, register, busy } = useAuth()` — `AuthProvider` wraps `App`
6. **Toast**: `const { notify } = useToast()` — `notify({ title, variant: 'success'|'danger'|'info'|'warning' })`
7. **Icons**: Import from `components/ui/icons` — 30+ SVG icons as React components
7. **Forms**: Use `Form`, `Input`, `Select`, `Textarea`, `Button` from `components/ui/*`
8. **Modals**: Use `Modal` (general) or `Dialog` (confirmation) from `components/ui/`
8. **Tables**: Use `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`, `TableHeaderCell` with `Pagination`

---

*Generated: September 2025 | RakshaSafe v1.0 | [GitHub](https://github.com/viveksahani08161-vs/RakshaSafe-Final)*