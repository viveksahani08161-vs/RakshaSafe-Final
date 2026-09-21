from pydantic import BaseModel, Field, field_validator
from typing import Optional
from typing import Literal
from pydantic import ConfigDict


class RiskFactor(BaseModel):
    """Input risk factor from the deterministic engine."""
    factor: str = Field(..., description="Name of the risk factor")
    value: str | float = Field(..., description="Value of the risk factor")
    weight: float = Field(..., ge=0, le=1, description="Weight of this factor")


class RiskAssessmentRequest(BaseModel):
    """Input for AI risk assessment."""
    factors: list[dict] = Field(..., description="Risk factors from deterministic engine")
    incident_type: str = Field(..., description="Type of incident: Safety or Disaster")
    priority: str = Field(..., description="Priority level: LOW, MEDIUM, HIGH, CRITICAL")
    location: Optional[dict] = None
    
    @field_validator('factors', mode='before')
    @classmethod
    def validate_factors(cls, v):
        if not isinstance(v, list):
            raise ValueError('factors must be a list')
        if len(v) == 0:
            raise ValueError('At least one risk factor is required')
        return v


class RiskFactorOutput(BaseModel):
    """Output risk factor from AI assessment."""
    factor: str
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    explanation: str


class RiskAssessmentResponse(BaseModel):
    """Structured AI risk assessment response."""
    riskLevel: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    riskScore: int = Field(ge=0, le=100)
    summary: str
    factors: list[RiskFactorOutput]
    recommendedActions: list[str]
    confidence: int = Field(ge=0, le=100)
    modelVersion: str
    
    model_config = ConfigDict(use_enum_values=True)


class HealthResponse(BaseModel):
    status: str
    model: str
    version: str