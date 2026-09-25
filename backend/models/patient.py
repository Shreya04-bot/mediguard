"""
MediGuard AI — PatientProfile Model
====================================
SQLAlchemy model holding extended patient information.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Float, Boolean
from sqlalchemy.orm import relationship

from auth.db import Base


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    dob = Column(String(10), nullable=True)  # YYYY-MM-DD. Age is always derived from this (utils.health_calculations.calculate_age), never stored.
    gender = Column(String(20), nullable=True)  # canonical: female | male | other | neutral — kept in sync with User.gender (see PatientService.update_profile)
    blood_group = Column(String(10), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    medical_history = Column(Text, nullable=True)

    # --- Health profile (collected at onboarding, feeds AI prediction pre-fill) ---
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)  # height_cm + weight_kg -> BMI, derived, never stored directly
    smoking = Column(Boolean, nullable=False, default=False)
    physical_activity_level = Column(String(20), nullable=True)  # sedentary | light | moderate | active — exactly the 4 levels ml.model.ACTIVITY_MAP encodes; kept in sync deliberately (see utils/health_calculations)
    family_history_diabetes = Column(Boolean, nullable=False, default=False)
    family_history_cvd = Column(Boolean, nullable=False, default=False)
    allergies = Column(Text, nullable=True)
    current_medications = Column(Text, nullable=True)
    dietary_preference = Column(String(30), nullable=True)  # vegetarian | vegan | non_vegetarian | eggetarian | other

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="patient_profile")