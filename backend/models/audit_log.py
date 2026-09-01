"""
MediGuard AI — AuditLog Model
================================
SQLAlchemy model storing security and administrative audit events.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text

from auth.db import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)  # JSON string
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
