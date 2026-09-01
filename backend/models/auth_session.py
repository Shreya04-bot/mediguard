"""
MediGuard AI — Auth Session Model
===================================
Tracks issued refresh tokens and their paired access-token "jti"
(JWT ID) so that:
  - POST /auth/refresh can validate + rotate a refresh token.
  - POST /auth/logout (and password reset) can revoke a session,
    which get_current_user checks on every request — giving otherwise
    stateless JWTs real server-side revocation.

Only a SHA-256 hash of the refresh token is stored.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey

from auth.db import Base


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    access_jti = Column(String(36), nullable=False, unique=True, index=True)
    refresh_token_hash = Column(String(64), nullable=False, unique=True, index=True)
    user_agent = Column(String(255), nullable=True)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime, nullable=False)  # refresh token expiry
    revoked_at = Column(DateTime, nullable=True)
