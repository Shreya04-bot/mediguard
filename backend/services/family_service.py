"""
MediGuard AI — Family Cluster Service
========================================
DB-backed replacement for the in-memory storage in
features/family_cluster.py. Reuses that module's inherited-risk-pattern
detection (pure function, no storage dependency) against real,
persisted family member rows.

Access model: a family is implicitly owned by the patient who created
it (one cluster per patient). A linked doctor can view (read-only) a
patient's family dashboard through the doctor routes.
"""

from __future__ import annotations
import json
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from features.family_cluster import _detect_inherited_patterns
from models.family_member import FamilyMember


def _risk_score_pct(member: FamilyMember) -> int:
    if member.combined_score is not None:
        return round(member.combined_score * 100)
    return 0


def _serialize_for_dashboard(member: FamilyMember) -> Dict[str, Any]:
    conditions = []
    if member.conditions:
        try:
            conditions = json.loads(member.conditions)
        except (json.JSONDecodeError, TypeError):
            conditions = []
    return {
        "id": member.id,
        "name": member.name,
        "relation": member.relation,
        "age": member.age,
        "diabetes_prob": None,
        "diabetes_level": member.diabetes_risk_level or "—",
        "cvd_prob": None,
        "cvd_level": member.cvd_risk_level or "—",
        "combined_score": member.combined_score or 0,
        "riskScore": _risk_score_pct(member),
        "conditions": conditions,
        "smoking": bool(member.smoking),
    }


class FamilyService:

    @staticmethod
    def add_member(
        db: Session,
        patient_id: str,
        name: str,
        relation: str,
        age: Optional[int] = None,
        conditions: Optional[List[str]] = None,
        diabetes_risk_level: Optional[str] = None,
        cvd_risk_level: Optional[str] = None,
        combined_score: Optional[float] = None,
        smoking: Optional[bool] = None,
        patient_data: Optional[Dict[str, Any]] = None,
        prediction: Optional[Dict[str, Any]] = None,
    ) -> FamilyMember:
        member = FamilyMember(
            patient_id=patient_id,
            name=name,
            relation=relation,
            age=age,
            conditions=json.dumps(conditions or []),
            diabetes_risk_level=diabetes_risk_level,
            cvd_risk_level=cvd_risk_level,
            combined_score=combined_score,
            smoking=smoking,
            patient_data=json.dumps(patient_data) if patient_data else None,
            prediction=json.dumps(prediction) if prediction else None,
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        return member

    @staticmethod
    def remove_member(db: Session, patient_id: str, member_id: str) -> bool:
        member = db.query(FamilyMember).filter(FamilyMember.id == member_id, FamilyMember.patient_id == patient_id).first()
        if not member:
            return False
        db.delete(member)
        db.commit()
        return True

    @staticmethod
    def get_dashboard(db: Session, patient_id: str) -> Dict[str, Any]:
        members = db.query(FamilyMember).filter(FamilyMember.patient_id == patient_id).order_by(FamilyMember.created_at.asc()).all()
        if not members:
            return {"members": [], "member_count": 0, "avg_risk_score": 0, "hereditary_conditions_count": 0, "insights": []}

        comparison = [_serialize_for_dashboard(m) for m in members]
        insights = _detect_inherited_patterns(comparison)
        comparison.sort(key=lambda c: c["combined_score"], reverse=True)

        avg_risk = round(sum(c["riskScore"] for c in comparison) / len(comparison))
        # Distinct hereditary conditions mentioned across 2+ members.
        condition_counts: Dict[str, int] = {}
        for c in comparison:
            for cond in c["conditions"]:
                condition_counts[cond] = condition_counts.get(cond, 0) + 1
        hereditary_conditions_count = sum(1 for count in condition_counts.values() if count >= 2)

        return {
            "members": comparison,
            "member_count": len(comparison),
            "avg_risk_score": avg_risk,
            "hereditary_conditions_count": hereditary_conditions_count,
            "insights": insights,
        }
