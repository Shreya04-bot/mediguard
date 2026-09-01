"""
MediGuard AI — Auth Database & ORM Setup
=========================================
SQLite-backed database store holding accounts, profiles, logs, links, predictions, and reports.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
import uuid

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

DB_PATH = os.getenv("AUTH_DB_PATH", "./data/mediguard_users.db")
os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Bug fix (pre-existing in original codebase), hardened ----------------
# Nearly every route module does `from auth.db import get_db, User`, but this
# module never actually defined or re-exported `User` — it lived only in
# models/user.py. The straightforward fix (eagerly importing it here, after
# Base is defined) works *only* when auth.db happens to be the first module
# imported in the process — true in normal app startup (auth_routes.py is
# always imported first), but not guaranteed: importing models.schemas (or
# the models package) first instead deadlocks, since models/user.py's own
# `from auth.db import Base` would re-enter this partially-initialized
# module before `User` exists here yet.
#
# PEP 562 module-level __getattr__ avoids the ordering dependency entirely:
# the models.user import is deferred until `auth.db.User` is actually
# accessed, which is always after both modules have finished their own
# top-level code, regardless of which one started the import chain.
def __getattr__(name: str):
    if name == "User":
        from models.user import User as _User
        return _User
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def init_db() -> None:
    """Create tables if they don't exist and seed default admin user."""
    # Import models so Base.metadata is fully populated
    from models.user import User
    from models.patient import PatientProfile
    from models.doctor_profile import DoctorProfile
    from models.doctor_patient_link import DoctorPatientLink
    from models.prediction_history import PredictionHistory
    from models.report import MedicalReport
    from models.audit_log import AuditLog
    from models.notification import Notification
    from models.invitation import Invitation
    from models.otp_code import OtpCode
    from models.verification_token import VerificationToken
    from models.auth_session import AuthSession
    from models.family_member import FamilyMember
    from models.appointment import Appointment

    Base.metadata.create_all(bind=engine)

    # Seed default admin if no user exists
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "admin").first()
        if not admin:
            from auth.security import hash_password
            admin_user = User(
                id=str(uuid.uuid4()),
                name="System Administrator",
                email="admin@mediguard.ai",
                hashed_password=hash_password("Admin@123456"),
                role="admin",
                verification_status="approved",
                preferred_language="en",
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
