"""
MediGuard AI — Doctor API Routes
=================================
Endpoints for Doctor role: managing patient link requests, viewing connected patient medical history & predictions, analytics, and doctor profile management.
"""

from __future__ import annotations
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.db import get_db, User
from auth.dependencies import get_current_user, require_role, require_verified_doctor
from services.doctor_service import DoctorService
from services.linking_service import LinkingService

logger = logging.getLogger(__name__)
router = APIRouter()


class DoctorProfileUpdate(BaseModel):
    medical_license: Optional[str] = None
    hospital_name: Optional[str] = None
    specialization: Optional[str] = None
    license_upload: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None


class LinkRespondPayload(BaseModel):
    status: str  # accepted or rejected


@router.get("/status", summary="Check doctor verification status")
async def get_doctor_status(
    current_user: User = Depends(require_role("doctor")),
):
    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "verification_status": current_user.verification_status,
    }


@router.get("/profile", summary="Get doctor profile")
async def get_doctor_profile(
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    profile = DoctorService.get_or_create_profile(db, current_user.id)
    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "verification_status": current_user.verification_status,
        "medical_license": profile.medical_license,
        "hospital_name": profile.hospital_name,
        "specialization": profile.specialization,
        "license_upload": profile.license_upload,
        "experience_years": profile.experience_years,
        "bio": profile.bio,
    }


@router.put("/profile", summary="Update doctor profile")
async def update_doctor_profile(
    payload: DoctorProfileUpdate,
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    profile = DoctorService.update_profile(db, current_user.id, payload.model_dump())
    return {"status": "success", "profile": profile}


@router.get("/patients", summary="List linked patients (requires verified doctor)")
async def get_linked_patients(
    current_user: User = Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    return DoctorService.get_linked_patients(db, current_user.id)


@router.get("/patients/{patient_id}", summary="View detailed patient records & prediction history")
async def get_patient_detail(
    patient_id: str,
    current_user: User = Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    try:
        return DoctorService.get_patient_detail(db, current_user.id, patient_id)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/link-requests", summary="List connection requests from patients")
async def get_link_requests(
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    return LinkingService.get_doctor_link_requests(db, current_user.id)


@router.post("/link-requests/{link_id}/respond", summary="Accept or reject a patient link request")
async def respond_link_request(
    link_id: str,
    payload: LinkRespondPayload,
    current_user: User = Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    try:
        link = LinkingService.respond_link_request(db, link_id, current_user.id, payload.status.lower())
        return {"status": "success", "link_id": link.id, "new_status": link.status}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/patients/{patient_id}/timeline", summary="View a linked patient's chronological health timeline")
async def get_patient_timeline(
    patient_id: str,
    current_user: User = Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    from services.linking_service import LinkingService
    from services.timeline_service import TimelineService
    if not LinkingService.is_linked(db, current_user.id, patient_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Patient is not linked to your doctor account.")
    return {"items": TimelineService.get_timeline(db, patient_id)}


@router.get("/patients/{patient_id}/family", summary="View a linked patient's family risk cluster (read-only)")
async def get_patient_family(
    patient_id: str,
    current_user: User = Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    from services.linking_service import LinkingService
    from services.family_service import FamilyService
    if not LinkingService.is_linked(db, current_user.id, patient_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Patient is not linked to your doctor account.")
    return FamilyService.get_dashboard(db, patient_id)


@router.get("/patients/{patient_id}/clinical-analysis", summary="Run LangGraph multi-agent clinical analysis for a linked patient")
async def get_patient_clinical_analysis(
    patient_id: str,
    current_user: User = Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    """
    Runs the SymptomAgent -> ReportAgent -> RAGAgent -> CoordinatorAgent
    LangGraph pipeline (agents/graph.py) against the patient's own most
    recent prediction run — no re-entry of clinical data required, and
    no synthetic/example data is used.
    """
    import json as _json
    from services.linking_service import LinkingService
    from models.prediction_history import PredictionHistory

    if not LinkingService.is_linked(db, current_user.id, patient_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Patient is not linked to your doctor account.")

    latest = (
        db.query(PredictionHistory)
        .filter(PredictionHistory.user_id == patient_id)
        .order_by(PredictionHistory.created_at.desc())
        .first()
    )
    if not latest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This patient has no prediction history yet — run a prediction first.")

    patient_data = _json.loads(latest.input_data)
    prediction_result = {
        "diabetes": {"probability": latest.diabetes_probability, "risk_level": latest.diabetes_risk_level},
        "cardiovascular": {"probability": latest.cvd_probability, "risk_level": latest.cvd_risk_level},
        "hypertension": {"probability": latest.hypertension_probability, "risk_level": latest.hypertension_risk_level},
        "combined_risk_score": latest.combined_score,
    }

    try:
        from agents.graph import get_agent_graph
        from models.schemas import CoordinatorResponse, AgentRecommendation, RiskLevel
        graph = get_agent_graph()
        final_state = await graph.ainvoke(
            {
                "patient_data": patient_data, "prediction_result": prediction_result, "report_text": "",
                "language": "en", "messages": [], "symptom_output": "", "report_output": "",
                "rag_output": "", "coordinator_output": {},
            },
            config={
                "tags": ["mediguard-ai", "endpoint:clinical-analysis", "role:doctor"],
                "metadata": {"endpoint": "/doctor/patients/{id}/clinical-analysis", "doctor_id": current_user.id, "patient_id": patient_id},
                "run_name": "clinical-analysis",
            },
        )
        coord = final_state.get("coordinator_output", {})
        logger.info("CLINICAL ANALYSIS COORDINATOR OUTPUT: %s", coord)
    except Exception as exc:
        logger.exception("Multi-agent clinical analysis failed")
        raise HTTPException(status_code=503, detail={"error": "Clinical analysis assistant temporarily unavailable"}) from exc

    # Safely handle coordinator output.
    # The LLM may return a key with a None value instead of a valid risk level.
    final_risk = coord.get("final_risk_level")

    if not final_risk:
        final_risk = "moderate"

    # Normalize the value coming from the LLM.
    final_risk = str(final_risk).strip().lower()

    # Only allow values supported by the RiskLevel enum.
    try:
        risk_level = RiskLevel(final_risk)
    except ValueError:
        logger.warning(
            "Invalid coordinator final_risk_level=%r. Falling back to moderate.",
            final_risk,
        )
        risk_level = RiskLevel("moderate")


    return CoordinatorResponse(
        final_risk_level=risk_level,

        summary=coord.get("summary") or "Analysis complete.",

        agent_outputs=[
            AgentRecommendation(
                agent_name=a.get("agent_name") or "Agent",
                findings=a.get("findings") or "",
                recommendations=a.get("recommendations") or [],
                guideline_references=a.get("guideline_references") or [],
                confidence=a.get("confidence")
                if a.get("confidence") is not None
                else 1.0,
            )
            for a in (coord.get("agent_outputs") or [])
        ],

        triage_priority=coord.get("triage_priority") or "routine",

        next_steps=coord.get("next_steps") or [],
    )


@router.get("/analytics", summary="Get doctor cohort risk analytics")
async def get_doctor_analytics(
    current_user: User = Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    return DoctorService.get_doctor_analytics(db, current_user.id)
