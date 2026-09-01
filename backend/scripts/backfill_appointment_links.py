"""
MediGuard AI — Backfill: link doctors/patients from existing appointments
============================================================================
Fixes historical data only. The real bug (appointments never creating a
DoctorPatientLink) is fixed going forward in
services/appointment_service.py::update_status. But any appointment that
was already confirmed/completed *before* that fix won't retroactively
have a link — this script creates the missing links for those.

Safe to run multiple times: uses LinkingService.ensure_linked, which is
idempotent (no-op if an accepted link already exists).

Usage:
    cd backend
    python scripts/backfill_appointment_links.py
"""

from __future__ import annotations
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth.db import SessionLocal  # noqa: E402
from models.appointment import Appointment  # noqa: E402
from services.linking_service import LinkingService  # noqa: E402


def main() -> None:
    db = SessionLocal()
    try:
        appts = (
            db.query(Appointment)
            .filter(Appointment.status.in_(["confirmed", "completed"]))
            .all()
        )
        if not appts:
            print("No confirmed/completed appointments found — nothing to backfill.")
            return

        seen = set()
        created_or_fixed = 0
        for appt in appts:
            key = (appt.doctor_id, appt.patient_id)
            if key in seen:
                continue
            seen.add(key)
            LinkingService.ensure_linked(
                db, doctor_id=appt.doctor_id, patient_id=appt.patient_id, source="appointment backfill"
            )
            created_or_fixed += 1

        print(f"Checked {len(appts)} appointment(s) across {len(seen)} unique doctor-patient pair(s). "
              f"Ensured an accepted link for {created_or_fixed} pair(s) "
              f"(no-op for pairs already linked).")
    finally:
        db.close()


if __name__ == "__main__":
    main()