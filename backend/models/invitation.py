"""
MediGuard AI — Invitation Model
=================================
SQLAlchemy model for administrative user invitations.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, String, DateTime, ForeignKey

from auth.db import Base


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    inviter_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    role = Column(String(20), nullable=False, default="admin")
    token = Column(String(100), nullable=False, unique=True, index=True)
    status = Column(String(20), nullable=False, default="pending")  # pending, accepted, expired
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime, default=lambda: datetime.now(timezone.utc) + timedelta(days=7), nullable=False)
