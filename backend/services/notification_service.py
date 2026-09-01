"""
MediGuard AI — Notification Service
====================================
Manages user notifications.
"""

from __future__ import annotations
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from models.notification import Notification

logger = logging.getLogger(__name__)

# Backend notifications are created with a *category* (link_request,
# verification, system, report) — the frontend instead wants a UI
# *severity* (success/warning/info/error). This maps category defaults;
# a notification can still be created with an explicit severity that
# overrides this (see `severity` param on `create`).
_CATEGORY_SEVERITY_DEFAULT = {
    "link_request": "info",
    "verification": "info",
    "system": "info",
    "report": "success",
}


def _severity_for(notification: Notification) -> str:
    if notification.type == "verification":
        msg = (notification.message or "").lower()
        if "reject" in msg or "declin" in msg:
            return "error"
        if "approv" in msg:
            return "success"
    return _CATEGORY_SEVERITY_DEFAULT.get(notification.type, "info")


class NotificationService:

    @staticmethod
    def _serialize(n: Notification) -> Dict[str, Any]:
        return {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "createdAt": n.created_at.isoformat(),
            "type": _severity_for(n),
            "read": n.is_read,
        }

    @staticmethod
    def get_user_notifications(db: Session, user_id: str, unread_only: bool = False) -> List[Dict[str, Any]]:
        """Fetch notifications for a given user, serialized for the API response."""
        query = db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.is_read == False)  # noqa: E712
        notifications = query.order_by(Notification.created_at.desc()).limit(50).all()
        return [NotificationService._serialize(n) for n in notifications]

    @staticmethod
    def mark_as_read(db: Session, notification_id: str, user_id: str) -> bool:
        """Mark notification as read. Returns False if not found or not owned by user_id."""
        n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
        if not n:
            return False
        n.is_read = True
        db.commit()
        return True

    @staticmethod
    def mark_all_as_read(db: Session, user_id: str) -> int:
        """Marks every unread notification for a user as read. Returns the count updated."""
        updated = (
            db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
            .update({"is_read": True})
        )
        db.commit()
        return updated

    @staticmethod
    def create(db: Session, user_id: str, title: str, message: str, category: str = "system") -> Notification:
        """Creates a notification. Used by other services (link requests, verification, reports, etc.)."""
        n = Notification(user_id=user_id, title=title, message=message, type=category)
        db.add(n)
        db.commit()
        db.refresh(n)
        return n
