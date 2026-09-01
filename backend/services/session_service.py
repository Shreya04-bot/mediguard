"""
MediGuard AI — Session Service
================================
Issues (access token, refresh token) pairs and tracks them in
AuthSession so that:
  - Refresh tokens can be rotated (POST /auth/refresh).
  - Sessions can be revoked server-side (POST /auth/logout, and on
    password reset — all existing sessions are killed so a stolen
    session can't outlive a password change).

Access tokens remain stateless JWTs; only the (jti -> session) link is
looked up on each request, keeping the hot path a single indexed
lookup rather than a full session-store read.
"""

from __future__ import annotations
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy.orm import Session as DbSession

from auth.db import User
from auth.security import create_access_token
from models.auth_session import AuthSession
from utils.config import settings


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


class SessionService:

    @staticmethod
    def issue(db: DbSession, user: User, user_agent: Optional[str] = None, ip_address: Optional[str] = None) -> Tuple[str, str]:
        """Creates a new access+refresh token pair and persists the session. Returns (access_token, refresh_token)."""
        jti = secrets.token_hex(16)
        access_token = create_access_token(
            subject=user.id,
            extra_claims={"role": user.role, "verification_status": user.verification_status, "jti": jti},
        )
        refresh_token = secrets.token_urlsafe(48)

        session = AuthSession(
            user_id=user.id,
            access_jti=jti,
            refresh_token_hash=_hash(refresh_token),
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=_now() + timedelta(days=settings.refresh_token_expire_days),
        )
        db.add(session)
        db.commit()
        return access_token, refresh_token

    @staticmethod
    def is_jti_revoked(db: DbSession, jti: Optional[str]) -> bool:
        """True if the access token's session was explicitly revoked (logout, password reset)."""
        if not jti:
            return False
        session = db.query(AuthSession).filter(AuthSession.access_jti == jti).first()
        return session is not None and session.revoked_at is not None

    @staticmethod
    def revoke_by_jti(db: DbSession, jti: Optional[str]) -> None:
        if not jti:
            return
        session = db.query(AuthSession).filter(AuthSession.access_jti == jti).first()
        if session and session.revoked_at is None:
            session.revoked_at = _now()
            db.commit()

    @staticmethod
    def revoke_all_for_user(db: DbSession, user_id: str) -> None:
        """Kills every active session for a user — used after a password reset."""
        db.query(AuthSession).filter(
            AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)
        ).update({"revoked_at": _now()})
        db.commit()

    @staticmethod
    def find_user_id_for_refresh_token(db: DbSession, refresh_token: str) -> Optional[str]:
        session = (
            db.query(AuthSession)
            .filter(AuthSession.refresh_token_hash == _hash(refresh_token))
            .first()
        )
        if session is None or session.revoked_at is not None or session.expires_at.replace(tzinfo=timezone.utc) < _now():
            return None
        return session.user_id

    @staticmethod
    def rotate(db: DbSession, refresh_token: str, user: User, user_agent: Optional[str] = None, ip_address: Optional[str] = None) -> Optional[Tuple[str, str]]:
        """
        Validates a refresh token, revokes its old session, and issues a
        brand-new access+refresh pair (rotation limits the blast radius of
        a leaked refresh token to a single use).
        """
        token_hash = _hash(refresh_token)
        session = (
            db.query(AuthSession)
            .filter(AuthSession.refresh_token_hash == token_hash, AuthSession.user_id == user.id)
            .first()
        )
        if session is None or session.revoked_at is not None or session.expires_at.replace(tzinfo=timezone.utc) < _now():
            return None  # caller raises 401

        session.revoked_at = _now()
        db.commit()
        return SessionService.issue(db, user, user_agent, ip_address)
