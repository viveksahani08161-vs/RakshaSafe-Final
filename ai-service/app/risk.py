"""Deterministic risk-scoring engine for RakshaSafe.

This is the documented assistive analysis component (Python + FastAPI AI
service — no external LLM or API key is involved or required):

- Input is a fixed set of numeric/categorical factors assembled by the
  Node.js backend from real database records. Free-text descriptions are
  NEVER interpreted here, so prompt-injection style input cannot alter the
  outcome (text arrives only as pre-computed, bounded numbers).
- Output is a strict shape: riskScore (0-100), riskLevel
  (LOW / MEDIUM / HIGH / CRITICAL), modelVersion, inputFactors, assessedAt.
- The result is decision support only: it predicts nothing, dispatches
  nothing, and must always be presented with a disclaimer.

Model ``raksha-risk-v1`` weights (documented here, versioned by MODEL_VERSION):
- priority base: LOW=15, MEDIUM=35, HIGH=60, CRITICAL=80
- disaster type modifier: +5 for Disaster, +0 for Safety
- verified unsafe reports nearby: +6 each, capped at +30
- unverified unsafe reports nearby: +2 each, capped at +10
- other active incidents nearby: +3 each, capped at +15
- total clamped to 0-100
- level bands: <25 LOW, <50 MEDIUM, <75 HIGH, otherwise CRITICAL
"""

from datetime import datetime, timezone

from pydantic import BaseModel, Field

MODEL_VERSION = "raksha-risk-v1"

PRIORITY_BASE: dict[str, int] = {
    "LOW": 15,
    "MEDIUM": 35,
    "HIGH": 60,
    "CRITICAL": 80,
}

TYPE_MODIFIER: dict[str, int] = {
    "Safety": 0,
    "Disaster": 5,
}

VERIFIED_REPORT_WEIGHT = 6
VERIFIED_REPORT_CAP = 30
UNVERIFIED_REPORT_WEIGHT = 2
UNVERIFIED_REPORT_CAP = 10
ACTIVE_INCIDENT_WEIGHT = 3
ACTIVE_INCIDENT_CAP = 15


class RiskFactors(BaseModel):
    """Fixed factor schema. Unknown fields are ignored by pydantic default."""

    priority: str = Field(pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    incidentType: str = Field(pattern="^(Safety|Disaster)$")
    verifiedReports: int = Field(ge=0, le=1000)
    unverifiedReports: int = Field(ge=0, le=1000)
    activeIncidents: int = Field(ge=0, le=1000)


class RiskResult(BaseModel):
    riskScore: int = Field(ge=0, le=100)
    riskLevel: str = Field(pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    modelVersion: str = Field(min_length=1, max_length=50)
    inputFactors: list[dict] = Field(default_factory=list)
    assessedAt: str = Field(min_length=1, max_length=50)


def level_for_score(score: int) -> str:
    if score < 25:
        return "LOW"
    if score < 50:
        return "MEDIUM"
    if score < 75:
        return "HIGH"
    return "CRITICAL"


def assess(factors: RiskFactors) -> RiskResult:
    """Pure deterministic scoring. No I/O, no randomness, no text output."""
    base = PRIORITY_BASE[factors.priority]
    type_mod = TYPE_MODIFIER[factors.incidentType]
    verified = min(factors.verifiedReports * VERIFIED_REPORT_WEIGHT, VERIFIED_REPORT_CAP)
    unverified = min(factors.unverifiedReports * UNVERIFIED_REPORT_WEIGHT, UNVERIFIED_REPORT_CAP)
    active = min(factors.activeIncidents * ACTIVE_INCIDENT_WEIGHT, ACTIVE_INCIDENT_CAP)

    score = max(0, min(100, base + type_mod + verified + unverified + active))

    input_factors = [
        {"factor": "priorityBase", "value": factors.priority, "weight": base},
        {"factor": "typeModifier", "value": factors.incidentType, "weight": type_mod},
        {"factor": "verifiedReports", "value": factors.verifiedReports, "weight": verified},
        {"factor": "unverifiedReports", "value": factors.unverifiedReports, "weight": unverified},
        {"factor": "activeIncidents", "value": factors.activeIncidents, "weight": active},
    ]

    return RiskResult(
        riskScore=score,
        riskLevel=level_for_score(score),
        modelVersion=MODEL_VERSION,
        inputFactors=input_factors,
        assessedAt=datetime.now(timezone.utc).isoformat(),
    )
