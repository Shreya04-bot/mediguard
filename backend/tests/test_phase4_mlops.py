"""
MediGuard AI — Phase 4 MLOps Tests

Unlike Phases 1-3, this file exercises the REAL ml.model module end to
end (no sys.modules faking) — shap, xgboost, and mlflow are actually
installed in this environment as of Phase 4, and a real model was
trained (see PHASE_4_CHANGELOG.md). This is the first genuine,
non-mocked validation of /ai/predict's full pipeline.
"""

import os
import sys
import uuid
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


VALID_PREDICT_PAYLOAD = {
    "diseaseType": "Type 2 Diabetes",
    "vitals": {
        "age": "58", "gender": "male", "bmi": "27.4", "bloodPressure": "138/88",
        "glucose": "118", "hba1c": "6.1", "cholesterolTotal": "210", "cholesterolHdl": "42",
        "cholesterolLdl": "138", "triglycerides": "165", "physicalActivity": "moderate",
    },
    "smoking": False, "familyHistoryDiabetes": True, "familyHistoryCvd": False,
    "medicalHistory": ["Family history of diabetes"],
}


def test_real_model_loads_and_predicts_end_to_end():
    """No mocking at all — exercises the actual trained model, real SHAP
    explainability, and real Ayurveda herb recommendation lookup."""
    resp = client.post("/api/v1/ai/predict", json=VALID_PREDICT_PAYLOAD)
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert 0 <= body["riskScore"] <= 100
    assert body["riskLevel"] in ("Low", "Moderate", "High")
    assert len(body["primaryFactors"]) > 0
    for factor in body["primaryFactors"]:
        assert isinstance(factor["label"], str) and factor["label"]
        # Relative-scaling contract: bounded to [-100, 100], top factor is ±100.
        assert -100 <= factor["impact"] <= 100
    assert abs(body["primaryFactors"][0]["impact"]) == 100.0
    assert len(body["recommendations"]) > 0
    assert isinstance(body["preventiveAyurveda"], list)


def test_real_model_cardiovascular_selection():
    payload = {**VALID_PREDICT_PAYLOAD, "diseaseType": "Cardiovascular Risk"}
    resp = client.post("/api/v1/ai/predict", json=payload)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert 0 <= body["riskScore"] <= 100


def test_real_model_higher_risk_inputs_score_higher():
    """Sanity check the model's directional behaviour on a real (not
    mocked) prediction: materially worse labs should not score lower."""
    healthy_payload = {**VALID_PREDICT_PAYLOAD, "vitals": {
        **VALID_PREDICT_PAYLOAD["vitals"], "hba1c": "5.0", "glucose": "85",
        "bmi": "22.0", "cholesterolLdl": "90", "bloodPressure": "115/75",
    }, "smoking": False, "familyHistoryDiabetes": False}
    risky_payload = {**VALID_PREDICT_PAYLOAD, "vitals": {
        **VALID_PREDICT_PAYLOAD["vitals"], "hba1c": "7.8", "glucose": "180",
        "bmi": "34.0", "cholesterolLdl": "180", "bloodPressure": "150/95",
    }, "smoking": True, "familyHistoryDiabetes": True}

    healthy_resp = client.post("/api/v1/ai/predict", json=healthy_payload).json()
    risky_resp = client.post("/api/v1/ai/predict", json=risky_payload).json()
    assert risky_resp["riskScore"] >= healthy_resp["riskScore"]


def test_admin_ml_models_endpoint_with_real_registry():
    """Now that a real model + MLflow run exist, /admin/ml-models should
    reflect them without needing to be mocked."""
    db_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"
    from auth.db import SessionLocal, User
    from auth.security import hash_password
    db = SessionLocal()
    admin = User(id=str(uuid.uuid4()), name="Test Admin", email=db_email, hashed_password=hash_password("Password123!"), role="admin", verification_status="approved")
    db.add(admin)
    db.commit()
    db.close()

    login = client.post("/api/v1/auth/login", json={"email": db_email, "password": "Password123!"}).json()
    headers = {"Authorization": f"Bearer {login['token']}"}

    resp = client.get("/api/v1/admin/ml-models", headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body["models"]) >= 1
    assert body["summary"]["deployedCount"] >= 1


def test_admin_ml_models_requires_admin_role():
    captured = []
    with patch("services.otp_service.EmailService.send_otp", side_effect=lambda to, otp, purpose: captured.append(otp)):
        client.post("/api/v1/auth/register/send-otp", json={"email": "notadmin@example.com"})
        v = client.post("/api/v1/auth/register/verify-otp", json={"email": "notadmin@example.com", "otp": captured[0]}).json()["verificationToken"]
    reg = client.post("/api/v1/auth/register", json={
        "name": "Not Admin", "email": "notadmin@example.com", "password": "Password123!",
        "role": "patient", "verificationToken": v,
    }).json()
    headers = {"Authorization": f"Bearer {reg['token']}"}
    resp = client.get("/api/v1/admin/ml-models", headers=headers)
    assert resp.status_code == 403
