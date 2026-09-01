"""
MediGuard AI — OTP Service
============================
Shared logic behind both OTP flows:
  - Registration email verification (purpose="register")
  - Password reset identity verification (purpose="password_reset")

Design notes:
  - Codes and tokens are stored as SHA-256 hashes only — never raw.
  - Rate limiting is DB-backed (counts OtpCode rows created in the
    trailing window), so it works correctly across multiple backend
    processes without needing Redis for this scale of app.
  - Verification tokens are single-use and short-lived, and are
    checked again (not just trusted blindly) at the point of use in
    auth_routes.py.
"""

from __future__ import annotations
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.otp_code import OtpCode
from models.verification_token import VerificationToken
from services.email_service import EmailService
from utils.config import settings


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


class OtpRateLimitedError(HTTPException):
    def __init__(self, retry_after_seconds: int):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Too many attempts. Try again later.",
                "code": "OTP_RATE_LIMITED",
                "retryAfterSeconds": retry_after_seconds,
            },
        )


class OtpService:

    @staticmethod
    def check_rate_limit(db: Session, email: str, purpose: str) -> None:
        """Raises OtpRateLimitedError if too many OTPs were requested recently."""
        window_start = _now() - timedelta(minutes=settings.otp_rate_limit_window_minutes)
        recent_count = (
            db.query(OtpCode)
            .filter(
                OtpCode.email == email,
                OtpCode.purpose == purpose,
                OtpCode.created_at >= window_start,
            )
            .count()
        )
        if recent_count >= settings.otp_rate_limit_max:
            oldest = (
                db.query(OtpCode)
                .filter(OtpCode.email == email, OtpCode.purpose == purpose, OtpCode.created_at >= window_start)
                .order_by(OtpCode.created_at.asc())
                .first()
            )
            retry_after = settings.otp_rate_limit_window_minutes * 60
            if oldest:
                elapsed = (_now() - oldest.created_at.replace(tzinfo=timezone.utc)).total_seconds()
                retry_after = max(1, int(settings.otp_rate_limit_window_minutes * 60 - elapsed))
            raise OtpRateLimitedError(retry_after)

    @staticmethod
    def generate_and_send(db: Session, email: str, purpose: str) -> int:
        """Creates a new OTP, stores its hash, emails it, and returns expiresInSeconds."""
        OtpService.check_rate_limit(db, email, purpose)

        code = f"{secrets.randbelow(1_000_000):06d}"
        otp_row = OtpCode(
            email=email,
            purpose=purpose,
            code_hash=_hash(code),
            attempts=0,
            max_attempts=settings.otp_max_attempts,
            consumed=False,
            expires_at=_now() + timedelta(seconds=settings.otp_expire_seconds),
        )
        db.add(otp_row)
        db.commit()

        EmailService.send_otp(email, code, purpose)
        return settings.otp_expire_seconds

    @staticmethod
    def verify(db: Session, email: str, otp: str, purpose: str) -> str:
        """
        Verifies an OTP and, on success, issues a single-use verification
        token (raw value returned to caller; only its hash is stored).
        Raises HTTPException(400/410) on failure per the documented contract.
        """
        row: Optional[OtpCode] = (
            db.query(OtpCode)
            .filter(OtpCode.email == email, OtpCode.purpose == purpose, OtpCode.consumed == False)  # noqa: E712
            .order_by(OtpCode.created_at.desc())
            .first()
        )

        if row is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "Incorrect code", "code": "OTP_INCORRECT", "attemptsRemaining": 0},
            )

        if row.expires_at.replace(tzinfo=timezone.utc) < _now():
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail={"error": "Code expired, request a new one", "code": "OTP_EXPIRED"},
            )

        if row.attempts >= row.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail={"error": "Code expired, request a new one", "code": "OTP_EXPIRED"},
            )

        if _hash(otp) != row.code_hash:
            row.attempts += 1
            db.commit()
            remaining = max(0, row.max_attempts - row.attempts)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "Incorrect code", "code": "OTP_INCORRECT", "attemptsRemaining": remaining},
            )

        row.consumed = True
        db.commit()

        raw_token = secrets.token_urlsafe(32)
        expire_seconds = (
            settings.verification_token_expire_seconds
            if purpose == "register"
            else settings.reset_token_expire_seconds
        )
        token_row = VerificationToken(
            email=email,
            purpose=purpose,
            token_hash=_hash(raw_token),
            consumed=False,
            expires_at=_now() + timedelta(seconds=expire_seconds),
        )
        db.add(token_row)
        db.commit()
        return raw_token

    @staticmethod
    def consume_verification_token(db: Session, email: str, raw_token: str, purpose: str) -> None:
        """
        Validates and consumes a verification/reset token. Raises 401 with
        the documented error codes if invalid, expired, already used, or
        issued for a different email/purpose.
        """
        row: Optional[VerificationToken] = (
            db.query(VerificationToken)
            .filter(VerificationToken.token_hash == _hash(raw_token), VerificationToken.purpose == purpose)
            .first()
        )
        error_code = "OTP_VERIFICATION_REQUIRED" if purpose == "register" else "RESET_TOKEN_INVALID"
        error_message = (
            "Email verification required or expired"
            if purpose == "register"
            else "Reset token invalid or expired"
        )
        if (
            row is None
            or row.consumed
            or row.email.lower() != email.lower()
            or row.expires_at.replace(tzinfo=timezone.utc) < _now()
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": error_message, "code": error_code},
            )
        row.consumed = True
        db.commit()
