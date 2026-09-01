"""
MediGuard AI — User Preferences Routes
=======================================
Authenticated CRUD for per-user application preferences.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.db import User, get_db
from auth.dependencies import get_current_user
from models.user_preferences import UserPreferences


router = APIRouter()


class PreferencesUpdate(BaseModel):
    email_alerts: bool = Field(
        ...,
        description="Send email alerts for critical patient risk scores",
    )

    sms_alerts: bool = Field(
        ...,
        description="Enable SMS emergency dispatches",
    )

    ai_auto_sync: bool = Field(
        ...,
        description="Auto-save OCR lab report extractions to records",
    )


class PreferencesResponse(PreferencesUpdate):
    user_id: str


def _get_or_create_preferences(
    db: Session,
    user: User,
) -> UserPreferences:

    preferences = (
        db.query(UserPreferences)
        .filter(UserPreferences.user_id == user.id)
        .first()
    )

    if preferences is None:
        preferences = UserPreferences(
            user_id=user.id,
        )

        db.add(preferences)
        db.commit()
        db.refresh(preferences)

    return preferences


@router.get(
    "",
    response_model=PreferencesResponse,
    summary="Get current user's preferences",
)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    preferences = _get_or_create_preferences(
        db,
        current_user,
    )

    return PreferencesResponse(
        user_id=current_user.id,
        email_alerts=preferences.email_alerts,
        sms_alerts=preferences.sms_alerts,
        ai_auto_sync=preferences.ai_auto_sync,
    )


@router.patch(
    "",
    response_model=PreferencesResponse,
    summary="Save current user's preferences",
)
async def update_preferences(
    payload: PreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    preferences = _get_or_create_preferences(
        db,
        current_user,
    )

    preferences.email_alerts = payload.email_alerts
    preferences.sms_alerts = payload.sms_alerts
    preferences.ai_auto_sync = payload.ai_auto_sync

    db.commit()
    db.refresh(preferences)

    return PreferencesResponse(
        user_id=current_user.id,
        email_alerts=preferences.email_alerts,
        sms_alerts=preferences.sms_alerts,
        ai_auto_sync=preferences.ai_auto_sync,
    )