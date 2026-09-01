"""
MediGuard AI — User Preferences Model
======================================
Persistent per-user application preferences.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship

from auth.db import Base


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    email_alerts = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    sms_alerts = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    ai_auto_sync = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="preferences",
        uselist=False,
    )