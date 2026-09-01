"""
MediGuard AI — Appointment API Routes
=========================================
Real appointment scheduling: booking, doctor availability, status
transitions (confirm/reject/cancel/complete), role-scoped listing.
Follows this codebase's existing router/RBAC conventions (see
api/routes/doctor_routes.py, api/routes/patient_routes.py).
"""

from __future__ import annotations

import logging
from datetime import date as date_type, datetime, time as time_type
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth.db import get_db, User
from auth.dependencies import get_current_user, require_role
from models.schemas import (
    AppointmentCreateRequest,
    AppointmentResponse,
    AppointmentStatusUpdateRequest,
    AvailableSlotsResponse,
    DoctorSummary,
)
from models.appointment import Appointment
from services.appointment_service import (
    AppointmentService,
    AppointmentConflictError,
    AppointmentTransitionError,
    AppointmentAuthorizationError,
    CLINIC_OPEN,
    CLINIC_CLOSE,
)
from utils.rate_limit import check_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter()


def _to_response(appt: Appointment) -> AppointmentResponse:
    return AppointmentResponse(
        id=appt.id,
        patient_id=appt.patient_id,
        patient_name=getattr(appt.patient, "name", None),
        doctor_id=appt.doctor_id,
        doctor_name=getattr(appt.doctor, "name", None),
        doctor_specialization=(
            appt.doctor.doctor_profile.specialization
            if getattr(appt.doctor, "doctor_profile", None) else None
        ),
        appointment_date=appt.appointment_date.isoformat(),
        start_time=appt.start_time.strftime("%H:%M"),
        end_time=appt.end_time.strftime("%H:%M"),
        reason=appt.reason,
        status=appt.status,
        notes=appt.notes,
        cancellation_reason=appt.cancellation_reason,
        created_at=appt.created_at.isoformat(),
        updated_at=appt.updated_at.isoformat(),
    )


def _parse_date(value: str) -> date_type:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="date must be in YYYY-MM-DD format")


def _parse_time(value: str) -> time_type:
    try:
        return datetime.strptime(value, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="start_time must be in HH:MM (24-hour) format")


# ---------------------------------------------------------------------------
# Discovery — available doctors and slots
# ---------------------------------------------------------------------------

@router.get("/doctors", response_model=List[DoctorSummary], summary="List doctors available for booking")
async def list_available_doctors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doctors = AppointmentService.list_doctors(db)
    return [
        DoctorSummary(
            id=d.id,
            name=d.name,
            specialization=(d.doctor_profile.specialization if d.doctor_profile else None),
            hospital_name=(d.doctor_profile.hospital_name if d.doctor_profile else None),
            experience_years=(d.doctor_profile.experience_years if d.doctor_profile else None),
        )
        for d in doctors
    ]


@router.get("/doctors/{doctor_id}/slots", response_model=AvailableSlotsResponse, summary="Get a doctor's available slots for a date")
async def get_available_slots(
    doctor_id: str,
    date: str = Query(..., description="YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parsed_date = _parse_date(date)
    slots = AppointmentService.get_available_slots(db, doctor_id, parsed_date)
    return AvailableSlotsResponse(
        doctor_id=doctor_id,
        date=date,
        available_slots=slots,
        clinic_hours=f"{CLINIC_OPEN.strftime('%H:%M')}-{CLINIC_CLOSE.strftime('%H:%M')}, Mon-Sat",
    )


@router.get("/doctors/{doctor_id}/schedule", response_model=List[AppointmentResponse], summary="Doctor's booked schedule for a date (doctor/admin only)")
async def get_doctor_schedule(
    doctor_id: str,
    date: str = Query(..., description="YYYY-MM-DD"),
    current_user: User = Depends(require_role("doctor", "admin")),
    db: Session = Depends(get_db),
):
    if current_user.role == "doctor" and current_user.id != doctor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctors can only view their own schedule.")
    parsed_date = _parse_date(date)
    appts = AppointmentService.get_doctor_schedule(db, doctor_id, parsed_date)
    return [_to_response(a) for a in appts]


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------

@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED, summary="Book an appointment (patient only)")
async def create_appointment(
    payload: AppointmentCreateRequest,
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    check_rate_limit("appointment_create", current_user.id, max_requests=20, window_seconds=60)
    parsed_date = _parse_date(payload.appointment_date)
    parsed_time = _parse_time(payload.start_time)
    try:
        appt = AppointmentService.create_appointment(
            db=db,
            patient_id=current_user.id,
            doctor_id=payload.doctor_id,
            appointment_date=parsed_date,
            start_time_value=parsed_time,
            reason=payload.reason,
        )
    except AppointmentConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return _to_response(appt)


# ---------------------------------------------------------------------------
# Listing — role-scoped
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[AppointmentResponse], summary="List appointments (role-scoped: own for patient/doctor, all for admin)")
async def list_appointments(
    status_filter: Optional[str] = Query(None, alias="status"),
    doctor_id: Optional[str] = Query(None, description="Admin only: filter by doctor"),
    patient_id: Optional[str] = Query(None, description="Admin only: filter by patient"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "patient":
        appts = AppointmentService.list_for_patient(db, current_user.id, status_filter)
    elif current_user.role == "doctor":
        appts = AppointmentService.list_for_doctor(db, current_user.id, status_filter)
    elif current_user.role == "admin":
        appts = AppointmentService.list_all(db, status_filter, doctor_id, patient_id)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")
    return [_to_response(a) for a in appts]


@router.get("/{appointment_id}", response_model=AppointmentResponse, summary="Get a single appointment")
async def get_appointment(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = AppointmentService.get_by_id(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    try:
        AppointmentService.assert_can_view(appt, current_user)
    except AppointmentAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    return _to_response(appt)


# ---------------------------------------------------------------------------
# Status transitions
# ---------------------------------------------------------------------------

@router.patch("/{appointment_id}", response_model=AppointmentResponse, summary="Update appointment status (confirm/reject/cancel/complete)")
async def update_appointment_status(
    appointment_id: str,
    payload: AppointmentStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = AppointmentService.get_by_id(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    try:
        updated = AppointmentService.update_status(
            db=db,
            appt=appt,
            new_status=payload.status.value,
            acting_user=current_user,
            notes=payload.notes,
            cancellation_reason=payload.cancellation_reason,
        )
    except AppointmentAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except AppointmentTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return _to_response(updated)


@router.delete("/{appointment_id}", response_model=AppointmentResponse, summary="Cancel an appointment (shortcut for PATCH status=cancelled)")
async def cancel_appointment(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = AppointmentService.get_by_id(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    try:
        updated = AppointmentService.update_status(
            db=db, appt=appt, new_status="cancelled", acting_user=current_user,
        )
    except AppointmentAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except AppointmentTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return _to_response(updated)
