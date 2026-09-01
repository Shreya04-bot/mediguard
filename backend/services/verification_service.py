"""
MediGuard AI — Verification Service
====================================
Handles doctor profile verification queue, approval, and rejection workflows.
"""

from __future__ import annotations
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from models.user import User
from models.doctor_profile import DoctorProfile
from models.notification import Notification

logger = logging.getLogger(__name__)


class VerificationService:

    @staticmethod
    def get_pending_doctors(db: Session) -> List[Dict[str, Any]]:
        """Retrieve list of doctors waiting for verification."""
        results = (
            db.query(User, DoctorProfile)
            .join(DoctorProfile, User.id == DoctorProfile.user_id)
            .filter(User.role == "doctor", User.verification_status == "pending")
            .all()
        )
        return [
            {
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "verification_status": user.verification_status,
                "created_at": user.created_at.isoformat(),
                "medical_license": profile.medical_license,
                "hospital_name": profile.hospital_name,
                "specialization": profile.specialization,
                "license_upload": profile.license_upload,
                "experience_years": profile.experience_years,
                "bio": profile.bio,
            }
            for user, profile in results
        ]

    @staticmethod
    def update_doctor_status(db: Session, doctor_user_id: str, new_status: str, admin_id: str) -> User:
        """Approve or reject a doctor account."""
        if new_status not in ["approved", "rejected", "pending"]:
            raise ValueError("Invalid status value.")

        user = db.query(User).filter(User.id == doctor_user_id, User.role == "doctor").first()
        if not user:
            raise ValueError("Doctor account not found.")

        user.verification_status = new_status
        db.commit()
        db.refresh(user)

        # Notify doctor
        title = "Account Verification Update"
        msg = (
            f"Your doctor account has been approved! You now have access to patient records."
            if new_status == "approved"
            else f"Your doctor verification request was updated to: {new_status}."
        )
        notification = Notification(
            user_id=user.id,
            title=title,
            message=msg,
            type="verification",
        )
        db.add(notification)
        db.commit()

        logger.info("Admin %s updated Doctor %s status to %s", admin_id, doctor_user_id, new_status)
        return user
