"""
MediGuard AI — Auth & Role-Based Access Control Tests

Covers the OTP-gated registration flow, password reset flow, login with
role checking, refresh-token rotation, and logout/session revocation.
"""

import os
import sys
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from tests._auth_only_app import app
from auth.db import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def _captured_otp():
    """Patches EmailService.send_otp and returns a list that will contain the sent code."""
    captured = []

    def fake_send_otp(to_email, otp, purpose):
        captured.append(otp)

    return captured, fake_send_otp


def _register_patient(email: str, password: str = "Password123!"):
    captured, fake_send = _captured_otp()
    with patch("services.otp_service.EmailService.send_otp", side_effect=fake_send):
        send_resp = client.post("/api/v1/auth/register/send-otp", json={"email": email})
        assert send_resp.status_code == 200, send_resp.text
        assert send_resp.json() == {"message": "Verification code sent", "expiresInSeconds": 300}

        verify_resp = client.post(
            "/api/v1/auth/register/verify-otp", json={"email": email, "otp": captured[0]}
        )
        assert verify_resp.status_code == 200, verify_resp.text
        verification_token = verify_resp.json()["verificationToken"]

    reg_resp = client.post("/api/v1/auth/register", json={
        "name": "Test Patient",
        "email": email,
        "password": password,
        "role": "patient",
        "verificationToken": verification_token,
    })
    return reg_resp


def _register_doctor(email: str, password: str = "Password123!"):
    captured, fake_send = _captured_otp()
    with patch("services.otp_service.EmailService.send_otp", side_effect=fake_send):
        client.post("/api/v1/auth/register/send-otp", json={"email": email})
        verify_resp = client.post("/api/v1/auth/register/verify-otp", json={"email": email, "otp": captured[0]})
        verification_token = verify_resp.json()["verificationToken"]

    return client.post("/api/v1/auth/register", json={
        "name": "Dr. Alice Smith",
        "email": email,
        "password": password,
        "role": "doctor",
        "verificationToken": verification_token,
        "medicalLicenseNumber": "LIC-998877",
        "hospitalAffiliation": "Metro General Hospital",
        "experience_years": 8,
    })


def test_registration_requires_otp_verification():
    email = f"patient_{os.urandom(4).hex()}@example.com"
    reg_resp = client.post("/api/v1/auth/register", json={
        "name": "No OTP",
        "email": email,
        "password": "Password123!",
        "role": "patient",
    })
    assert reg_resp.status_code == 401
    assert reg_resp.json()["code"] == "OTP_VERIFICATION_REQUIRED"


def test_patient_registration_and_login():
    email = f"patient_{os.urandom(4).hex()}@example.com"
    reg_resp = _register_patient(email)
    assert reg_resp.status_code == 201, reg_resp.text
    data = reg_resp.json()
    assert data["user"]["role"] == "patient"
    assert "token" in data
    assert "refreshToken" in data

    login_resp = client.post("/api/v1/auth/login", json={
        "email": email, "password": "Password123!", "role": "patient",
    })
    assert login_resp.status_code == 200
    assert login_resp.json()["user"]["role"] == "patient"


def test_login_rejects_wrong_portal_role():
    email = f"patient_{os.urandom(4).hex()}@example.com"
    _register_patient(email)

    login_resp = client.post("/api/v1/auth/login", json={
        "email": email, "password": "Password123!", "role": "doctor",
    })
    assert login_resp.status_code == 403


def test_doctor_registration_is_pending_not_logged_in():
    email = f"doctor_{os.urandom(4).hex()}@hospital.org"
    reg_resp = _register_doctor(email)
    assert reg_resp.status_code == 202, reg_resp.text
    data = reg_resp.json()
    assert data["pending"] is True
    assert "token" not in data


def test_doctor_login_blocked_while_pending():
    email = f"doctor_{os.urandom(4).hex()}@hospital.org"
    _register_doctor(email)

    login_resp = client.post("/api/v1/auth/login", json={
        "email": email, "password": "Password123!",
    })
    assert login_resp.status_code == 403
    assert login_resp.json()["code"] == "DOCTOR_PENDING_APPROVAL"


def test_refresh_token_rotates_and_old_one_is_dead():
    email = f"patient_{os.urandom(4).hex()}@example.com"
    reg_resp = _register_patient(email)
    old_refresh = reg_resp.json()["refreshToken"]

    refresh_resp = client.post("/api/v1/auth/refresh", json={"refreshToken": old_refresh})
    assert refresh_resp.status_code == 200
    new_refresh = refresh_resp.json()["refreshToken"]
    assert new_refresh != old_refresh

    replay_resp = client.post("/api/v1/auth/refresh", json={"refreshToken": old_refresh})
    assert replay_resp.status_code == 401


def test_logout_revokes_access_token():
    email = f"patient_{os.urandom(4).hex()}@example.com"
    reg_resp = _register_patient(email)
    token = reg_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200

    logout_resp = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_resp.status_code == 200

    me_after_logout = client.get("/api/v1/auth/me", headers=headers)
    assert me_after_logout.status_code == 401


def test_password_reset_flow():
    email = f"patient_{os.urandom(4).hex()}@example.com"
    _register_patient(email, password="OldPassword123!")

    captured, fake_send = _captured_otp()
    with patch("services.otp_service.EmailService.send_otp", side_effect=fake_send):
        send_resp = client.post("/api/v1/auth/password-reset/send-otp", json={"email": email})
        assert send_resp.status_code == 200
        assert send_resp.json() == {"message": "Verification code sent", "expiresInSeconds": 300}
        verify_resp = client.post(
            "/api/v1/auth/password-reset/verify-otp", json={"email": email, "otp": captured[0]}
        )
        assert verify_resp.status_code == 200
        reset_token = verify_resp.json()["resetToken"]

    reset_resp = client.post("/api/v1/auth/password-reset/reset", json={
        "email": email, "resetToken": reset_token, "newPassword": "NewPassword123!",
    })
    assert reset_resp.status_code == 200

    old_login = client.post("/api/v1/auth/login", json={"email": email, "password": "OldPassword123!"})
    assert old_login.status_code == 401

    new_login = client.post("/api/v1/auth/login", json={"email": email, "password": "NewPassword123!"})
    assert new_login.status_code == 200


def test_doctor_access_forbidden_when_pending():
    email = f"doctor_pending_{os.urandom(4).hex()}@hospital.org"
    # Doctor registration returns no token while pending, so approve
    # manually via the DB to exercise the "pending but has a token"
    # edge case that require_verified_doctor guards against.
    from auth.db import SessionLocal, User
    from auth.security import hash_password, create_access_token
    import uuid

    db = SessionLocal()
    user = User(
        id=str(uuid.uuid4()), name="Dr. Bob", email=email,
        hashed_password=hash_password("Password123!"), role="doctor",
        verification_status="pending",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=user.id, extra_claims={"role": "doctor", "verification_status": "pending"})
    db.close()

    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/v1/doctor/patients", headers=headers)
    assert resp.status_code == 403
    assert "pending administrator verification" in resp.json()["error"]
