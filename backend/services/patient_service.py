"""
MediGuard AI — Patient Service
===============================
Handles patient profile updates, prediction history logging, and report querying.
"""

from __future__ import annotations
import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from models.user import User
from models.patient import PatientProfile
from models.prediction_history import PredictionHistory
from models.report import MedicalReport
from utils.health_calculations import calculate_age, calculate_bmi, bmi_category, normalize_gender

logger = logging.getLogger(__name__)

# Fields that live on PatientProfile and are settable via PUT /patient/profile
# (and, transitively, patient registration onboarding). Single place that
# defines "what a patient can edit about their health profile" — reused by
# both the update and the completeness check so the two can't drift apart.
_UPDATABLE_FIELDS = [
    "dob", "gender", "blood_group", "phone", "address", "emergency_contact", "medical_history",
    "height_cm", "weight_kg", "smoking", "physical_activity_level",
    "family_history_diabetes", "family_history_cvd",
    "allergies", "current_medications", "dietary_preference",
]


class PatientService:

    @staticmethod
    def get_or_create_profile(db: Session, user_id: str) -> PatientProfile:
        """Get or initialize patient profile."""
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
        if not profile:
            profile = PatientProfile(user_id=user_id)
            db.add(profile)
            db.commit()
            db.refresh(profile)
        return profile

    @staticmethod
    def update_profile(db: Session, user: User, data: Dict[str, Any]) -> PatientProfile:
        """Update patient profile details. Boolean fields are allowed to be
        explicitly set to False (e.g. un-checking "I smoke"), so this only
        skips keys the caller didn't send at all, not falsy values."""
        profile = PatientService.get_or_create_profile(db, user.id)

        if "gender" in data and data["gender"] is not None:
            data["gender"] = normalize_gender(data["gender"]) or data["gender"]

        for key in _UPDATABLE_FIELDS:
            if key in data and data[key] is not None:
                setattr(profile, key, data[key])

        # Gender is a single canonical value across the whole app (see
        # utils.health_calculations) — when the patient sets/changes their
        # clinical gender here, keep User.gender (drives the avatar/UI) in
        # sync too, instead of letting the two fields diverge.
        if profile.gender and user.gender != profile.gender:
            user.gender = profile.gender

        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def is_profile_complete(profile: PatientProfile) -> bool:
        return bool(profile.dob and profile.gender and profile.height_cm and profile.weight_kg)

    @staticmethod
    def serialize_profile(user: User, profile: PatientProfile) -> Dict[str, Any]:
        """Canonical patient-facing profile representation — includes
        derived age/BMI (never stored) and profile_complete, so every
        consumer (GET /patient/profile, onboarding review step, doctor
        patient-detail view) computes these identically."""
        bmi = calculate_bmi(profile.height_cm, profile.weight_kg)
        return {
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "dob": profile.dob,
            "age": calculate_age(profile.dob),
            "gender": profile.gender,
            "blood_group": profile.blood_group,
            "phone": profile.phone,
            "address": profile.address,
            "emergency_contact": profile.emergency_contact,
            "medical_history": profile.medical_history,
            "height_cm": profile.height_cm,
            "weight_kg": profile.weight_kg,
            "bmi": bmi,
            "bmi_category": bmi_category(bmi),
            "smoking": bool(profile.smoking),
            "physical_activity_level": profile.physical_activity_level,
            "family_history_diabetes": bool(profile.family_history_diabetes),
            "family_history_cvd": bool(profile.family_history_cvd),
            "allergies": profile.allergies,
            "current_medications": profile.current_medications,
            "dietary_preference": profile.dietary_preference,
            "profile_complete": PatientService.is_profile_complete(profile),
        }

    @staticmethod
    def save_prediction(
        db: Session,
        user_id: str,
        prediction_id: str,
        input_data: dict,
        diabetes_prob: float,
        diabetes_level: str,
        cvd_prob: float,
        cvd_level: str,
        combined_score: float,
        model_version: str,
        hypertension_prob: float | None = None,
        hypertension_level: str | None = None,
    ) -> PredictionHistory:
        """Save disease prediction run to history."""
        pred = PredictionHistory(
            user_id=user_id,
            prediction_id=prediction_id,
            input_data=json.dumps(input_data),
            diabetes_probability=diabetes_prob,
            diabetes_risk_level=diabetes_level,
            cvd_probability=cvd_prob,
            cvd_risk_level=cvd_level,
            hypertension_probability=hypertension_prob,
            hypertension_risk_level=hypertension_level,
            combined_score=combined_score,
            model_version=model_version,
        )
        db.add(pred)
        db.commit()
        db.refresh(pred)
        return pred

    @staticmethod
    def get_prediction_history(db: Session, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve patient's prediction history."""
        history = (
            db.query(PredictionHistory)
            .filter(PredictionHistory.user_id == user_id)
            .order_by(PredictionHistory.created_at.desc())
            .limit(limit)
            .all()
        )
        output = []
        for h in history:
            try:
                inp = json.loads(h.input_data)
            except Exception:
                inp = {}
            output.append({
                "id": h.id,
                "prediction_id": h.prediction_id,
                "diabetes_probability": h.diabetes_probability,
                "diabetes_risk_level": h.diabetes_risk_level,
                "cvd_probability": h.cvd_probability,
                "cvd_risk_level": h.cvd_risk_level,
                "hypertension_probability": h.hypertension_probability,
                "hypertension_risk_level": h.hypertension_risk_level,
                "combined_score": h.combined_score,
                "model_version": h.model_version,
                "input_data": inp,
                "created_at": h.created_at.isoformat(),
            })
        return output

    @staticmethod
    def save_report(
        db: Session,
        user_id: str,
        report_name: str,
        file_type: str,
        file_path: Optional[str],
        extracted_data: dict,
        summary: str,
        flags: list,
    ) -> MedicalReport:
        """Save uploaded lab report metadata and analysis."""
        report = MedicalReport(
            user_id=user_id,
            report_name=report_name,
            file_type=file_type,
            file_path=file_path,
            extracted_data=json.dumps(extracted_data),
            summary=summary,
            flags=json.dumps(flags),
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def get_patient_reports(db: Session, user_id: str) -> List[Dict[str, Any]]:
        """Retrieve medical reports for patient."""
        reports = (
            db.query(MedicalReport)
            .filter(MedicalReport.user_id == user_id)
            .order_by(MedicalReport.uploaded_at.desc())
            .all()
        )
        output = []
        for r in reports:
            try:
                ext = json.loads(r.extracted_data) if r.extracted_data else {}
                flg = json.loads(r.flags) if r.flags else []
            except Exception:
                ext, flg = {}, []
            output.append({
                "id": r.id,
                "report_name": r.report_name,
                "file_type": r.file_type,
                "extracted_data": ext,
                "summary": r.summary,
                "flags": flg,
                "uploaded_at": r.uploaded_at.isoformat(),
            })
        return output