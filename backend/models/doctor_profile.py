"""
MediGuard AI — DoctorProfile Model
===================================
SQLAlchemy model holding doctor accreditation and professional details.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship

from auth.db import Base


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    medical_license = Column(String(100), nullable=False)
    hospital_name = Column(String(200), nullable=False)
    specialization = Column(String(100), nullable=False)
    license_upload = Column(String(500), nullable=True)  # Document path / URL
    experience_years = Column(Integer, default=0)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="doctor_profile")
