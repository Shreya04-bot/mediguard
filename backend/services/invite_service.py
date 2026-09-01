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

logger = logging.getLogger(__name__)


class InviteService:

    @staticmethod
    def create_admin_invitation(db: Session, inviter_id: str, email: str) -> Invitation:
        """Create a new invitation token for an admin."""
        email_clean = email.strip().lower()

        # Check if email is already a registered user
        existing_user = db.query(User).filter(User.email == email_clean).first()
        if existing_user:
            raise ValueError("A user with this email address already exists.")

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
        return invitation

    @staticmethod
    def validate_invitation(db: Session, token: str) -> Optional[Invitation]:
        """Validate whether an invitation token is active."""
        invitation = db.query(Invitation).filter(Invitation.token == token, Invitation.status == "pending").first()
        if not invitation:
            return None
        if invitation.expires_at < datetime.now(timezone.utc):
            invitation.status = "expired"
            db.commit()
            return None
        return invitation
