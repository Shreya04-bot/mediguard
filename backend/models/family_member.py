"""
MediGuard AI — Family Member Model
=====================================
Replaces the previous in-memory storage in features/family_cluster.py
(a plain Python dict with no persistence, no auth, and no per-user
ownership). Each row is one family member tracked by a patient — the
"family" is implicitly scoped to patient_id (one family cluster per
patient account), matching how the frontend's Family Cluster page
actually presents it: a single list of the current user's relatives.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Float, Boolean
from sqlalchemy.orm import relationship

from auth.db import Base


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(120), nullable=False)
    relation = Column(String(50), nullable=False)  # self, spouse, father, mother, sibling, child, other
    age = Column(Integer, nullable=True)

    # Optional: if this relative has run a prediction themselves (patient_data
    # + prediction JSON), stored for the inherited-risk-pattern analysis.
    patient_data = Column(Text, nullable=True)   # JSON string
    prediction = Column(Text, nullable=True)     # JSON string

    diabetes_risk_level = Column(String(20), nullable=True)
    cvd_risk_level = Column(String(20), nullable=True)
    combined_score = Column(Float, nullable=True)
    smoking = Column(Boolean, nullable=True)
    conditions = Column(Text, nullable=True)  # JSON list of strings, e.g. ["Type 2 Diabetes", "Hypertension"]

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    patient = relationship("User", foreign_keys=[patient_id])
