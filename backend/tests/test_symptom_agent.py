"""
MediGuard AI — Symptom Agent Tests

Covers real free-text symptom extraction (features/vernacular_nlp.py),
the SymptomAgent LangGraph node's handling of both free-text and
structured intake, emergency detection, and end-to-end routing/API
behavior for symptom-only queries (no clinical inputs).
"""

import os
import sys
import uuid
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from tests._auth_only_app import app
from auth.db import init_db, SessionLocal
from auth.security import hash_password
from models.user import User

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def _run(coro):
    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# features/vernacular_nlp.py — extraction correctness
# ---------------------------------------------------------------------------

def test_extract_symptoms_english_diabetes_example():
    from features.vernacular_nlp import extract_symptom_context
    result = extract_symptom_context(
        "I have been feeling extremely thirsty, urinating frequently and feeling tired for several weeks."
    )
    assert "polydipsia - excessive thirst" in result["symptoms"]
    assert "polyuria - frequent urination" in result["symptoms"]
    assert "fatigue / asthenia" in result["symptoms"]
    assert result["duration"] == "several weeks"
    assert result["emergency_flags"] == []
    assert result["extraction_method"] in ("llm", "rule_based_fallback")


def test_extract_symptoms_no_false_positive_from_shared_words():
    """Regression test for a real bug found during development: fuzzy
    word-matching caused "feeling tired" to falsely match a "feeling dizzy"
    dictionary entry via the shared word "feeling"."""
    from features.vernacular_nlp import extract_symptom_context
    result = extract_symptom_context("I am feeling tired lately.")
    assert "dizziness / vertigo" not in result["symptoms"]
    assert "fatigue / asthenia" in result["symptoms"]


def test_extract_symptoms_empty_input():
    from features.vernacular_nlp import extract_symptom_context
    result = extract_symptom_context("")
    assert result["symptoms"] == []
    assert result["emergency_flags"] == []
    assert result["extraction_method"] == "none"


def test_extract_symptoms_malformed_input_does_not_crash():
    from features.vernacular_nlp import extract_symptom_context
    for bad_input in ["   ", "!!!???", "a" * 5000, "😀😀😀"]:
        result = extract_symptom_context(bad_input)
        assert isinstance(result["symptoms"], list)
        assert isinstance(result["emergency_flags"], list)


def test_detect_emergency_flags_chest_pain_and_breathing():
    from features.vernacular_nlp import detect_emergency_flags
    flags = detect_emergency_flags("Sudden severe chest pain and I cannot breathe properly.")
    assert any("chest pain" in f for f in flags)
    assert any("breath" in f for f in flags)


def test_detect_emergency_flags_stroke_signs():
    from features.vernacular_nlp import detect_emergency_flags
    flags = detect_emergency_flags("His face is drooping on one side and his speech is slurred.")
    assert any("facial drooping" in f for f in flags)
    assert any("slurred speech" in f for f in flags)


def test_detect_emergency_flags_none_for_routine_symptoms():
    from features.vernacular_nlp import detect_emergency_flags
    flags = detect_emergency_flags("I have been feeling tired and thirsty for a few weeks.")
    assert flags == []


def test_hindi_dictionary_still_works_after_precision_fix():
    """Regression test: an earlier fix for false positives (exact-phrase
    matching only) must not break the original Hindi dictionary matching
    that features/ayurveda/symptoms/map already depends on."""
    from features.vernacular_nlp import map_symptoms
    result = map_symptoms("seene mein dard hota hai", language="hi")
    terms = [m["clinical_term"] for m in result["mapped_symptoms"]]
    assert "chest pain / angina pectoris" in terms
    # Must NOT hallucinate unrelated symptoms via shared short words (e.g. "dard"/pain)
    assert "headache" not in terms
    assert "abdominal pain" not in terms


# ---------------------------------------------------------------------------
# agents/graph.py — SymptomAgent node behavior
# ---------------------------------------------------------------------------

def test_symptom_agent_node_free_text_no_fabricated_prediction():
    """A symptom-only query (no clinical inputs) must NOT produce a
    fabricated ML prediction — this is a core safety requirement."""
    from agents.graph import symptom_agent_node
    state = {
        "symptom_text": "I have been feeling extremely thirsty and tired for weeks.",
        "patient_data": {},
    }
    result = _run(symptom_agent_node(state))
    assert result["prediction_result"] == {}
    assert len(result["extracted_symptoms"]) > 0
    assert "diagnose" in result["symptom_output"].lower() or "risk estimate" in result["symptom_output"].lower()


def test_symptom_agent_node_structured_intake_still_predicts():
    """Structured clinical intake (the pre-existing path) must still work
    exactly as before — this feature must not have regressed it."""
    from agents.graph import symptom_agent_node
    patient = {
        "age": 55, "gender": "male", "bmi": 29.5,
        "blood_pressure_systolic": 145, "blood_pressure_diastolic": 92,
        "fasting_glucose": 110, "hba1c": 6.1,
        "cholesterol_total": 220, "cholesterol_hdl": 45, "cholesterol_ldl": 140,
        "triglycerides": 180, "smoking": True, "family_history_diabetes": True,
        "family_history_cvd": False, "physical_activity": "moderate",
    }
    result = _run(symptom_agent_node({"patient_data": patient}))
    assert "diabetes" in result["prediction_result"]
    assert "cardiovascular" in result["prediction_result"]
    assert "hypertension" in result["prediction_result"]


def test_symptom_agent_node_emergency_flag_propagates():
    from agents.graph import symptom_agent_node
    state = {"symptom_text": "Sudden severe chest pain, cannot breathe.", "patient_data": {}}
    result = _run(symptom_agent_node(state))
    assert result["emergency_detected"] is True
    assert len(result["emergency_flags"]) > 0


def test_symptom_agent_node_no_symptom_text_no_crash():
    """Neither symptom_text nor usable patient_data — must degrade
    gracefully, not crash."""
    from agents.graph import symptom_agent_node
    result = _run(symptom_agent_node({"patient_data": {}}))
    assert result["prediction_result"] == {}
    assert result["emergency_detected"] is False


def test_graph_nodes_survive_explicit_none_values():
    """Regression test for a real bug found during development: several
    nodes used state.get(key, default), which only applies the default
    when the key is MISSING — an explicit None value (e.g. a client
    sending {"patient_data": null} in JSON) passed straight through and
    crashed downstream .get()/.strip() calls. Fixed to `state.get(key) or
    default` throughout. This test sends None for every field to make
    sure nothing regresses back to the crash-prone pattern."""
    from agents.graph import symptom_agent_node, report_agent_node, coordinator_agent_node, _route_after_report
    malformed_state = {
        "symptom_text": None, "patient_data": None, "report_text": None,
        "prediction_result": None, "emergency_flags": None,
        "rag_references": None, "ayurveda_output": None,
    }
    r1 = _run(symptom_agent_node(malformed_state))
    malformed_state.update(r1)
    r2 = _run(report_agent_node(malformed_state))
    malformed_state.update(r2)
    route = _route_after_report(malformed_state)
    assert route in ("rag", "coordinator")
    r3 = _run(coordinator_agent_node(malformed_state))
    assert r3["coordinator_output"]["triage_priority"] in ("routine", "urgent", "emergency")


# ---------------------------------------------------------------------------
# Routing — emergency short-circuit
# ---------------------------------------------------------------------------

def test_route_after_report_emergency_bypasses_rag():
    from agents.graph import _route_after_report
    assert _route_after_report({"emergency_detected": True, "prediction_result": {}}) == "coordinator"


def test_route_after_report_symptom_only_goes_to_rag():
    from agents.graph import _route_after_report
    assert _route_after_report({"emergency_detected": False, "prediction_result": {}}) == "rag"


def test_route_after_report_high_risk_structured_goes_to_coordinator():
    from agents.graph import _route_after_report
    state = {
        "emergency_detected": False,
        "prediction_result": {
            "diabetes": {"risk_level": "critical"},
            "cardiovascular": {"risk_level": "low"},
            "hypertension": {"risk_level": "low"},
        },
    }
    assert _route_after_report(state) == "coordinator"


def test_rag_agent_node_survives_missing_patient_data_key():
    """Regression test for a real bug found during development:
    rag_agent_node used state["patient_data"] (direct indexing), which
    raised KeyError whenever a caller invoked it without that key at all
    (e.g. a symptom-only query state built without ever setting
    patient_data) — not just when it was None. Fixed to state.get(...)."""
    from agents.graph import rag_agent_node
    state = {"prediction_result": {}, "extracted_symptoms": ["fatigue"]}
    result = _run(rag_agent_node(state))
    assert "rag_output" in result
    assert "rag_references" in result


# ---------------------------------------------------------------------------
# Full API — /agents/analyse
# ---------------------------------------------------------------------------

def _login(email: str, password: str = "Password123!") -> dict:
    db = SessionLocal()
    user = User(
        id=str(uuid.uuid4()), email=email, hashed_password=hash_password(password),
        name="Symptom API Tester", role="patient", is_active=True, verification_status="approved",
    )
    db.add(user)
    db.commit()
    db.close()
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['token']}"}


def test_agents_analyse_symptom_only_end_to_end():
    headers = _login("symapi1@test.com")
    resp = client.post("/api/v1/agents/analyse", json={
        "symptom_text": "I have been feeling extremely thirsty, urinating frequently and feeling tired for several weeks.",
    }, headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["final_risk_level"] == "unknown"
    assert body["triage_priority"] == "routine"
    agent_names = [a["agent_name"] for a in body["agent_outputs"]]
    assert "SymptomAgent" in agent_names


def test_agents_analyse_emergency_end_to_end():
    headers = _login("symapi2@test.com")
    resp = client.post("/api/v1/agents/analyse", json={
        "symptom_text": "Sudden severe chest pain and I cannot breathe.",
    }, headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["triage_priority"] == "emergency"
    assert "EMERGENCY" in body["summary"].upper()


def test_agents_analyse_no_input_rejected():
    headers = _login("symapi3@test.com")
    resp = client.post("/api/v1/agents/analyse", json={}, headers=headers)
    assert resp.status_code == 422


def test_agents_analyse_unauthenticated_rejected():
    resp = client.post("/api/v1/agents/analyse", json={"symptom_text": "I feel tired."})
    assert resp.status_code == 401
