"""
MediGuard AI — Appointment Service
=====================================
Real appointment scheduling business logic: availability computation,
conflict/double-booking prevention, and status-transition validation.
Follows the static-method service-class convention used throughout this
codebase (see services/patient_service.py, services/doctor_service.py).
"""

from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta
from typing import List, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from models.appointment import Appointment, VALID_STATUS_TRANSITIONS
from models.user import User
from models.doctor_profile import DoctorProfile

logger = logging.getLogger(__name__)

# Fixed default clinic hours — not yet per-doctor-configurable (a
# disclosed scope boundary, not an oversight; see docs/API_DOCUMENTATION.md
# or PROJECT_FIX_CHECKLIST.md for how to extend this to real per-doctor
# schedules without changing the conflict-checking logic below).
CLINIC_OPEN = time(9, 0)
CLINIC_CLOSE = time(17, 0)
SLOT_MINUTES = 30
# Monday=0 ... Sunday=6 (Python's date.weekday()) — clinic closed Sundays.
CLINIC_CLOSED_WEEKDAYS = {6}

# "Active" = still occupies a slot (blocks booking / counts as a conflict).
ACTIVE_STATUSES = ("pending", "confirmed")


class AppointmentConflictError(Exception):
    """Raised when a requested slot is unavailable (past, closed, or already booked)."""


class AppointmentTransitionError(Exception):
    """Raised when a requested status change isn't a valid transition."""


class AppointmentAuthorizationError(Exception):
    """Raised when the acting user isn't allowed to perform this action on this appointment."""


class AppointmentService:

    # -- Availability -------------------------------------------------

    @staticmethod
    def list_doctors(db: Session) -> List[User]:
        """Doctors a patient can book — approved, active doctor accounts only."""
        return (
            db.query(User)
            .filter(User.role == "doctor", User.is_active == True, User.verification_status == "approved")  # noqa: E712
            .order_by(User.name)
            .all()
        )

    @staticmethod
    def _generate_slots(for_date: date) -> List[time]:
        if for_date.weekday() in CLINIC_CLOSED_WEEKDAYS:
            return []
        slots = []
        cur = datetime.combine(for_date, CLINIC_OPEN)
        end = datetime.combine(for_date, CLINIC_CLOSE)
        while cur + timedelta(minutes=SLOT_MINUTES) <= end:
            slots.append(cur.time())
            cur += timedelta(minutes=SLOT_MINUTES)
        return slots

    @staticmethod
    def get_available_slots(db: Session, doctor_id: str, for_date: date) -> List[str]:
        """Real availability: clinic-hours slots minus any slot already
        occupied by a pending/confirmed appointment for this doctor on
        this date. Past slots (if for_date is today) are excluded too."""
        all_slots = AppointmentService._generate_slots(for_date)
        if not all_slots:
            return []

        booked = (
            db.query(Appointment.start_time)
            .filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date == for_date,
                Appointment.status.in_(ACTIVE_STATUSES),
            )
            .all()
        )
        booked_times = {b[0] for b in booked}

        now = datetime.now()
        available = []
        for slot in all_slots:
            if slot in booked_times:
                continue
            if for_date == now.date() and slot <= now.time():
                continue  # past slot today
            available.append(slot.strftime("%H:%M"))
        return available

    @staticmethod
    def get_doctor_schedule(db: Session, doctor_id: str, for_date: date) -> List[Appointment]:
        return (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date == for_date,
                Appointment.status.in_(ACTIVE_STATUSES + ("completed",)),
            )
            .order_by(Appointment.start_time)
            .all()
        )

    # -- Create ---------------------------------------------------------

    @staticmethod
    def create_appointment(
        db: Session,
        patient_id: str,
        doctor_id: str,
        appointment_date: date,
        start_time_value: time,
        reason: str,
    ) -> Appointment:
        # Rule: doctor must be a real, approved, active doctor.
        doctor = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
        if not doctor:
            raise AppointmentConflictError("Selected doctor does not exist.")
        if not doctor.is_active or doctor.verification_status != "approved":
            raise AppointmentConflictError("Selected doctor is not currently accepting appointments.")

        # Rule: no past-dated bookings.
        now = datetime.now()
        requested_dt = datetime.combine(appointment_date, start_time_value)
        if requested_dt <= now:
            raise AppointmentConflictError("Cannot book an appointment in the past.")

        # Rule: must be a real generated slot within clinic hours (not an
        # arbitrary time — keeps every appointment aligned to the same grid,
        # which is what makes conflict-checking below correct and complete).
        if start_time_value not in AppointmentService._generate_slots(appointment_date):
            raise AppointmentConflictError("Requested time is outside clinic hours or not on the clinic's slot grid.")

        end_time_value = (datetime.combine(appointment_date, start_time_value) + timedelta(minutes=SLOT_MINUTES)).time()

        # Rule: doctor cannot have overlapping appointments — real conflict
        # check against the DB, not just an in-memory guess. Because
        # start_time is not unique-constrained at the DB level (SQLite +
        # this ORM setup doesn't give us a clean partial-unique-index
        # migration path here), this remains a check-then-insert with a
        # real, if narrow, race window — documented, not silently ignored.
        doctor_conflict = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date == appointment_date,
                Appointment.status.in_(ACTIVE_STATUSES),
                Appointment.start_time == start_time_value,
            )
            .first()
        )
        if doctor_conflict:
            raise AppointmentConflictError("This doctor already has an appointment at the selected time.")

        # Rule: patient cannot double-book the same slot (with any doctor).
        patient_conflict = (
            db.query(Appointment)
            .filter(
                Appointment.patient_id == patient_id,
                Appointment.appointment_date == appointment_date,
                Appointment.status.in_(ACTIVE_STATUSES),
                Appointment.start_time == start_time_value,
            )
            .first()
        )
        if patient_conflict:
            raise AppointmentConflictError("You already have an appointment booked at this time.")

        appt = Appointment(
            patient_id=patient_id,
            doctor_id=doctor_id,
            appointment_date=appointment_date,
            start_time=start_time_value,
            end_time=end_time_value,
            reason=reason,
            status="pending",
        )
        db.add(appt)
        db.commit()
        db.refresh(appt)
        return appt

    # -- Read (role-scoped) ---------------------------------------------

    @staticmethod
    def list_for_patient(db: Session, patient_id: str, status: Optional[str] = None) -> List[Appointment]:
        q = db.query(Appointment).filter(Appointment.patient_id == patient_id)
        if status:
            q = q.filter(Appointment.status == status)
        return q.order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc()).all()

    @staticmethod
    def list_for_doctor(db: Session, doctor_id: str, status: Optional[str] = None) -> List[Appointment]:
        q = db.query(Appointment).filter(Appointment.doctor_id == doctor_id)
        if status:
            q = q.filter(Appointment.status == status)
        return q.order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc()).all()

    @staticmethod
    def list_all(db: Session, status: Optional[str] = None, doctor_id: Optional[str] = None,
                 patient_id: Optional[str] = None) -> List[Appointment]:
        q = db.query(Appointment)
        if status:
            q = q.filter(Appointment.status == status)
        if doctor_id:
            q = q.filter(Appointment.doctor_id == doctor_id)
        if patient_id:
            q = q.filter(Appointment.patient_id == patient_id)
        return q.order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc()).all()

    @staticmethod
    def get_by_id(db: Session, appointment_id: str) -> Optional[Appointment]:
        return db.query(Appointment).filter(Appointment.id == appointment_id).first()

    # -- Authorization helpers -------------------------------------------

    @staticmethod
    def assert_can_view(appt: Appointment, user: User) -> None:
        if user.role == "admin":
            return
        if user.role == "patient" and appt.patient_id == user.id:
            return
        if user.role == "doctor" and appt.doctor_id == user.id:
            return
        raise AppointmentAuthorizationError("You are not authorized to view this appointment.")

    # -- Status transitions -----------------------------------------------

    @staticmethod
    def update_status(
        db: Session,
        appt: Appointment,
        new_status: str,
        acting_user: User,
        notes: Optional[str] = None,
        cancellation_reason: Optional[str] = None,
    ) -> Appointment:
        # Role rules: patients can only cancel their own pending/confirmed
        # appointment; doctors can confirm/reject/complete/cancel their own;
        # admins can do anything.
        if acting_user.role == "patient":
            if appt.patient_id != acting_user.id:
                raise AppointmentAuthorizationError("You can only manage your own appointments.")
            if new_status != "cancelled":
                raise AppointmentAuthorizationError("Patients may only cancel appointments.")
        elif acting_user.role == "doctor":
            if appt.doctor_id != acting_user.id:
                raise AppointmentAuthorizationError("You can only manage appointments assigned to you.")
            if new_status not in ("confirmed", "rejected", "cancelled", "completed"):
                raise AppointmentAuthorizationError(f"Doctors cannot set status to '{new_status}'.")
        elif acting_user.role != "admin":
            raise AppointmentAuthorizationError("Not authorized to update appointments.")

        allowed_next = VALID_STATUS_TRANSITIONS.get(appt.status, set())
        if new_status not in allowed_next:
            raise AppointmentTransitionError(
                f"Cannot transition appointment from '{appt.status}' to '{new_status}'. "
                f"Valid next states from '{appt.status}': {sorted(allowed_next) or 'none (terminal state)'}."
            )

        appt.status = new_status
        if notes is not None:
            appt.notes = notes
        if cancellation_reason is not None:
            appt.cancellation_reason = cancellation_reason
        db.commit()
        db.refresh(appt)

        if new_status == "confirmed":
            # Appointments are booked directly (see create_appointment) with
            # no prior doctor-patient link required. Once the doctor
            # confirms, treat that as consent to be that patient's doctor —
            # otherwise "My Patients" / analytics / patient history all stay
            # empty even after a full booked-and-completed appointment.
            from services.linking_service import LinkingService
            LinkingService.ensure_linked(db, doctor_id=appt.doctor_id, patient_id=appt.patient_id, source="confirmed appointment")

        logger.info("Appointment %s transitioned to %s by %s (%s)", appt.id, new_status, acting_user.id, acting_user.role)
        return appt