"""
MediGuard AI — Phase 3 AI Gateway Tests

Mocks the heavy ML/OCR/LLM layers (shap/sklearn model, pytesseract,
LangChain LLMs) since this sandbox has no disk space to install them.
What's under test is the *adapter logic* in ai_gateway.py and the new
doctor clinical-analysis endpoint — payload validation, blood-pressure
parsing, risk-level mapping, SHAP-to-factor mapping, error handling,
and rate limiting — not the ML/LLM internals themselves, which are
unchanged.
"""

import os
import sys
import types
import uuid
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from tests._auth_only_app import app
from auth.db import init_db, SessionLocal

client = TestClient(app)


def _fake_module(name: str, **attrs):
    """
    Builds a stand-in module and registers it in sys.modules so that
    `from ml.model import get_model` (etc.) resolves to it directly
    without executing the real module file — needed because the real
    ml/model.py, agents/graph.py, and rag/retriever.py import shap,
    langgraph, and langchain_community/chromadb respectively, none of
    which fit in this sandbox's remaining disk space. This only affects
    what these specific import statements resolve to during the test;
    it does not change the real modules on disk.
    """
    mod = types.ModuleType(name)
    for k, v in attrs.items():
        setattr(mod, k, v)
    return mod


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def _fake_predict_result(dia_prob=0.72, dia_level="high", cvd_prob=0.31, cvd_level="low"):
    return {
        "prediction_id": str(uuid.uuid4()),
        "timestamp": "2026-07-27T00:00:00",
        "model_version": "v-test",
        "training_data": "Kaggle datasets only",
        "diabetes": {
            "probability": dia_prob, "risk_level": dia_level, "confidence": 0.9,
            "shap_features": [
                {"feature": "hba1c", "value": 6.1, "shap_value": 0.31, "impact": "increases risk"},
                {"feature": "bmi", "value": 27.4, "shap_value": 0.12, "impact": "increases risk"},
                {"feature": "physical_activity_encoded", "value": 1, "shap_value": -0.08, "impact": "decreases risk"},
            ],
        },
        "cardiovascular": {
            "probability": cvd_prob, "risk_level": cvd_level, "confidence": 0.85,
            "shap_features": [
                {"feature": "cholesterol_ldl", "value": 138, "shap_value": 0.05, "impact": "increases risk"},
            ],
        },
        "combined_risk_score": round((dia_prob + cvd_prob) / 2, 4),
    }


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


def test_predict_success_shapes_response_for_frontend():
    fake_model = MagicMock()
    fake_model.predict.return_value = _fake_predict_result()
    fake_ml_model_module = _fake_module("ml.model", get_model=lambda: fake_model)

    with patch.dict(sys.modules, {"ml.model": fake_ml_model_module}):
        with patch("ayurveda.herb_recommender.recommend_herbs") as mock_herbs:
            mock_herbs.return_value = {"recommended_herbs": [
                {"name_en": "Bitter Gourd", "scientific": "Momordica charantia", "dosage_en": "20mL juice daily", "safe_to_use": True}
            ]}
            resp = client.post("/api/v1/ai/predict", json=VALID_PREDICT_PAYLOAD)

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["riskScore"] == 72
    assert body["riskLevel"] == "High"
    assert body["primaryFactors"][0]["label"] == "HbA1c"
    assert body["primaryFactors"][0]["impact"] == 100.0  # top factor is always ±100 under relative scaling
    assert any("HbA1c" in r or "glycaemic" in r for r in body["recommendations"])
    assert "Bitter Gourd" in body["preventiveAyurveda"][0]


def test_predict_critical_maps_to_high_for_frontend_union():
    fake_model = MagicMock()
    fake_model.predict.return_value = _fake_predict_result(dia_level="critical")
    fake_ml_model_module = _fake_module("ml.model", get_model=lambda: fake_model)

    with patch.dict(sys.modules, {"ml.model": fake_ml_model_module}):
        with patch("ayurveda.herb_recommender.recommend_herbs", return_value={"recommended_herbs": []}):
            resp = client.post("/api/v1/ai/predict", json=VALID_PREDICT_PAYLOAD)
    assert resp.json()["riskLevel"] == "High"


def test_predict_rejects_unsupported_disease_type():
    payload = {**VALID_PREDICT_PAYLOAD, "diseaseType": "Chronic Kidney Disease"}
    resp = client.post("/api/v1/ai/predict", json=payload)
    assert resp.status_code == 422


def test_predict_rejects_malformed_blood_pressure():
    payload = {**VALID_PREDICT_PAYLOAD, "vitals": {**VALID_PREDICT_PAYLOAD["vitals"], "bloodPressure": "not-a-bp"}}
    resp = client.post("/api/v1/ai/predict", json=payload)
    assert resp.status_code == 400
    assert "bloodPressure" in resp.json()["error"]


def test_predict_rejects_non_numeric_vital():
    payload = {**VALID_PREDICT_PAYLOAD, "vitals": {**VALID_PREDICT_PAYLOAD["vitals"], "glucose": "high"}}
    resp = client.post("/api/v1/ai/predict", json=payload)
    assert resp.status_code == 400
    assert "glucose" in resp.json()["error"]


def test_predict_model_failure_returns_503():
    def _raise():
        raise RuntimeError("model not trained")
    fake_ml_model_module = _fake_module("ml.model", get_model=_raise)
    with patch.dict(sys.modules, {"ml.model": fake_ml_model_module}):
        resp = client.post("/api/v1/ai/predict", json=VALID_PREDICT_PAYLOAD)
    assert resp.status_code == 503


def test_predict_persists_when_authenticated():
    captured = []
    with patch("services.otp_service.EmailService.send_otp", side_effect=lambda to, otp, purpose: captured.append(otp)):
        client.post("/api/v1/auth/register/send-otp", json={"email": "predicttest@example.com"})
        v = client.post("/api/v1/auth/register/verify-otp", json={"email": "predicttest@example.com", "otp": captured[0]}).json()["verificationToken"]
    reg = client.post("/api/v1/auth/register", json={
        "name": "Predict Test", "email": "predicttest@example.com", "password": "Password123!",
        "role": "patient", "verificationToken": v,
    }).json()
    headers = {"Authorization": f"Bearer {reg['token']}"}

    fake_model = MagicMock()
    fake_model.predict.return_value = _fake_predict_result()
    fake_ml_model_module = _fake_module("ml.model", get_model=lambda: fake_model)

    with patch.dict(sys.modules, {"ml.model": fake_ml_model_module}):
        with patch("ayurveda.herb_recommender.recommend_herbs", return_value={"recommended_herbs": []}):
            resp = client.post("/api/v1/ai/predict", json=VALID_PREDICT_PAYLOAD, headers=headers)
    assert resp.status_code == 200

    history = client.get("/api/v1/patient/history", headers=headers).json()
    assert len(history) == 1
    assert history[0]["diabetes_risk_level"] == "high"


def test_ocr_rejects_unsupported_mime_type():
    resp = client.post("/api/v1/ai/ocr", json={"imageBase64": "aGVsbG8=", "mimeType": "text/plain"})
    assert resp.status_code == 400


def test_ocr_rejects_invalid_base64():
    resp = client.post("/api/v1/ai/ocr", json={"imageBase64": "not-valid-base64!!!", "mimeType": "image/png"})
    assert resp.status_code == 400


def test_ocr_success_shapes_biomarkers():
    fake_analysis = {
        "fields": {
            "fasting_glucose": {"value": 145, "confidence": 0.9, "method": "regex", "clinical_status": {"label": "prediabetes"}},
            "hba1c": {"value": 5.4, "confidence": 0.9, "method": "regex", "clinical_status": {"label": "normal"}},
        },
        "ocr_text_preview": "Glucose 145 mg/dL, HbA1c 5.4%",
        "critical_flags": [],
        "total_extracted": 2,
    }
    import base64
    b64 = base64.b64encode(b"fake-image-bytes").decode()
    with patch("features.ocr_autofill.extract_from_image", return_value=fake_analysis):
        with patch("agents.llm_factory.get_llm", side_effect=Exception("no llm configured")):
            resp = client.post("/api/v1/ai/ocr", json={"imageBase64": b64, "mimeType": "image/png"})

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body["biomarkers"]) == 2
    glucose = next(b for b in body["biomarkers"] if b["name"] == "Fasting Glucose")
    assert glucose["status"] == "High"
    hba1c = next(b for b in body["biomarkers"] if "HbA1c" in b["name"])
    assert hba1c["status"] == "Normal"


def test_ocr_empty_extraction_returns_422():
    import base64
    b64 = base64.b64encode(b"fake-image-bytes").decode()
    with patch("features.ocr_autofill.extract_from_image", return_value={"fields": {}}):
        with patch("agents.llm_factory.get_llm", side_effect=Exception("no llm")):
            resp = client.post("/api/v1/ai/ocr", json={"imageBase64": b64, "mimeType": "image/png"})
    assert resp.status_code == 422


def test_chat_rejects_empty_message():
    resp = client.post("/api/v1/ai/chat", json={"message": "   ", "history": [], "userRole": "patient"})
    assert resp.status_code == 400


def test_chat_success_with_mocked_llm():
    fake_response = MagicMock()
    fake_response.content = "High blood pressure means your heart is working harder than it should."
    fake_llm = MagicMock()
    fake_llm.invoke.return_value = fake_response

    def _raise_retriever():
        raise RuntimeError("chroma not available")
    fake_rag_module = _fake_module("rag.retriever", get_retriever=_raise_retriever)

    with patch("agents.llm_factory.get_llm", return_value=fake_llm):
        with patch.dict(sys.modules, {"rag.retriever": fake_rag_module}):
            resp = client.post("/api/v1/ai/chat", json={
                "message": "What does high blood pressure mean?", "history": [], "userRole": "patient",
            })
    assert resp.status_code == 200
    assert "heart" in resp.json()["reply"]


def test_chat_llm_failure_returns_503():
    with patch("agents.llm_factory.get_llm", side_effect=Exception("no provider configured")):
        resp = client.post("/api/v1/ai/chat", json={"message": "hello", "history": [], "userRole": "patient"})
    assert resp.status_code == 503


def test_chat_rate_limit_enforced():
    fake_response = MagicMock()
    fake_response.content = "ok"
    fake_llm = MagicMock()
    fake_llm.invoke.return_value = fake_response

    def _raise_retriever():
        raise RuntimeError("unavailable")
    fake_rag_module = _fake_module("rag.retriever", get_retriever=_raise_retriever)

    with patch("agents.llm_factory.get_llm", return_value=fake_llm):
        with patch.dict(sys.modules, {"rag.retriever": fake_rag_module}):
            statuses = []
            for _ in range(25):
                r = client.post("/api/v1/ai/chat", json={
                    "message": "hi", "history": [], "userRole": "patient",
                }, headers={"X-Forwarded-For": "9.9.9.9"})
                statuses.append(r.status_code)
    assert 429 in statuses


def _register_and_link_doctor_patient():
    def _register(email, role, extra=None):
        captured = []
        with patch("services.otp_service.EmailService.send_otp", side_effect=lambda to, otp, purpose: captured.append(otp)):
            client.post("/api/v1/auth/register/send-otp", json={"email": email})
            v = client.post("/api/v1/auth/register/verify-otp", json={"email": email, "otp": captured[0]}).json()["verificationToken"]
        payload = {"name": "Test User", "email": email, "password": "Password123!", "role": role, "verificationToken": v}
        if extra:
            payload.update(extra)
        return client.post("/api/v1/auth/register", json=payload).json()

    doctor_email = f"doc_{uuid.uuid4().hex[:8]}@hospital.org"
    patient_email = f"pat_{uuid.uuid4().hex[:8]}@example.com"
    _register(doctor_email, "doctor", {"medicalLicenseNumber": "LIC-1", "hospitalAffiliation": "Test Hosp"})
    patient_reg = _register(patient_email, "patient")

    db = SessionLocal()
    from auth.db import User
    doc_user = db.query(User).filter(User.email == doctor_email).first()
    doc_user.verification_status = "approved"
    db.commit()
    db.close()

    doctor_login = client.post("/api/v1/auth/login", json={"email": doctor_email, "password": "Password123!"}).json()
    doc_headers = {"Authorization": f"Bearer {doctor_login['token']}"}
    pat_headers = {"Authorization": f"Bearer {patient_reg['token']}"}

    link_resp = client.post("/api/v1/patient/link-request", headers=pat_headers, json={"doctor_id": doctor_login["user"]["id"]})
    link_id = link_resp.json()["link_id"]
    client.post(f"/api/v1/doctor/link-requests/{link_id}/respond", headers=doc_headers, json={"status": "accepted"})

    return doc_headers, patient_reg["user"]["id"]


def test_clinical_analysis_requires_prediction_history():
    doc_headers, patient_id = _register_and_link_doctor_patient()
    resp = client.get(f"/api/v1/doctor/patients/{patient_id}/clinical-analysis", headers=doc_headers)
    assert resp.status_code == 404


def test_clinical_analysis_runs_langgraph_pipeline():
    doc_headers, patient_id = _register_and_link_doctor_patient()

    db = SessionLocal()
    from models.prediction_history import PredictionHistory
    db.add(PredictionHistory(
        user_id=patient_id, prediction_id=str(uuid.uuid4()), input_data="{}",
        diabetes_probability=0.7, diabetes_risk_level="high",
        cvd_probability=0.3, cvd_risk_level="low", combined_score=0.5, model_version="v-test",
    ))
    db.commit()
    db.close()

    fake_final_state = {
        "coordinator_output": {
            "final_risk_level": "high",
            "summary": "Elevated diabetes risk driven by HbA1c and BMI.",
            "triage_priority": "urgent",
            "next_steps": ["Order HbA1c confirmation test", "Refer to endocrinology"],
            "agent_outputs": [
                {"agent_name": "SymptomAgent", "findings": "No acute symptoms reported.", "recommendations": [], "guideline_references": [], "confidence": 0.8},
            ],
        }
    }
    mock_graph = MagicMock()

    async def fake_ainvoke(state, config=None):
        return fake_final_state

    mock_graph.ainvoke = fake_ainvoke
    fake_agents_graph_module = _fake_module("agents.graph", get_agent_graph=lambda: mock_graph)

    with patch.dict(sys.modules, {"agents.graph": fake_agents_graph_module}):
        resp = client.get(f"/api/v1/doctor/patients/{patient_id}/clinical-analysis", headers=doc_headers)

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["final_risk_level"] == "high"
    assert body["triage_priority"] == "urgent"
    assert len(body["next_steps"]) == 2
    assert body["agent_outputs"][0]["agent_name"] == "SymptomAgent"


def test_clinical_analysis_forbidden_for_unlinked_patient():
    doc_headers, _ = _register_and_link_doctor_patient()
    other_patient_email = f"other_{uuid.uuid4().hex[:8]}@example.com"
    captured = []
    with patch("services.otp_service.EmailService.send_otp", side_effect=lambda to, otp, purpose: captured.append(otp)):
        client.post("/api/v1/auth/register/send-otp", json={"email": other_patient_email})
        v = client.post("/api/v1/auth/register/verify-otp", json={"email": other_patient_email, "otp": captured[0]}).json()["verificationToken"]
    other_reg = client.post("/api/v1/auth/register", json={
        "name": "Other Patient", "email": other_patient_email, "password": "Password123!",
        "role": "patient", "verificationToken": v,
    }).json()

    resp = client.get(f"/api/v1/doctor/patients/{other_reg['user']['id']}/clinical-analysis", headers=doc_headers)
    assert resp.status_code == 403
