"""
MediGuard AI — OTP Code Model
==============================
Stores hashed one-time codes used to verify email ownership before an
account is created, and to confirm identity before a password reset.
Raw codes are never persisted — only a SHA-256 hash.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Boolean

from auth.db import Base


class OtpCode(Base):
    __tablename__ = "otp_codes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False, index=True)
    purpose = Column(String(30), nullable=False, index=True)  # "register" | "password_reset"
    code_hash = Column(String(64), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=5, nullable=False)
    consumed = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
