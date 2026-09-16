"""RakshaSafe AI service — Python + FastAPI.

Provides:
- health endpoint
- CORS + root information
- POST /risk/assess — deterministic assistive risk scoring
  (see app.risk for the documented model; decision support only).
"""

from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.risk import RiskFactors, RiskResult, assess

app = FastAPI(
    title="RakshaSafe AI Service",
    description="AI-related processing for RakshaSafe (Python + FastAPI).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["meta"])
def root() -> dict:
    return {
        "service": "RakshaSafe AI Service",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {
        "success": True,
        "service": "rakshasafe-ai-service",
        "status": "ok",
        "time": datetime.utcnow().isoformat() + "Z",
    }


@app.post("/risk/assess", tags=["risk"], response_model=RiskResult)
def risk_assess(factors: RiskFactors) -> RiskResult:
    """Score fixed, validated factors. Invalid input is rejected (422) and
    never stored — storage is the Node.js backend's responsibility."""
    return assess(factors)