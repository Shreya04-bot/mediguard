"""
MediGuard AI — User Serialization Helper
===========================================
Builds the single canonical user representation returned by every auth
endpoint (register/login/me). Doctors get `specialty` populated from
their DoctorProfile; patients get it as null.
"""

from __future__ import annotations
from sqlalchemy.orm import Session

from auth.db import User
from auth.schemas import UserOut
from utils.config import settings

def build_user_out(user: User, db: Session) -> UserOut:
    specialty = None
    if user.role == "doctor":
        from models.doctor_profile import DoctorProfile
        profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
        if profile:
            specialty = profile.specialization

    photo_url = user.avatar_url
    if photo_url and photo_url.startswith("/"):
        photo_url = f"{settings.public_base_url.rstrip('/')}{photo_url}"

    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        avatar=photo_url,
        specialty=specialty,
        verification_status=user.verification_status,
        preferred_language=user.preferred_language,
        created_at=user.created_at,
        gender=user.gender,
        avatar_key=user.avatar_key,
        profile_photo_url=photo_url,
    )