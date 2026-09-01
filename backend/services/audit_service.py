"""
MediGuard AI — Audit Service
=============================
Handles system security auditing and admin log review.
"""

from __future__ import annotations
import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from models.audit_log import AuditLog
from models.user import User

logger = logging.getLogger(__name__)


class AuditService:

    @staticmethod
    def log(
        db: Session,
        action: str,
        resource: str,
        user_id: Optional[str] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """Create a new audit log entry."""
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            details=json.dumps(details) if details else None,
            ip_address=ip_address,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def get_logs(db: Session, limit: int = 100, action: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve audit logs for admin audit dashboard."""
        query = db.query(AuditLog, User).outerjoin(User, AuditLog.user_id == User.id)
        if action:
            query = query.filter(AuditLog.action == action)
        results = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()

        output = []
        for log, user in results:
            try:
                dt = json.loads(log.details) if log.details else {}
            except Exception:
                dt = {}
            output.append({
                "id": log.id,
                "user_id": log.user_id,
                "user_name": user.name if user else "System",
                "user_email": user.email if user else None,
                "user_role": user.role if user else "system",
                "action": log.action,
                "resource": log.resource,
                "details": dt,
                "ip_address": log.ip_address,
                "timestamp": log.timestamp.isoformat(),
            })
        return output
