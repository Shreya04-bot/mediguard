"""
MediGuard AI — Verification / Password-Reset Token Model
===========================================================
Short-lived, single-use tokens issued after a successful OTP check.
- purpose="register": proves the email was OTP-verified; required by
  POST /auth/register.
- purpose="password_reset": proves identity was OTP-verified; required
  by POST /auth/password-reset/reset.

Raw tokens are never persisted — only a SHA-256 hash — so a leaked
database does not expose usable tokens.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean

from auth.db import Base


class VerificationToken(Base):
    __tablename__ = "verification_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False, index=True)
    purpose = Column(String(30), nullable=False, index=True)  # "register" | "password_reset"
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    consumed = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
