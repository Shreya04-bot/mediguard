"""
MediGuard AI — Phase 2 Dashboard Integration Tests

Covers the new endpoints built in Phase 2: notifications, admin
dashboard/analytics aggregates, patient timeline/health-score/family
cluster, and doctor read-access to a linked patient's timeline/family.

Note: /admin/ml-models is intentionally NOT covered here — it imports
ml/model.py (shap, sklearn, etc.), which this lightweight test app
deliberately avoids pulling in. Verify that endpoint against the full
main.py app in an environment with the full requirements.txt installed.
"""

import os
import sys
import uuid
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from tests._auth_only_app import app
from auth.db import init_db, SessionLocal
from auth.security import hash_password

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def _register_patient(email: str, password: str = "Password123!"):
    captured = []
    with patch("services.otp_service.EmailService.send_otp", side_effect=lambda to, otp, purpose: captured.append(otp)):
        client.post("/api/v1/auth/register/send-otp", json={"email": email})
        verify_resp = client.post("/api/v1/auth/register/verify-otp", json={"email": email, "otp": captured[0]})
        v_token = verify_resp.json()["verificationToken"]
    resp = client.post("/api/v1/auth/register", json={
        "name": "Test Patient", "email": email, "password": password, "role": "patient", "verificationToken": v_token,
    })
    return resp.json()


def _create_and_approve_doctor(email: str, password: str = "Password123!"):
    captured = []
    with patch("services.otp_service.EmailService.send_otp", side_effect=lambda to, otp, purpose: captured.append(otp)):
        client.post("/api/v1/auth/register/send-otp", json={"email": email})
        verify_resp = client.post("/api/v1/auth/register/verify-otp", json={"email": email, "otp": captured[0]})
        v_token = verify_resp.json()["verificationToken"]
    client.post("/api/v1/auth/register", json={
        "name": "Dr. Test", "email": email, "password": password, "role": "doctor",
        "verificationToken": v_token, "medicalLicenseNumber": "LIC-1", "hospitalAffiliation": "Test Hospital",
    })
    # Approve directly via DB (simulates an admin approval without needing a real admin account here).
    db = SessionLocal()
    from auth.db import User
    user = db.query(User).filter(User.email == email).first()
    user.verification_status = "approved"
    db.commit()
    db.close()

    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login.json()


def _make_admin(email: str, password: str = "AdminPass123!"):
    db = SessionLocal()
    from auth.db import User
    user = User(id=str(uuid.uuid4()), name="Test Admin", email=email, hashed_password=hash_password(password), role="admin", verification_status="approved")
    db.add(user)
    db.commit()
    db.close()
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login.json()


def _insert_prediction(user_id: str, diabetes_level="high", cvd_level="moderate", combined_score=0.65):
    db = SessionLocal()
    from models.prediction_history import PredictionHistory
    p = PredictionHistory(
        user_id=user_id, prediction_id=str(uuid.uuid4()), input_data="{}",
        diabetes_probability=0.7, diabetes_risk_level=diabetes_level,
        cvd_probability=0.4, cvd_risk_level=cvd_level,
        combined_score=combined_score, model_version="v1-test",
    )
    db.add(p)
    db.commit()
    db.close()


def _insert_report(user_id: str, name="Blood Panel"):
    db = SessionLocal()
    from models.report import MedicalReport
    r = MedicalReport(user_id=user_id, report_name=name, file_type="pdf", summary="All values normal.", flags="[]")
    db.add(r)
    db.commit()
    db.close()


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

def test_notifications_flow():
    data = _register_patient(f"patient_{uuid.uuid4().hex[:8]}@example.com")
    headers = {"Authorization": f"Bearer {data['token']}"}

    db = SessionLocal()
    from services.notification_service import NotificationService
    NotificationService.create(db, data["user"]["id"], "Welcome", "Your account is ready.", "system")
    NotificationService.create(db, data["user"]["id"], "Report Ready", "Your report was processed.", "report")
    db.close()

    resp = client.get("/api/v1/notifications", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["notifications"]) == 2
    assert all("createdAt" in n and "read" in n and "type" in n for n in body["notifications"])
    first_id = body["notifications"][0]["id"]

    mark_resp = client.patch(f"/api/v1/notifications/{first_id}/read", headers=headers)
    assert mark_resp.status_code == 200
    assert mark_resp.json() == {"id": first_id, "read": True}

    mark_all_resp = client.patch("/api/v1/notifications/read-all", headers=headers)
    assert mark_all_resp.status_code == 200
    assert mark_all_resp.json()["updated"] == 1  # the other one was still unread

    final = client.get("/api/v1/notifications", headers=headers).json()
    assert all(n["read"] for n in final["notifications"])


def test_notifications_require_auth():
    resp = client.get("/api/v1/notifications")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Admin dashboard
# ---------------------------------------------------------------------------

def test_admin_dashboard_stats_real_counts():
    admin = _make_admin(f"admin_{uuid.uuid4().hex[:8]}@example.com")
    patient = _register_patient(f"patient_{uuid.uuid4().hex[:8]}@example.com")
    _insert_prediction(patient["user"]["id"])

    headers = {"Authorization": f"Bearer {admin['token']}"}
    resp = client.get("/api/v1/admin/dashboard-stats", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["totalPatients"] >= 1
    assert body["totalPredictions"] >= 1
    assert "monthlyActivity" in body and "diseaseDistribution" in body


def test_admin_users_enriched_with_real_data():
    admin = _make_admin(f"admin_{uuid.uuid4().hex[:8]}@example.com")
    patient = _register_patient(f"patient_{uuid.uuid4().hex[:8]}@example.com")
    _insert_prediction(patient["user"]["id"], diabetes_level="critical")

    headers = {"Authorization": f"Bearer {admin['token']}"}
    resp = client.get("/api/v1/admin/users?role=patient", headers=headers)
    assert resp.status_code == 200
    users = resp.json()
    match = next(u for u in users if u["id"] == patient["user"]["id"])
    assert match["latest_prediction"]["diabetes_risk_level"] == "critical"


def test_admin_routes_forbidden_for_patient():
    patient = _register_patient(f"patient_{uuid.uuid4().hex[:8]}@example.com")
    headers = {"Authorization": f"Bearer {patient['token']}"}
    resp = client.get("/api/v1/admin/dashboard-stats", headers=headers)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Patient timeline / health score / family
# ---------------------------------------------------------------------------

def test_patient_timeline_merges_predictions_and_reports():
    patient = _register_patient(f"patient_{uuid.uuid4().hex[:8]}@example.com")
    _insert_prediction(patient["user"]["id"])
    _insert_report(patient["user"]["id"])

    headers = {"Authorization": f"Bearer {patient['token']}"}
    resp = client.get("/api/v1/patient/timeline", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 2
    assert {i["type"] for i in items} == {"prediction", "report"}


def test_patient_health_score_from_latest_prediction():
    patient = _register_patient(f"patient_{uuid.uuid4().hex[:8]}@example.com")
    headers = {"Authorization": f"Bearer {patient['token']}"}

    no_data_resp = client.get("/api/v1/patient/health-score", headers=headers)
    assert no_data_resp.status_code == 200
    assert no_data_resp.json()["score"] is None

    _insert_prediction(patient["user"]["id"], combined_score=0.2)
    resp = client.get("/api/v1/patient/health-score", headers=headers)
    body = resp.json()
    assert body["score"] == 80  # (1 - 0.2) * 100
    assert body["label"] == "Optimal Vitality Index"


def test_patient_family_cluster_add_and_dashboard():
    patient = _register_patient(f"patient_{uuid.uuid4().hex[:8]}@example.com")
    headers = {"Authorization": f"Bearer {patient['token']}"}

    empty = client.get("/api/v1/patient/family", headers=headers)
    assert empty.json()["member_count"] == 0

    add_resp = client.post("/api/v1/patient/family/member", headers=headers, json={
        "name": "Father", "relation": "father", "age": 62,
        "diabetes_risk_level": "high", "cvd_risk_level": "moderate", "combined_score": 0.6,
        "conditions": ["Type 2 Diabetes"],
    })
    assert add_resp.status_code == 200
    member_id = add_resp.json()["member_id"]

    client.post("/api/v1/patient/family/member", headers=headers, json={
        "name": "Mother", "relation": "mother", "age": 58,
        "diabetes_risk_level": "high", "cvd_risk_level": "low", "combined_score": 0.55,
        "conditions": ["Type 2 Diabetes"],
    })

    dashboard = client.get("/api/v1/patient/family", headers=headers).json()
    assert dashboard["member_count"] == 2
    assert dashboard["hereditary_conditions_count"] == 1  # shared "Type 2 Diabetes"
    assert len(dashboard["insights"]) > 0

    delete_resp = client.delete(f"/api/v1/patient/family/member/{member_id}", headers=headers)
    assert delete_resp.status_code == 200
    assert client.get("/api/v1/patient/family", headers=headers).json()["member_count"] == 1


# ---------------------------------------------------------------------------
# Doctor read access to linked patient
# ---------------------------------------------------------------------------

def test_doctor_can_view_linked_patient_timeline_and_family_but_not_unlinked():
    doctor = _create_and_approve_doctor(f"doctor_{uuid.uuid4().hex[:8]}@hospital.org")
    patient = _register_patient(f"patient_{uuid.uuid4().hex[:8]}@example.com")
    other_patient = _register_patient(f"patient_{uuid.uuid4().hex[:8]}@example.com")

    _insert_prediction(patient["user"]["id"])
    doc_headers = {"Authorization": f"Bearer {doctor['token']}"}
    pat_headers = {"Authorization": f"Bearer {patient['token']}"}

    # Not linked yet -> forbidden
    forbidden = client.get(f"/api/v1/doctor/patients/{patient['user']['id']}/timeline", headers=doc_headers)
    assert forbidden.status_code == 403

    # Create + accept link
    link_resp = client.post("/api/v1/patient/link-request", headers=pat_headers, json={"doctor_id": doctor["user"]["id"]})
    link_id = link_resp.json()["link_id"]
    client.post(f"/api/v1/doctor/link-requests/{link_id}/respond", headers=doc_headers, json={"status": "accepted"})

    ok_resp = client.get(f"/api/v1/doctor/patients/{patient['user']['id']}/timeline", headers=doc_headers)
    assert ok_resp.status_code == 200
    assert len(ok_resp.json()["items"]) == 1

    family_resp = client.get(f"/api/v1/doctor/patients/{patient['user']['id']}/family", headers=doc_headers)
    assert family_resp.status_code == 200

    # Still forbidden for the unlinked patient
    still_forbidden = client.get(f"/api/v1/doctor/patients/{other_patient['user']['id']}/timeline", headers=doc_headers)
    assert still_forbidden.status_code == 403
