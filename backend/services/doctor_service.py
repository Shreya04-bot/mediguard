"""
MediGuard AI — Doctor Service
==============================
Handles doctor profile management, linked patient lookups, and risk analytics.
"""

from __future__ import annotations
import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from models.user import User
from models.doctor_profile import DoctorProfile
from models.patient import PatientProfile
from models.doctor_patient_link import DoctorPatientLink
from models.prediction_history import PredictionHistory
from models.report import MedicalReport

logger = logging.getLogger(__name__)


class DoctorService:

    @staticmethod
    def get_or_create_profile(db: Session, user_id: str) -> DoctorProfile:
        """Get or create doctor profile."""
        profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
        if not profile:
            profile = DoctorProfile(
                user_id=user_id,
                medical_license="N/A",
                hospital_name="General Hospital",
                specialization="General Medicine",
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
        return profile

    @staticmethod
    def update_profile(db: Session, user_id: str, data: Dict[str, Any]) -> DoctorProfile:
        """Update doctor profile."""
        profile = DoctorService.get_or_create_profile(db, user_id)
        for key in ["medical_license", "hospital_name", "specialization", "license_upload", "experience_years", "bio"]:
            if key in data and data[key] is not None:
                setattr(profile, key, data[key])
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def get_linked_patients(db: Session, doctor_id: str) -> List[Dict[str, Any]]:
        """List patients who have accepted links with this doctor."""
        links = (
            db.query(DoctorPatientLink, User)
            .join(User, DoctorPatientLink.patient_id == User.id)
            .filter(DoctorPatientLink.doctor_id == doctor_id, DoctorPatientLink.status == "accepted")
            .all()
        )

        patient_list = []
        for link, user in links:
            profile = db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()
            latest_pred = (
                db.query(PredictionHistory)
                .filter(PredictionHistory.user_id == user.id)
                .order_by(PredictionHistory.created_at.desc())
                .first()
            )
            patient_list.append({
                "patient_id": user.id,
                "name": user.name,
                "email": user.email,
                "gender": profile.gender if profile else None,
                "dob": profile.dob if profile else None,
                "blood_group": profile.blood_group if profile else None,
                "phone": profile.phone if profile else None,
                "latest_prediction": {
                    "diabetes_risk_level": latest_pred.diabetes_risk_level if latest_pred else "N/A",
                    "cvd_risk_level": latest_pred.cvd_risk_level if latest_pred else "N/A",
                    "hypertension_risk_level": latest_pred.hypertension_risk_level if latest_pred else "N/A",
                    "combined_score": latest_pred.combined_score if latest_pred else 0.0,
                    "date": latest_pred.created_at.isoformat() if latest_pred else None,
                } if latest_pred else None,
            })
        return patient_list

    @staticmethod
    def get_patient_detail(db: Session, doctor_id: str, patient_id: str) -> Dict[str, Any]:
        """View full patient detail if doctor is linked and approved."""
        link = (
            db.query(DoctorPatientLink)
            .filter(
                DoctorPatientLink.doctor_id == doctor_id,
                DoctorPatientLink.patient_id == patient_id,
                DoctorPatientLink.status == "accepted",
            )
            .first()
        )
        if not link:
            raise PermissionError("Access denied. Patient is not linked to your doctor account.")

        user = db.query(User).filter(User.id == patient_id).first()
        if not user:
            raise ValueError("Patient user not found.")

        profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient_id).first()

        predictions = (
            db.query(PredictionHistory)
            .filter(PredictionHistory.user_id == patient_id)
            .order_by(PredictionHistory.created_at.desc())
            .all()
        )

        reports = (
            db.query(MedicalReport)
            .filter(MedicalReport.user_id == patient_id)
            .order_by(MedicalReport.uploaded_at.desc())
            .all()
        )

        pred_history = []
        for p in predictions:
            try:
                inp = json.loads(p.input_data)
            except Exception:
                inp = {}
            pred_history.append({
                "id": p.id,
                "prediction_id": p.prediction_id,
                "diabetes_probability": p.diabetes_probability,
                "diabetes_risk_level": p.diabetes_risk_level,
                "cvd_probability": p.cvd_probability,
                "cvd_risk_level": p.cvd_risk_level,
                "hypertension_probability": p.hypertension_probability,
                "hypertension_risk_level": p.hypertension_risk_level,
                "combined_score": p.combined_score,
                "model_version": p.model_version,
                "input_data": inp,
                "created_at": p.created_at.isoformat(),
            })

        report_history = []
        for r in reports:
            try:
                ext = json.loads(r.extracted_data) if r.extracted_data else {}
                flg = json.loads(r.flags) if r.flags else []
            except Exception:
                ext, flg = {}, []
            report_history.append({
                "id": r.id,
                "report_name": r.report_name,
                "file_type": r.file_type,
                "summary": r.summary,
                "extracted_data": ext,
                "flags": flg,
                "uploaded_at": r.uploaded_at.isoformat(),
            })

        return {
            "patient_id": user.id,
            "name": user.name,
            "email": user.email,
            "profile": {
                "dob": profile.dob if profile else None,
                "gender": profile.gender if profile else None,
                "blood_group": profile.blood_group if profile else None,
                "phone": profile.phone if profile else None,
                "address": profile.address if profile else None,
                "emergency_contact": profile.emergency_contact if profile else None,
                "medical_history": profile.medical_history if profile else None,
            },
            "predictions": pred_history,
            "reports": report_history,
        }

    @staticmethod
    def get_doctor_analytics(db: Session, doctor_id: str) -> Dict[str, Any]:
        """Aggregate analytics over linked patients."""
        patient_links = db.query(DoctorPatientLink).filter(DoctorPatientLink.doctor_id == doctor_id, DoctorPatientLink.status == "accepted").all()
        patient_ids = [l.patient_id for l in patient_links]

        if not patient_ids:
            return {
                "total_patients": 0,
                "high_risk_count": 0,
                "moderate_risk_count": 0,
                "low_risk_count": 0,
                "avg_combined_score": 0.0,
            }

        preds = (
            db.query(PredictionHistory)
            .filter(PredictionHistory.user_id.in_(patient_ids))
            .all()
        )

        high_count = sum(1 for p in preds if p.diabetes_risk_level in ["high", "critical"] or p.cvd_risk_level in ["high", "critical"])
        mod_count = sum(1 for p in preds if (p.diabetes_risk_level == "moderate" or p.cvd_risk_level == "moderate") and not (p.diabetes_risk_level in ["high", "critical"] or p.cvd_risk_level in ["high", "critical"]))
        low_count = max(0, len(patient_ids) - high_count - mod_count)
        avg_score = (sum(p.combined_score for p in preds) / len(preds)) if preds else 0.0

        return {
            "total_patients": len(patient_ids),
            "total_predictions": len(preds),
            "high_risk_count": high_count,
            "moderate_risk_count": mod_count,
            "low_risk_count": low_count,
            "avg_combined_score": round(avg_score, 3),
        }
