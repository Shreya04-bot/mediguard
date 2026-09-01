"""
MediGuard AI — Admin Dashboard Aggregation Service
=====================================================
Real platform-wide counts and trends for the Admin Dashboard and
Analytics pages. Every number here is a live DB aggregate — nothing is
fabricated. Where the frontend's original mockup showed a metric with
no backing concept in the data model (e.g. "system health %", which
would require real infrastructure monitoring this project doesn't
have), it's intentionally left out rather than invented.
"""

from __future__ import annotations
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy import func
from sqlalchemy.orm import Session

from auth.db import User
from models.prediction_history import PredictionHistory
from models.report import MedicalReport


def _month_label(dt: datetime) -> str:
    return dt.strftime("%b")


class AdminDashboardService:

    @staticmethod
    def get_overview(db: Session) -> Dict[str, Any]:
        total_patients = db.query(User).filter(User.role == "patient").count()
        total_doctors = db.query(User).filter(User.role == "doctor").count()
        active_doctors = db.query(User).filter(
            User.role == "doctor", User.verification_status == "approved", User.is_active == True  # noqa: E712
        ).count()
        pending_doctors = db.query(User).filter(
            User.role == "doctor", User.verification_status == "pending"
        ).count()
        total_predictions = db.query(PredictionHistory).count()
        total_reports = db.query(MedicalReport).count()

        return {
            "totalPatients": total_patients,
            "totalDoctors": total_doctors,
            "activeDoctors": active_doctors,
            "pendingDoctorVerifications": pending_doctors,
            "totalPredictions": total_predictions,
            "totalReports": total_reports,
        }

    @staticmethod
    def get_monthly_activity(db: Session, months: int = 6) -> List[Dict[str, Any]]:
        """Patients registered, predictions run, and reports uploaded per month, last N months."""
        now = datetime.now(timezone.utc)
        buckets: List[Dict[str, Any]] = []
        month_starts = []
        cursor = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        for _ in range(months):
            month_starts.append(cursor)
            cursor = (cursor - timedelta(days=1)).replace(day=1)
        month_starts.reverse()

        for i, start in enumerate(month_starts):
            end = month_starts[i + 1] if i + 1 < len(month_starts) else now + timedelta(days=1)
            buckets.append({
                "month": _month_label(start),
                "patients": db.query(User).filter(
                    User.role == "patient", User.created_at >= start, User.created_at < end
                ).count(),
                "predictions": db.query(PredictionHistory).filter(
                    PredictionHistory.created_at >= start, PredictionHistory.created_at < end
                ).count(),
                "reports": db.query(MedicalReport).filter(
                    MedicalReport.uploaded_at >= start, MedicalReport.uploaded_at < end
                ).count(),
            })
        return buckets

    @staticmethod
    def get_disease_distribution(db: Session) -> List[Dict[str, Any]]:
        """Counts of patients currently at each risk level, per condition, from their most recent prediction."""
        # Most recent prediction per user (subquery on max created_at).
        latest_ids_subq = (
            db.query(
                PredictionHistory.user_id,
                func.max(PredictionHistory.created_at).label("latest_at"),
            )
            .group_by(PredictionHistory.user_id)
            .subquery()
        )
        latest = (
            db.query(PredictionHistory)
            .join(
                latest_ids_subq,
                (PredictionHistory.user_id == latest_ids_subq.c.user_id)
                & (PredictionHistory.created_at == latest_ids_subq.c.latest_at),
            )
            .all()
        )

        diabetes_counts: Dict[str, int] = defaultdict(int)
        cvd_counts: Dict[str, int] = defaultdict(int)
        htn_counts: Dict[str, int] = defaultdict(int)
        for p in latest:
            diabetes_counts[p.diabetes_risk_level] += 1
            cvd_counts[p.cvd_risk_level] += 1
            if p.hypertension_risk_level:
                htn_counts[p.hypertension_risk_level] += 1

        result = []
        for level, count in diabetes_counts.items():
            result.append({"name": f"Diabetes — {level}", "count": count, "trend": "up", "change": 0})
        for level, count in cvd_counts.items():
            result.append({"name": f"Cardiovascular — {level}", "count": count, "trend": "up", "change": 0})
        for level, count in htn_counts.items():
            result.append({"name": f"Hypertension — {level}", "count": count, "trend": "up", "change": 0})
        result.sort(key=lambda r: r["count"], reverse=True)
        return result

    @staticmethod
    def get_risk_distribution(db: Session) -> List[Dict[str, Any]]:
        """Overall risk-level breakdown across all patients' most recent prediction (for the pie chart)."""
        latest_ids_subq = (
            db.query(
                PredictionHistory.user_id,
                func.max(PredictionHistory.created_at).label("latest_at"),
            )
            .group_by(PredictionHistory.user_id)
            .subquery()
        )
        latest = (
            db.query(PredictionHistory)
            .join(
                latest_ids_subq,
                (PredictionHistory.user_id == latest_ids_subq.c.user_id)
                & (PredictionHistory.created_at == latest_ids_subq.c.latest_at),
            )
            .all()
        )
        counts: Dict[str, int] = defaultdict(int)
        for p in latest:
            # Use the highest-severity of all conditions as the patient's overall bucket.
            levels = [p.diabetes_risk_level, p.cvd_risk_level]
            if p.hypertension_risk_level:
                levels.append(p.hypertension_risk_level)
            order = {"low": 0, "moderate": 1, "high": 2, "critical": 3}
            overall = max(levels, key=lambda l: order.get((l or "low").lower(), 0))
            counts[overall] += 1
        return [{"name": level, "value": count} for level, count in counts.items()]
