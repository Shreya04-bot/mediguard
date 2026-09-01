"""
MediGuard AI — Appointment Model
====================================
SQLAlchemy model for patient-doctor appointment scheduling. Follows the
same conventions as models/doctor_patient_link.py (existing precedent
for a patient<->doctor relationship table in this codebase).
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Date, Time, ForeignKey, Text, CheckConstraint
from sqlalchemy.orm import relationship

from auth.db import Base

# Explicit status values (per project requirement — no free-text status).
APPOINTMENT_STATUSES = ("pending", "confirmed", "rejected", "cancelled", "completed")

# Which status transitions are valid, keyed by (from_status) -> set of allowed to_status.
# Enforced in services/appointment_service.py, not just documented here.
VALID_STATUS_TRANSITIONS = {
    "pending": {"confirmed", "rejected", "cancelled"},
    "confirmed": {"cancelled", "completed"},
    "rejected": set(),      # terminal
    "cancelled": set(),     # terminal
    "completed": set(),     # terminal
}


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    appointment_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    reason = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending", index=True)
    notes = Column(Text, nullable=True)  # doctor-added notes (e.g. on completion)
    cancellation_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','confirmed','rejected','cancelled','completed')",
            name="ck_appointment_status",
        ),
    )
