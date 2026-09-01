"""
MediGuard AI — Timeline Service
==================================
Builds the chronological "Health Timeline" shown to both patients (own
history) and doctors (a linked patient's history): a merge of real
prediction runs and real report uploads, sorted by date — no
fabricated appointment/medication entries, since those don't exist as
tracked entities in this system yet.

Item shape matches frontend/src/components/timeline/HealthTimeline.tsx:
  { id, type: "prediction"|"report", title, description, date, severity }
"""

from __future__ import annotations
import json
from typing import Any, Dict, List
from sqlalchemy.orm import Session

from models.prediction_history import PredictionHistory
from models.report import MedicalReport


def _risk_severity(level: str) -> str:
    return {"low": "low", "moderate": "moderate", "high": "high", "critical": "critical"}.get(
        (level or "low").lower(), "low"
    )


def _worse_of(a: str, b: str) -> str:
    order = {"low": 0, "moderate": 1, "high": 2, "critical": 3}
    return a if order.get((a or "low").lower(), 0) >= order.get((b or "low").lower(), 0) else b


class TimelineService:

    @staticmethod
    def get_timeline(db: Session, user_id: str) -> List[Dict[str, Any]]:
        items: List[Dict[str, Any]] = []

        predictions = (
            db.query(PredictionHistory)
            .filter(PredictionHistory.user_id == user_id)
            .order_by(PredictionHistory.created_at.desc())
            .limit(100)
            .all()
        )
        for p in predictions:
            overall = _worse_of(p.diabetes_risk_level, p.cvd_risk_level)
            items.append({
                "id": f"prediction:{p.id}",
                "type": "prediction",
                "title": "AI Disease Risk Prediction",
                "description": (
                    f"Diabetes risk: {p.diabetes_risk_level} ({p.diabetes_probability * 100:.0f}%) · "
                    f"Cardiovascular risk: {p.cvd_risk_level} ({p.cvd_probability * 100:.0f}%)"
                ),
                "date": p.created_at.isoformat(),
                "severity": _risk_severity(overall),
            })

        reports = (
            db.query(MedicalReport)
            .filter(MedicalReport.user_id == user_id)
            .order_by(MedicalReport.uploaded_at.desc())
            .limit(100)
            .all()
        )
        for r in reports:
            flags = []
            if r.flags:
                try:
                    flags = json.loads(r.flags)
                except (json.JSONDecodeError, TypeError):
                    flags = []
            items.append({
                "id": f"report:{r.id}",
                "type": "report",
                "title": f"Lab Report Uploaded — {r.report_name}",
                "description": r.summary or (f"{len(flags)} flagged value(s)" if flags else "No abnormal values flagged"),
                "date": r.uploaded_at.isoformat(),
                "severity": "high" if flags else "low",
            })

        items.sort(key=lambda i: i["date"], reverse=True)
        return items
