"""
MediGuard AI — Invite Service
==============================
Handles admin invitations for onboarding new administrative users.
"""

from __future__ import annotations
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from models.invitation import Invitation
from models.user import User
from services.email_service import EmailService
from utils.config import settings

logger = logging.getLogger(__name__)


class InviteService:

    @staticmethod
    def create_admin_invitation(db: Session, inviter_id: str, email: str) -> Invitation:
        """Create a new invitation token for an admin and email the accept-link."""
        email_clean = email.strip().lower()

        # Check if email is already a registered user
        existing_user = db.query(User).filter(User.email == email_clean).first()
        if existing_user:
            raise ValueError("A user with this email address already exists.")

        # An unexpired pending invite for this email already exists — reuse
        # it instead of creating a second, orphaned token for the same
        # invitee (avoids the accept-link in an earlier email silently
        # becoming stale the moment a second invite is sent).
        existing_invite = (
            db.query(Invitation)
            .filter(Invitation.email == email_clean, Invitation.status == "pending")
            .first()
        )
        # .replace(tzinfo=timezone.utc): SQLite strips tzinfo on read-back
        # even though expires_at was written as UTC-aware — comparing a
        # naive value straight against datetime.now(timezone.utc) raises
        # TypeError. Same fix already used in otp_service.py/session_service.py.
        if existing_invite and existing_invite.expires_at.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc):
            InviteService._send_invite_email(existing_invite)
            return existing_invite

        token = secrets.token_urlsafe(32)
        invitation = Invitation(
            inviter_id=inviter_id,
            email=email_clean,
            role="admin",
            token=token,
            status="pending",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db.add(invitation)
        db.commit()
        db.refresh(invitation)

        logger.info("Admin %s invited new admin: %s", inviter_id, email_clean)
        InviteService._send_invite_email(invitation)
        return invitation

    @staticmethod
    def _send_invite_email(invitation: Invitation) -> None:
        accept_url = f"{settings.frontend_base_url.rstrip('/')}/accept-invite?token={invitation.token}"
        subject = "You've been invited to MediGuard AI as an administrator"
        body = (
            f"You've been invited to join MediGuard AI as a platform administrator.\n\n"
            f"Accept your invitation and set up your account here:\n{accept_url}\n\n"
            f"This invite link expires on "
            f"{invitation.expires_at.strftime('%Y-%m-%d %H:%M UTC')}. "
            f"If you weren't expecting this, you can ignore this email."
        )
        try:
            EmailService.send(invitation.email, subject, body)
        except Exception:
            # Best-effort: the invite row (and its token, returned in the
            # POST /admin/invite response for the inviting admin to copy
            # manually) still exists even if outbound email delivery fails.
            logger.warning("Could not send invite email to %s", invitation.email, exc_info=True)

    @staticmethod
    def validate_invitation(db: Session, token: str) -> Optional[Invitation]:
        """Validate whether an invitation token is active."""
        invitation = db.query(Invitation).filter(Invitation.token == token, Invitation.status == "pending").first()
        if not invitation:
            return None
        # See comment above re: SQLite stripping tzinfo on read-back.
        if invitation.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            invitation.status = "expired"
            db.commit()
            return None
        return invitation

    @staticmethod
    def accept_invitation(db: Session, token: str, name: str, password: str) -> User:
        """Consume a valid invitation token and create the admin account it grants."""
        from auth.security import hash_password

        invitation = InviteService.validate_invitation(db, token)
        if not invitation:
            raise ValueError("This invite link is invalid or has expired.")

        # Guard against a race where the invitee (or someone else) already
        # registered this email through another path between invite
        # creation and acceptance.
        if db.query(User).filter(User.email == invitation.email).first():
            raise ValueError("A user with this email address already exists.")

        user = User(
            name=name.strip(),
            email=invitation.email,
            hashed_password=hash_password(password),
            role=invitation.role,
            verification_status="approved",
            is_active=True,
        )
        db.add(user)

        invitation.status = "accepted"

        db.commit()
        db.refresh(user)

        logger.info("Invitation %s accepted — new %s account: %s", invitation.id, invitation.role, invitation.email)
        return user