"""
MediGuard AI — Backend Test Suite (Kaggle real-data pipeline)

Replaces the old synthetic-data suite, which imported ml.data_generator —
a module removed when the project moved to a Kaggle-only pipeline.

Run from the backend/ directory:  pytest tests/ -v
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

PATIENT = {
    "age": 52, "gender": "male", "bmi": 29.4,
    "blood_pressure_systolic": 145, "blood_pressure_diastolic": 92,
    "fasting_glucose": 138, "hba1c": 7.1,
    "cholesterol_total": 220, "cholesterol_hdl": 38,
    "cholesterol_ldl": 150, "triglycerides": 210,
    "smoking": True, "family_history_diabetes": True,
    "family_history_cvd": False, "physical_activity": "sedentary",
}


# ── Data pipeline ────────────────────────────────────────────────────────────

def test_training_frame_schema():
    from ml.data_loader import FEATURE_COLUMNS, TARGET_COLUMNS, load_full_training_frame
    df = load_full_training_frame()
    assert len(df) > 0
    for col in FEATURE_COLUMNS + TARGET_COLUMNS:
        assert col in df.columns, f"missing column {col}"
    assert not df.isna().any().any(), "training frame contains NaNs"


def test_labels_are_binary():
    from ml.data_loader import TARGET_COLUMNS, load_full_training_frame
    df = load_full_training_frame()
    for col in TARGET_COLUMNS:
        assert set(df[col].unique()).issubset({0, 1})


# ── Model ────────────────────────────────────────────────────────────────────

def test_model_loads():
    from ml.model import get_model
    model = get_model()
    assert model.pipeline is not None, "no trained model found in models/best_model.pkl"


def test_predict_structure():
    from ml.model import get_model
    result = get_model().predict(PATIENT)
    for key in ("prediction_id", "model_version", "diabetes", "cardiovascular", "combined_risk_score"):
        assert key in result
    for disease in ("diabetes", "cardiovascular"):
        block = result[disease]
        assert 0.0 <= block["probability"] <= 1.0
        assert block["risk_level"] in {"low", "moderate", "high", "critical"}
        assert len(block["shap_features"]) > 0


def test_high_risk_patient_scores_higher_than_healthy():
    from ml.model import get_model
    model = get_model()
    healthy = dict(PATIENT, age=25, bmi=21.0, fasting_glucose=85, hba1c=5.0,
                   blood_pressure_systolic=112, blood_pressure_diastolic=72,
                   smoking=False, family_history_diabetes=False,
                   physical_activity="active")
    assert model.predict(PATIENT)["diabetes"]["probability"] > \
           model.predict(healthy)["diabetes"]["probability"]


# ── Drift detection (regression test for the always-retrain bug) ─────────────

def test_drift_is_zero_on_training_distribution():
    """The reference data must not register as drifted against itself.

    Regression guard: drift_report() used to resample the reference from a
    Gaussian, which gave binary columns PSI > 5 and retrained on every boot.
    """
    from ml.model import get_model
    report = get_model().drift_report()
    assert report["drift_detected"] is False
    assert report["psi_score"] < 0.1


def test_categorical_columns_excluded_from_psi():
    from ml.model import get_model
    report = get_model().drift_report()
    assert "gender_encoded" in report["skipped_features"]
    assert "smoking" in report["skipped_features"]


# ── Feature modules (the three that used to 500) ──────────────────────────────

def test_district_heatmap_exports():
    from features.district_heatmap import get_heatmap_data, get_state_summary, record_prediction  # noqa: F401
    assert len(get_heatmap_data()) > 0


def test_vernacular_symptom_mapping():
    from features.vernacular_nlp import map_symptoms
    result = map_symptoms("mujhe seene mein dard hota hai")
    assert len(result["mapped_symptoms"]) > 0
    assert "cvd" in result["systems_affected"]


def test_ocr_module_exports():
    from features.ocr_autofill import extract_from_image, _extract_with_regex
    fields = _extract_with_regex("HbA1c: 7.2 %\nFasting Glucose 138 mg/dL")
    assert "hba1c" in fields


# ── Schemas ──────────────────────────────────────────────────────────────────

def test_patient_input_schema_valid():
    from models.schemas import PatientInput
    assert PatientInput(**PATIENT).age == 52


def test_patient_input_schema_rejects_bad_age():
    from pydantic import ValidationError
    from models.schemas import PatientInput
    with pytest.raises(ValidationError):
        PatientInput(**dict(PATIENT, age=-5))
