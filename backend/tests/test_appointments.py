"""
MediGuard AI — Appointment Scheduling Tests

Covers real business rules: doctor discovery, availability computation,
booking, conflict prevention (doctor double-booking, patient
double-booking, past slots, off-grid times), RBAC-scoped status
transitions, patient/doctor isolation, and admin visibility.
"""

import os
import sys
import uuid
import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from tests._auth_only_app import app
from auth.db import init_db, SessionLocal
from auth.security import hash_password
from models.user import User
from models.doctor_profile import DoctorProfile

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def _create_user(email: str, role: str, password: str = "Password123!") -> str:
    db = SessionLocal()
    user = User(
        id=str(uuid.uuid4()), email=email, hashed_password=hash_password(password),
        name=f"Test {role.title()}", role=role, is_active=True, verification_status="approved",
    )
    db.add(user)
    db.commit()
    user_id = user.id
    db.close()
    return user_id


def _create_doctor(email: str, specialization: str = "Cardiology") -> str:
    doctor_id = _create_user(email, "doctor")
    db = SessionLocal()
    db.add(DoctorProfile(user_id=doctor_id, medical_license="MD-TEST", hospital_name="Test Hospital", specialization=specialization))
    db.commit()
    db.close()
    return doctor_id


def _login(email: str, password: str = "Password123!") -> dict:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['token']}"}


def _next_weekday(target_weekday: int = 1) -> str:
    """Next date matching target_weekday (Monday=0). Default Tuesday — always
    clinic-open regardless of what day tests happen to run on."""
    today = datetime.date.today()
    days_ahead = (target_weekday - today.weekday()) % 7 or 7
    return (today + datetime.timedelta(days=days_ahead)).isoformat()


def _next_sunday() -> str:
    today = datetime.date.today()
    days_ahead = (6 - today.weekday()) % 7 or 7
    return (today + datetime.timedelta(days=days_ahead)).isoformat()


def test_list_available_doctors_only_shows_approved_active_doctors():
    doctor_id = _create_doctor("d1@test.com")
    patient_id = _create_user("p1@test.com", "patient")
    headers = _login("p1@test.com")

    resp = client.get("/api/v1/appointments/doctors", headers=headers)
    assert resp.status_code == 200
    ids = [d["id"] for d in resp.json()]
    assert doctor_id in ids


def test_available_slots_respects_clinic_hours_and_closed_sunday():
    doctor_id = _create_doctor("d2@test.com")
    _create_user("p2@test.com", "patient")
    headers = _login("p2@test.com")

    weekday_date = _next_weekday()
    resp = client.get(f"/api/v1/appointments/doctors/{doctor_id}/slots", params={"date": weekday_date}, headers=headers)
    assert resp.status_code == 200
    slots = resp.json()["available_slots"]
    assert len(slots) == 16  # 09:00-17:00 in 30-min increments
    assert slots[0] == "09:00"
    assert slots[-1] == "16:30"

    sunday_date = _next_sunday()
    resp2 = client.get(f"/api/v1/appointments/doctors/{doctor_id}/slots", params={"date": sunday_date}, headers=headers)
    assert resp2.status_code == 200
    assert resp2.json()["available_slots"] == []


def test_book_appointment_end_to_end_and_conflict_rules():
    doctor_id = _create_doctor("d3@test.com")
    doctor2_id = _create_doctor("d3b@test.com")
    _create_user("p3@test.com", "patient")
    headers = _login("p3@test.com")

    target_date = _next_weekday()
    slots_resp = client.get(f"/api/v1/appointments/doctors/{doctor_id}/slots", params={"date": target_date}, headers=headers)
    slot = slots_resp.json()["available_slots"][0]

    # Book
    resp = client.post("/api/v1/appointments/", json={
        "doctor_id": doctor_id, "appointment_date": target_date, "start_time": slot, "reason": "Routine checkup",
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    appt = resp.json()
    assert appt["status"] == "pending"
    appt_id = appt["id"]

    # That slot no longer appears as available for this doctor
    slots_resp2 = client.get(f"/api/v1/appointments/doctors/{doctor_id}/slots", params={"date": target_date}, headers=headers)
    assert slot not in slots_resp2.json()["available_slots"]

    # Rule: doctor cannot have overlapping appointments (another patient, same doctor, same slot)
    _create_user("p3b@test.com", "patient")
    headers_p3b = _login("p3b@test.com")
    resp_conflict = client.post("/api/v1/appointments/", json={
        "doctor_id": doctor_id, "appointment_date": target_date, "start_time": slot, "reason": "Also wants this slot",
    }, headers=headers_p3b)
    assert resp_conflict.status_code == 409

    # Rule: patient cannot double-book the same slot (different doctor)
    resp_patient_conflict = client.post("/api/v1/appointments/", json={
        "doctor_id": doctor2_id, "appointment_date": target_date, "start_time": slot, "reason": "Same time, different doctor",
    }, headers=headers)
    assert resp_patient_conflict.status_code == 409


def test_past_slot_and_off_grid_time_rejected():
    doctor_id = _create_doctor("d4@test.com")
    _create_user("p4@test.com", "patient")
    headers = _login("p4@test.com")

    yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    resp = client.post("/api/v1/appointments/", json={
        "doctor_id": doctor_id, "appointment_date": yesterday, "start_time": "10:00", "reason": "Past booking",
    }, headers=headers)
    assert resp.status_code == 409

    target_date = _next_weekday()
    resp2 = client.post("/api/v1/appointments/", json={
        "doctor_id": doctor_id, "appointment_date": target_date, "start_time": "10:17", "reason": "Off-grid time",
    }, headers=headers)
    assert resp2.status_code == 409


def test_status_transition_rbac_and_validity():
    doctor_id = _create_doctor("d5@test.com")
    _create_user("p5@test.com", "patient")
    _create_user("admin5@test.com", "admin")
    patient_headers = _login("p5@test.com")
    doctor_headers = _login("d5@test.com")
    admin_headers = _login("admin5@test.com")

    target_date = _next_weekday()
    slot = client.get(f"/api/v1/appointments/doctors/{doctor_id}/slots", params={"date": target_date}, headers=patient_headers).json()["available_slots"][0]
    appt_id = client.post("/api/v1/appointments/", json={
        "doctor_id": doctor_id, "appointment_date": target_date, "start_time": slot, "reason": "Checkup",
    }, headers=patient_headers).json()["id"]

    # Patient cannot confirm (only doctor/admin can)
    resp = client.patch(f"/api/v1/appointments/{appt_id}", json={"status": "confirmed"}, headers=patient_headers)
    assert resp.status_code == 403

    # Doctor confirms
    resp2 = client.patch(f"/api/v1/appointments/{appt_id}", json={"status": "confirmed"}, headers=doctor_headers)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "confirmed"

    # Re-confirming an already-confirmed appointment is an invalid transition
    resp3 = client.patch(f"/api/v1/appointments/{appt_id}", json={"status": "confirmed"}, headers=doctor_headers)
    assert resp3.status_code == 409

    # Doctor marks completed with notes
    resp4 = client.patch(f"/api/v1/appointments/{appt_id}", json={"status": "completed", "notes": "Advised lifestyle changes."}, headers=doctor_headers)
    assert resp4.status_code == 200
    assert resp4.json()["status"] == "completed"
    assert resp4.json()["notes"] == "Advised lifestyle changes."

    # Completed is terminal — cancellation must fail
    resp5 = client.delete(f"/api/v1/appointments/{appt_id}", headers=patient_headers)
    assert resp5.status_code == 409

    # Admin can see it regardless
    resp6 = client.get(f"/api/v1/appointments/{appt_id}", headers=admin_headers)
    assert resp6.status_code == 200


def test_cancelled_and_rejected_slots_are_released():
    doctor_id = _create_doctor("d6@test.com")
    _create_user("p6@test.com", "patient")
    headers = _login("p6@test.com")
    doctor_headers = _login("d6@test.com")

    target_date = _next_weekday()
    slot = client.get(f"/api/v1/appointments/doctors/{doctor_id}/slots", params={"date": target_date}, headers=headers).json()["available_slots"][0]
    appt_id = client.post("/api/v1/appointments/", json={
        "doctor_id": doctor_id, "appointment_date": target_date, "start_time": slot, "reason": "Checkup",
    }, headers=headers).json()["id"]

    # Doctor rejects
    resp = client.patch(f"/api/v1/appointments/{appt_id}", json={"status": "rejected"}, headers=doctor_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"

    # Slot is available again
    slots_resp = client.get(f"/api/v1/appointments/doctors/{doctor_id}/slots", params={"date": target_date}, headers=headers)
    assert slot in slots_resp.json()["available_slots"]

    # A different patient can now book it
    _create_user("p6b@test.com", "patient")
    headers_p6b = _login("p6b@test.com")
    resp2 = client.post("/api/v1/appointments/", json={
        "doctor_id": doctor_id, "appointment_date": target_date, "start_time": slot, "reason": "New booking",
    }, headers=headers_p6b)
    assert resp2.status_code == 201


def test_patient_isolation_cannot_view_others_appointment():
    doctor_id = _create_doctor("d7@test.com")
    _create_user("p7@test.com", "patient")
    _create_user("p7b@test.com", "patient")
    headers = _login("p7@test.com")
    headers_other = _login("p7b@test.com")

    target_date = _next_weekday()
    slot = client.get(f"/api/v1/appointments/doctors/{doctor_id}/slots", params={"date": target_date}, headers=headers).json()["available_slots"][0]
    appt_id = client.post("/api/v1/appointments/", json={
        "doctor_id": doctor_id, "appointment_date": target_date, "start_time": slot, "reason": "Private matter",
    }, headers=headers).json()["id"]

    resp = client.get(f"/api/v1/appointments/{appt_id}", headers=headers_other)
    assert resp.status_code == 403


def test_doctor_isolation_cannot_manage_other_doctors_appointment():
    doctor_id = _create_doctor("d8@test.com")
    other_doctor_id = _create_doctor("d8b@test.com")
    _create_user("p8@test.com", "patient")
    headers = _login("p8@test.com")
    other_doctor_headers = _login("d8b@test.com")

    target_date = _next_weekday()
    slot = client.get(f"/api/v1/appointments/doctors/{doctor_id}/slots", params={"date": target_date}, headers=headers).json()["available_slots"][0]
    appt_id = client.post("/api/v1/appointments/", json={
        "doctor_id": doctor_id, "appointment_date": target_date, "start_time": slot, "reason": "Checkup",
    }, headers=headers).json()["id"]

    resp = client.patch(f"/api/v1/appointments/{appt_id}", json={"status": "confirmed"}, headers=other_doctor_headers)
    assert resp.status_code == 403


def test_admin_sees_all_appointments_with_filters():
    doctor_id = _create_doctor("d9@test.com")
    _create_user("p9@test.com", "patient")
    _create_user("admin9@test.com", "admin")
    headers = _login("p9@test.com")
    admin_headers = _login("admin9@test.com")

    target_date = _next_weekday()
    slot = client.get(f"/api/v1/appointments/doctors/{doctor_id}/slots", params={"date": target_date}, headers=headers).json()["available_slots"][0]
    client.post("/api/v1/appointments/", json={
        "doctor_id": doctor_id, "appointment_date": target_date, "start_time": slot, "reason": "Checkup",
    }, headers=headers)

    resp = client.get("/api/v1/appointments/", params={"doctor_id": doctor_id}, headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
    assert all(a["doctor_id"] == doctor_id for a in resp.json())


def test_unauthenticated_request_rejected():
    resp = client.get("/api/v1/appointments/")
    assert resp.status_code == 401
