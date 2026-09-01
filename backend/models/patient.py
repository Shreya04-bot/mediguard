"""
MediGuard AI — PatientProfile Model
====================================
SQLAlchemy model holding extended patient information.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from auth.db import Base


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    dob = Column(String(10), nullable=True)  # YYYY-MM-DD
    gender = Column(String(20), nullable=True)
    blood_group = Column(String(10), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    medical_history = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="patient_profile")
