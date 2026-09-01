"""
MediGuard AI — MedicalReport Model
===================================
SQLAlchemy model storing uploaded lab reports and extracted clinical values.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from auth.db import Base


class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    report_name = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)  # pdf, image
    file_path = Column(String(500), nullable=True)
    extracted_data = Column(Text, nullable=True)  # JSON string
    summary = Column(Text, nullable=True)
    flags = Column(Text, nullable=True)  # JSON list string
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="reports")
