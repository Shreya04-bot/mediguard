"""
MediGuard AI — Patient API Routes
===================================
Endpoints dedicated to Patient role interactions.
"""

from __future__ import annotations
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.db import get_db, User
from auth.dependencies import get_current_user, require_role
from services.patient_service import PatientService
from services.linking_service import LinkingService
from services.notification_service import NotificationService

logger = logging.getLogger(__name__)
router = APIRouter()


class PatientProfileUpdate(BaseModel):
    dob: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_history: Optional[str] = None


class LinkRequestPayload(BaseModel):
    doctor_id: str
    notes: Optional[str] = ""


@router.get("/profile", summary="Get patient profile")
async def get_patient_profile(
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    profile = PatientService.get_or_create_profile(db, current_user.id)
    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "dob": profile.dob,
        "gender": profile.gender,
        "blood_group": profile.blood_group,
        "phone": profile.phone,
        "address": profile.address,
        "emergency_contact": profile.emergency_contact,
        "medical_history": profile.medical_history,
    }


@router.put("/profile", summary="Update patient profile")
async def update_patient_profile(
    payload: PatientProfileUpdate,
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    profile = PatientService.update_profile(db, current_user.id, payload.model_dump())
    return {"status": "success", "profile": profile}


@router.get("/doctors", summary="Get verified doctors list available to link")
async def get_available_doctors(
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    return LinkingService.get_patient_doctors(db, current_user.id)


@router.post("/link-request", summary="Request connection with a doctor")
async def request_doctor_link(
    payload: LinkRequestPayload,
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    try:
        link = LinkingService.create_link_request(db, current_user.id, payload.doctor_id, payload.notes or "")
        return {"status": "success", "link_id": link.id, "link_status": link.status}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/history", summary="Get patient prediction history")
async def get_history(
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    return PatientService.get_prediction_history(db, current_user.id)


@router.get("/reports", summary="Get patient medical reports")
async def get_reports(
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    return PatientService.get_patient_reports(db, current_user.id)


@router.get("/family", summary="Get patient's family risk cluster dashboard")
async def get_family(
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    from services.family_service import FamilyService
    return FamilyService.get_dashboard(db, current_user.id)


class AddFamilyMemberPayload(BaseModel):
    name: str
    relation: str
    age: Optional[int] = None
    conditions: Optional[List[str]] = None
    diabetes_risk_level: Optional[str] = None
    cvd_risk_level: Optional[str] = None
    combined_score: Optional[float] = None
    smoking: Optional[bool] = None


@router.post("/family/member", summary="Add a family member's risk profile")
async def add_family_member(
    payload: AddFamilyMemberPayload,
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    from services.family_service import FamilyService
    member = FamilyService.add_member(
        db, current_user.id, payload.name, payload.relation, payload.age,
        payload.conditions, payload.diabetes_risk_level, payload.cvd_risk_level,
        payload.combined_score, payload.smoking,
    )
    return {"status": "success", "member_id": member.id}


@router.delete("/family/member/{member_id}", summary="Remove a family member")
async def remove_family_member(
    member_id: str,
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    from services.family_service import FamilyService
    ok = FamilyService.remove_member(db, current_user.id, member_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found.")
    return {"status": "success"}
async def get_notifications(
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    return NotificationService.get_user_notifications(db, current_user.id)


@router.get("/timeline", summary="Get patient's chronological health timeline (predictions + report uploads)")
async def get_patient_timeline(
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    from services.timeline_service import TimelineService
    return {"items": TimelineService.get_timeline(db, current_user.id)}


@router.get("/health-score", summary="Get patient's computed vitality index from their latest prediction")
async def get_health_score(
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    from models.prediction_history import PredictionHistory
    latest = (
        db.query(PredictionHistory)
        .filter(PredictionHistory.user_id == current_user.id)
        .order_by(PredictionHistory.created_at.desc())
        .first()
    )
    if not latest:
        return {"score": None, "label": "No predictions yet", "message": "Run a disease risk prediction to see your vitality index."}

    # combined_score is a 0-1 combined risk score from the model (higher = higher risk).
    # Vitality index is the inverse, scaled to 0-100.
    vitality = round((1 - latest.combined_score) * 100)
    if vitality >= 80:
        label = "Optimal Vitality Index"
    elif vitality >= 60:
        label = "Good Vitality Index"
    elif vitality >= 40:
        label = "Fair — Attention Recommended"
    else:
        label = "Elevated Risk — Consult Your Doctor"

    return {
        "score": vitality,
        "label": label,
        "diabetesRiskLevel": latest.diabetes_risk_level,
        "cvdRiskLevel": latest.cvd_risk_level,
        "hypertensionRiskLevel": latest.hypertension_risk_level,
        "lastUpdated": latest.created_at.isoformat(),
    }
