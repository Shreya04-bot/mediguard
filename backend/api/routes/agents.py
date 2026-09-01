"""
MediGuard AI — Agents API Route
POST /api/v1/agents/analyse — Run full LangGraph multi-agent analysis
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional

from agents.graph import get_agent_graph
from auth.dependencies import get_current_user
from auth.db import User
from models.schemas import CoordinatorResponse, AgentRecommendation, RiskLevel

router = APIRouter()
logger = logging.getLogger(__name__)


class AgentRequest(BaseModel):
    patient_data: Dict[str, Any] = {}
    symptom_text: Optional[str] = None
    prediction_result: Optional[Dict[str, Any]] = None
    report_text: Optional[str] = ""
    language: Optional[str] = "en"


@router.post("/analyse", summary="Run multi-agent clinical analysis")
async def run_agents(request: AgentRequest, current_user: User = Depends(get_current_user)):
    """
    Executes the full LangGraph pipeline:
    SymptomAgent → ReportAgent → RAGAgent → CoordinatorAgent

    Accepts EITHER structured clinical intake (patient_data), free-text
    symptom description (symptom_text), or both. A symptom-only query
    (no clinical inputs) still returns a real, guideline-grounded response
    — it just won't include a quantitative ML risk estimate (final_risk_level
    will be "unknown" rather than a fabricated value), per this system's
    safety requirement to never diagnose from symptoms alone.

    Returns final risk summary and agent recommendations.
    """
    if not request.patient_data and not request.symptom_text:
        raise HTTPException(status_code=422, detail="Provide patient_data, symptom_text, or both.")
    try:
        graph = get_agent_graph()
        initial_state = {
            "patient_data": request.patient_data,
            "symptom_text": request.symptom_text or "",
            "prediction_result": request.prediction_result or {},
            "report_text": request.report_text or "",
            "language": request.language or "en",
            "messages": [],
            "symptom_output": "",
            "report_output": "",
            "rag_output": "",
            "coordinator_output": {},
        }
        final_state = await graph.ainvoke(initial_state)
        coord = final_state.get("coordinator_output", {})

        return CoordinatorResponse(
            final_risk_level=RiskLevel(coord.get("final_risk_level") or "unknown"),
            summary=coord.get("summary", "Analysis complete."),
            agent_outputs=[
                AgentRecommendation(
                    agent_name=a.get("agent_name", "Agent"),
                    findings=a.get("findings", ""),
                    recommendations=a.get("recommendations", []),
                    guideline_references=a.get("guideline_references", []),
                    confidence=a.get("confidence", 1.0),
                )
                for a in coord.get("agent_outputs", [])
            ],
            triage_priority=coord.get("triage_priority", "routine"),
            next_steps=coord.get("next_steps", []),
        )
    except Exception as exc:
        logger.exception("Agent analysis error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
