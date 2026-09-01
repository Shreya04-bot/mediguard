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

logger = logging.getLogger(__name__)


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
    def update_profile(db: Session, user_id: str, data: Dict[str, Any]) -> PatientProfile:
        """Update patient profile details."""
        profile = PatientService.get_or_create_profile(db, user_id)
        for key in ["dob", "gender", "blood_group", "phone", "address", "emergency_contact", "medical_history"]:
            if key in data and data[key] is not None:
                setattr(profile, key, data[key])
        db.commit()
        db.refresh(profile)
        return profile

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
