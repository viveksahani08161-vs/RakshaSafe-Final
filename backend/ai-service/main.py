from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
import logging
import re
from typing import Optional

from schemas import (
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    HealthResponse,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model variable
model = None
model_name = "gemini-1.5-flash"  # Fast, cost-effective model


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - startup and shutdown."""
    global model
    
    # Startup
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set - AI service will run in fallback mode")
    else:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.3,
                    "top_p": 0.8,
                    "top_k": 40,
                    "max_output_tokens": 2048,
                }
            )
            logger.info(f"Gemini AI model initialized: {model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini model: {e}")
            model = None
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI service")


app = FastAPI(
    title="RakshaSafe AI Risk Assessment Service",
    description="AI-assisted risk assessment for emergency incidents using Google Gemini",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model": "gemini-1.5-flash",
        "version": "1.0.0",
        "ai_available": model is not None
    }


def build_risk_assessment_prompt(request_data: dict) -> str:
    """Build the prompt for Gemini risk assessment."""
    
    factors = request_data.get("factors", [])
    incident_type = request_data.get("incident_type", "Unknown")
    priority = request_data.get("priority", "UNKNOWN")
    location = request_data.get("location")
    
    # Format factors for the prompt
    factors_text = ""
    for f in factors:
        if isinstance(f, dict):
            factor_name = f.get("factor", "Unknown")
            value = f.get("value", "N/A")
            weight = f.get("weight", 0)
            factors_text += f"- {factor_name}: {value} (weight: {weight})\n"
        else:
            factors_text += f"- {f}\n"
    
    location_text = ""
    if location:
        loc_parts = []
        if location.get("address"):
            loc_parts.append(location["address"])
        if location.get("city"):
            loc_parts.append(location["city"])
        if location.get("state"):
            loc_parts.append(location["state"])
        if location.get("country"):
            loc_parts.append(location["country"])
        location_text = ", ".join(loc_parts) if loc_parts else "Not available"
    else:
        location_text = "Not available"
    
    prompt = f"""You are an expert emergency risk assessment AI for the RakshaSafe emergency response system.

Analyze the following incident data and provide a structured risk assessment.

INCIDENT DETAILS:
- Type: {incident_type}
- Priority: {priority}
- Location: {location_text}

RISK FACTORS:
{factors_text}

INSTRUCTIONS:
1. Analyze the incident details and risk factors
2. Provide a structured risk assessment in the exact JSON format specified below
3. Be objective, factual, and conservative in your assessment
4. Do not make guarantees about emergency response or outcomes
5. Base your assessment only on the provided information
5. Base your assessment only on the provided information

REQUIRED JSON RESPONSE FORMAT (must be valid JSON):
{{
  "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "riskScore": <integer 0-100>,
  "summary": "Brief 1-2 sentence summary of the risk assessment",
  "factors": [
    {{
      "factor": "Factor name",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "explanation": "Brief explanation of why this factor contributes to the risk level"
    }}
  ],
  "recommendedActions": [
    "Action 1",
    "Action 2",
    "Action 3"
  ],
  "confidence": <integer 0-100>,
  "modelVersion": "gemini-1.5-flash"
}}

RISK LEVEL GUIDELINES:
- LOW (0-25): Minor incident, localized, low urgency
- MEDIUM (26-50): Moderate concern, requires monitoring
- HIGH (51-75): Serious, requires immediate attention and resource allocation
- CRITICAL (76-100): Critical emergency, immediate multi-agency response needed

CONFIDENCE: Your confidence in this assessment (0-100)
MODEL VERSION: Use exactly "gemini-1.5-flash"
"""
    return prompt


async def call_gemini(prompt: str) -> dict:
    """Call Gemini API and parse the response."""
    if not model:
        raise HTTPException(status_code=503, detail="AI service not available - model not initialized")
    
    try:
        response = await model.generate_content_async(prompt)
        
        # Extract text from response
        response_text = response.text if hasattr(response, 'text') else str(response)
        
        # Parse JSON from response
        import json
        try:
            # Try to extract JSON from response (in case there's extra text)
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            logger.error(f"Raw response: {response_text[:500]}")
            raise HTTPException(status_code=502, detail="AI service returned invalid response format")
        
        # Validate required fields
        required_fields = ["riskLevel", "riskScore", "summary", "factors", "recommendedActions", "confidence", "modelVersion"]
        for field in required_fields:
            if field not in result:
                raise HTTPException(status_code=502, detail=f"AI response missing required field: {field}")
        
        # Validate riskLevel enum
        valid_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        if result["riskLevel"] not in valid_levels:
            raise HTTPException(status_code=502, detail=f"Invalid riskLevel: {result['riskLevel']}")
        
        # Validate ranges
        if not (0 <= result["riskScore"] <= 100):
            raise HTTPException(status_code=502, detail="riskScore must be 0-100")
        if not (0 <= result["confidence"] <= 100):
            raise HTTPException(status_code=502, detail="confidence must be 0-100")
        
        # Validate model version
        if result["modelVersion"] != "gemini-1.5-flash":
            logger.warning(f"Unexpected model version: {result['modelVersion']}")
            result["modelVersion"] = "gemini-1.5-flash"
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise HTTPException(status_code=502, detail="AI service error")


@app.post("/risk/assess", response_model=dict)
async def assess_risk(request: RiskAssessmentRequest):
    """
    Assess risk for an incident using AI.
    
    Input:
    {
        "factors": [...],
        "incident_type": "Safety|Disaster",
        "priority": "LOW|MEDIUM|HIGH|CRITICAL",
        "location": {optional location data}
    }
    
    Returns structured risk assessment.
    """
    if not model:
        raise HTTPException(status_code=503, detail="AI service not available - model not initialized")
    
    try:
        prompt = build_risk_assessment_prompt(request.dict())
        result = await call_gemini(prompt)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Risk assessment failed: {e}")
        raise HTTPException(status_code=502, detail="Risk assessment failed")


# Run with: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)