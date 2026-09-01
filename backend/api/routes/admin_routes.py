"""
MediGuard AI — Admin API Routes
================================
Endpoints for System Administrators: doctor verification queue, user management, audit logs, admin invitation, health & MLOps overview.
"""

from __future__ import annotations
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from auth.db import get_db, User
from auth.dependencies import require_role
from services.verification_service import VerificationService
from services.audit_service import AuditService
from services.invite_service import InviteService
from services.admin_dashboard_service import AdminDashboardService
from services.mlops_admin_service import MLOpsAdminService
from models.doctor_profile import DoctorProfile

logger = logging.getLogger(__name__)
router = APIRouter()


class VerifyDoctorPayload(BaseModel):
    status: str  # approved, rejected


class UpdateUserStatusPayload(BaseModel):
    is_active: bool


class InviteAdminPayload(BaseModel):
    email: EmailStr


@router.get("/dashboard-stats", summary="Real-time platform overview counts for the Admin Dashboard")
async def get_dashboard_stats(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    overview = AdminDashboardService.get_overview(db)
    monthly = AdminDashboardService.get_monthly_activity(db)
    disease_distribution = AdminDashboardService.get_disease_distribution(db)
    return {**overview, "monthlyActivity": monthly, "diseaseDistribution": disease_distribution}


@router.get("/analytics", summary="Population health analytics for the Admin Analytics page")
async def get_admin_analytics(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    overview = AdminDashboardService.get_overview(db)
    return {
        "totalMonitored": overview["totalPatients"],
        "diseaseDistribution": AdminDashboardService.get_disease_distribution(db),
        "riskDistribution": AdminDashboardService.get_risk_distribution(db),
        "monthlyActivity": AdminDashboardService.get_monthly_activity(db),
    }


@router.get("/ml-models", summary="ML model versions, accuracy, and usage for the ML Ops Monitor page")
async def get_ml_models(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return MLOpsAdminService.get_models_overview(db)


@router.get("/rag-status", summary="RAG guideline corpus status — real documents vs. built-in fallback")
async def get_rag_status(
    current_user: User = Depends(require_role("admin")),
):
    """
    Surfaces whether /ai/chat and the RAGAgent are currently grounded in
    real indexed guideline documents, or silently running on the small
    built-in fallback summaries because backend/data/guidelines/ is empty.
    See RAG_SETUP.md for how to populate the corpus, and
    rag/guideline_registry.py for the per-document metadata this returns.
    """
    from rag.guideline_registry import registry_status
    status_report = registry_status()

    # Report which embedding backend is actually active, without forcing
    # a full (possibly slow, network-touching) retriever init just to
    # answer an admin status query — get_retriever() caches, so if it's
    # already been called this process we get the answer for free; if
    # not, we call it once here (same cost /ai/chat would pay anyway).
    try:
        from rag.retriever import get_retriever, TfidfFallbackEmbeddings
        retriever = get_retriever()
        embeddings = retriever.vectorstore._embedding_function
        status_report["embedding_backend"] = (
            "tfidf_fallback" if isinstance(embeddings, TfidfFallbackEmbeddings)
            else "sentence_transformers"
        )
        status_report["indexed_chunk_count"] = retriever.vectorstore._collection.count()
    except Exception as exc:
        status_report["embedding_backend"] = "unavailable"
        status_report["retriever_error"] = str(exc)

    return status_report


@router.get("/verification-queue", summary="Get pending doctor verification requests")
async def get_verification_queue(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return VerificationService.get_pending_doctors(db)


@router.post("/verification/{doctor_id}", summary="Approve or reject doctor account")
async def verify_doctor(
    doctor_id: str,
    payload: VerifyDoctorPayload,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    try:
        updated_user = VerificationService.update_doctor_status(db, doctor_id, payload.status.lower(), current_user.id)
        AuditService.log(
            db=db,
            action="doctor_verification",
            resource=f"user:{doctor_id}",
            user_id=current_user.id,
            details={"doctor_id": doctor_id, "new_status": payload.status.lower()},
            ip_address=request.client.host if request.client else None,
        )
        return {"status": "success", "doctor_id": updated_user.id, "verification_status": updated_user.verification_status}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/users", summary="List system users with optional role filtering")
async def list_users(
    role: Optional[str] = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    from models.doctor_patient_link import DoctorPatientLink
    from models.prediction_history import PredictionHistory

    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.order_by(User.created_at.desc()).all()

    output = []
    for u in users:
        doc_profile = None
        linked_patient_count = None
        latest_prediction = None

        if u.role == "doctor":
            p = db.query(DoctorProfile).filter(DoctorProfile.user_id == u.id).first()
            if p:
                doc_profile = {
                    "medical_license": p.medical_license,
                    "hospital_name": p.hospital_name,
                    "specialization": p.specialization,
                    "experience_years": p.experience_years,
                }
            linked_patient_count = (
                db.query(DoctorPatientLink)
                .filter(DoctorPatientLink.doctor_id == u.id, DoctorPatientLink.status == "accepted")
                .count()
            )
        elif u.role == "patient":
            latest = (
                db.query(PredictionHistory)
                .filter(PredictionHistory.user_id == u.id)
                .order_by(PredictionHistory.created_at.desc())
                .first()
            )
            if latest:
                latest_prediction = {
                    "diabetes_risk_level": latest.diabetes_risk_level,
                    "cvd_risk_level": latest.cvd_risk_level,
                    "hypertension_risk_level": latest.hypertension_risk_level,
                    "combined_score": latest.combined_score,
                    "created_at": latest.created_at.isoformat(),
                }

        output.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "avatar": u.avatar_url,
            "verification_status": u.verification_status,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
            "doctor_profile": doc_profile,
            "linked_patient_count": linked_patient_count,
            "latest_prediction": latest_prediction,
        })
    return output


@router.put("/users/{user_id}/status", summary="Activate or deactivate a user account")
async def update_user_status(
    user_id: str,
    payload: UpdateUserStatusPayload,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    target.is_active = payload.is_active
    db.commit()

    AuditService.log(
        db=db,
        action="user_status_changed",
        resource=f"user:{user_id}",
        user_id=current_user.id,
        details={"is_active": payload.is_active},
        ip_address=request.client.host if request.client else None,
    )
    return {"status": "success", "user_id": target.id, "is_active": target.is_active}


@router.get("/audit-logs", summary="Get administrative and security audit logs")
async def get_audit_logs(
    limit: int = 100,
    action: Optional[str] = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return AuditService.get_logs(db, limit=limit, action=action)


@router.post("/invite", summary="Invite new administrator")
async def invite_admin(
    payload: InviteAdminPayload,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    try:
        invitation = InviteService.create_admin_invitation(db, current_user.id, payload.email)
        return {
            "status": "success",
            "invitation_id": invitation.id,
            "token": invitation.token,
            "email": invitation.email,
            "expires_at": invitation.expires_at.isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
