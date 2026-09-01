"""
MediGuard AI — User Model
===========================
SQLAlchemy ORM model representing system users across all roles (Patient, Doctor, Admin).
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship

from auth.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="patient", index=True)  # patient, doctor, admin
    verification_status = Column(String(20), nullable=False, default="approved", index=True)  # pending, approved, rejected
    preferred_language = Column(String(10), default="en", nullable=False)
    avatar_url = Column(String(500), nullable=True)  # uploaded profile photo URL (highest priority)
    gender = Column(String(20), nullable=True)  # UI/avatar gender: "female" | "male" | "neutral" — null treated as neutral. Distinct from PatientProfile.gender (clinical, used by the ML risk models).
    avatar_key = Column(String(50), nullable=True)  # bundled avatar identifier chosen by the user, e.g. "girl-avatar-2"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    predictions = relationship("PredictionHistory", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("MedicalReport", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship(
        "UserPreferences",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
