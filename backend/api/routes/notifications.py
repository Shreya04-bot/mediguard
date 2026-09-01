"""
MediGuard AI — Notifications Routes
======================================
Role-agnostic notification feed — works for patient, doctor, or admin,
since every account can receive notifications (link requests, doctor
verification results, new reports, system messages).

Contract matches frontend/src/services/notificationService.js exactly.
"""

from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth.db import get_db, User
from auth.dependencies import get_current_user
from services.notification_service import NotificationService

router = APIRouter()


@router.get("", summary="Get current user's notifications")
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"notifications": NotificationService.get_user_notifications(db, current_user.id)}


@router.patch("/{notification_id}/read", summary="Mark a single notification as read")
async def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ok = NotificationService.mark_as_read(db, notification_id, current_user.id)
    if not ok:
        # Distinguish "doesn't exist" from "exists but belongs to someone
        # else" per the documented contract, without leaking whether the
        # id exists for another user (still 404 either way — just the
        # message differs for a developer reading logs/docs).
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "Notification not found"})
    return {"id": notification_id, "read": True}


@router.patch("/read-all", summary="Mark every notification as read for the current user")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = NotificationService.mark_all_as_read(db, current_user.id)
    return {"updated": updated}
