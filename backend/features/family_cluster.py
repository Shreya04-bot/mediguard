"""
MediGuard AI — Feature 6: Family Risk Cluster View
Manages multiple family members under one session.
Stores risk profiles, detects inherited risk patterns,
and generates a side-by-side comparison summary.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# In-memory family store (replace with DB in production)
_families: Dict[str, Dict] = {}


def create_family(family_name: str) -> str:
    fid = str(uuid.uuid4())[:8]
    _families[fid] = {
        "id": fid,
        "name": family_name,
        "members": {},
        "created_at": datetime.utcnow().isoformat(),
    }
    return fid


def add_member(
    family_id: str,
    member_name: str,
    relation: str,
    patient_data: Dict[str, Any],
    prediction: Dict[str, Any],
) -> str:
    """Add or update a family member's risk profile."""
    if family_id not in _families:
        raise ValueError(f"Family {family_id} not found")

    mid = str(uuid.uuid4())[:8]
    _families[family_id]["members"][mid] = {
        "id": mid,
        "name": member_name,
        "relation": relation,           # "self","spouse","father","mother","sibling","child"
        "patient_data": patient_data,
        "prediction": prediction,
        "added_at": datetime.utcnow().isoformat(),
    }
    return mid


def get_family_dashboard(family_id: str) -> Dict[str, Any]:
    """
    Build side-by-side risk comparison + inherited pattern analysis.
    """
    if family_id not in _families:
        raise ValueError(f"Family {family_id} not found")

    fam = _families[family_id]
    members = list(fam["members"].values())

    if not members:
        return {"family_id": family_id, "name": fam["name"], "members": [], "insights": []}

    # Build comparison table
    comparison = []
    for m in members:
        pred = m["prediction"]
        dia  = pred.get("diabetes_risk", {})
        cvd  = pred.get("cardiovascular_risk", {})
        comparison.append({
            "id":         m["id"],
            "name":       m["name"],
            "relation":   m["relation"],
            "age":        m["patient_data"].get("age"),
            "bmi":        m["patient_data"].get("bmi"),
            "diabetes_prob":      dia.get("probability", 0),
            "diabetes_level":     dia.get("risk_level", "—"),
            "cvd_prob":           cvd.get("probability", 0),
            "cvd_level":          cvd.get("risk_level", "—"),
            "combined_score":     pred.get("combined_risk_score", 0),
            "smoking":            m["patient_data"].get("smoking", False),
            "fasting_glucose":    m["patient_data"].get("fasting_glucose"),
            "hba1c":              m["patient_data"].get("hba1c"),
        })

    insights = _detect_inherited_patterns(comparison)

    # Sort by combined score descending
    comparison.sort(key=lambda x: x["combined_score"], reverse=True)

    high_count  = sum(1 for c in comparison if c["diabetes_level"] in ("high","critical"))
    total       = len(comparison)
    family_burden = round(sum(c["combined_score"] for c in comparison) / total, 3)

    return {
        "family_id":       family_id,
        "name":            fam["name"],
        "member_count":    total,
        "members":         comparison,
        "family_burden_score": family_burden,
        "high_risk_count": high_count,
        "insights":        insights,
    }


def _detect_inherited_patterns(members: List[Dict]) -> List[str]:
    """Detect shared/inherited risk patterns within the family."""
    insights = []
    n = len(members)
    if n < 2:
        return insights

    # Pre-diabetic / diabetic count
    dm_high = [m for m in members if m["diabetes_level"] in ("high","critical","moderate")]
    if len(dm_high) >= 2:
        names = ", ".join(m["name"] for m in dm_high[:3])
        insights.append(
            f"⚠ Inherited diabetes risk: {len(dm_high)} of {n} family members "
            f"({names}) show elevated diabetes risk — genetic predisposition likely."
        )

    # CVD pattern
    cvd_high = [m for m in members if m["cvd_level"] in ("high","critical")]
    if len(cvd_high) >= 2:
        insights.append(
            f"❤ CVD cluster: {len(cvd_high)} members show high cardiovascular risk — "
            "shared dietary and lifestyle patterns may be contributing."
        )

    # Smoking in multiple members
    smokers = [m for m in members if m.get("smoking")]
    if len(smokers) >= 2:
        insights.append(
            f"🚬 {len(smokers)} family members smoke — household secondhand smoke "
            "increases CVD risk for all members including non-smokers."
        )

    # BMI pattern
    obese = [m for m in members if m.get("bmi", 0) >= 27.5]
    if len(obese) >= 2:
        insights.append(
            f"⚖ {len(obese)} members have BMI ≥27.5 (South Asian overweight threshold) — "
            "shared dietary habits likely driving family-wide metabolic risk."
        )

    # Glucose clustering
    dm_glucose = [m for m in members if m.get("fasting_glucose", 0) >= 100]
    if len(dm_glucose) >= 2:
        insights.append(
            f"🩸 {len(dm_glucose)} members have pre-diabetic or diabetic fasting glucose — "
            "consider family-wide dietary counselling and regular screening."
        )

    # Youngest at-risk member
    under_40 = [m for m in members if (m.get("age") or 99) < 40 and m["diabetes_level"] in ("high","critical")]
    for m in under_40:
        insights.append(
            f"🔴 {m['name']} (age {m.get('age')}) is under 40 with {m['diabetes_level']} "
            "diabetes risk — early intervention is critical."
        )

    if not insights:
        insights.append("✅ No major inherited risk patterns detected. Continue routine annual screening.")

    return insights


def list_families() -> List[Dict]:
    return [
        {
            "id": fid,
            "name": f["name"],
            "member_count": len(f["members"]),
            "created_at": f["created_at"],
        }
        for fid, f in _families.items()
    ]
