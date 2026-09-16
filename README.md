# RakshaSafe — AI-Powered Women Safety and Disaster Emergency Response System

RakshaSafe is a centralized, web-based Women Safety and Disaster Management
System. Users can create SOS / emergency incidents, share location where
available, and access organized emergency-resource information. Administrators
monitor incidents, update statuses, assign rescue resources, and manage
structured records.

This repository currently contains the **verified foundation shell** — no
business modules are implemented yet. The requirements baseline is at
[`documentation/REQUIREMENTS_BASELINE.md`](documentation/REQUIREMENTS_BASELINE.md).

## Repository layout

```
Raksha/
├── documentation/        # Final project documents + requirements baseline
├── frontend/             # React + TypeScript + Vite + Tailwind CSS web app
├── backend/              # Node.js + Express.js + MongoDB (Mongoose) REST API
├── ai-service/           # Python + FastAPI AI service (separate layer)
├── .gitignore
└── README.md
```

## Technology stack

| Layer          | Technology                                        |
| -------------- | ------------------------------------------------- |
| Frontend       | React.js, TypeScript, Vite, Tailwind CSS          |
| Backend        | Node.js, Express.js, REST API, TypeScript         |
| Database       | MongoDB, Mongoose ODM                             |
| Authentication | JWT, bcrypt (configured for future modules)       |
| AI service     | Python, FastAPI (configured AI service API)       |
| Location       | Browser/Device Geolocation API                    |
| Maps           | OpenStreetMap + Leaflet (where configured)        |
| Communication  | Configured Email / SMS / WhatsApp providers       |

## Prerequisites

- Node.js 20+ (LTS) and npm
- Python 3.12+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a remote URI

## Running the application

### 1. Frontend (`frontend/`)

```bash
cd frontend
npm install
cp .env.example .env   # adjust if needed
npm run dev            # http://localhost:5173
```

### 2. Backend (`backend/`)

```bash
cd backend
npm install
cp .env.example .env
npm run dev            # http://localhost:5000  (health: /api/health)
```

### 3. AI service (`ai-service/`)

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate          # Windows (POSIX: source venv/bin/activate)
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload  # http://localhost:8000  (docs: /docs)
```

### All-in-one (Windows PowerShell)

From the repository root:

```powershell
.\scripts\start-dev.ps1
```

Starts the AI service, backend, and frontend concurrently and shows a summary.

## Ports

| Service    | Port  | Notes                      |
| ---------- | ----- | -------------------------- |
| Frontend   | 5173  | Vite dev server            |
| Backend    | 5000  | Express REST API           |
| AI service | 8000  | FastAPI                    |

## Configuration

Each service reads a local `.env` file (see the respective `.env.example`).
The frontend dev server proxies `/api` → backend and `/ai` → AI service, so
same-origin URLs work out of the box in development.

## Status / next steps

The foundation shell is verified: frontend builds and serves, backend starts
and reports health + MongoDB connectivity, and the AI service responds on
`/health`. Business modules (authentication, SOS/incidents, locations,
facilities, rescue teams, notifications, risk zones, risk assessment, admin
dashboard, analytics, reports, admin logs) are implemented in subsequent
phases against the requirements baseline.