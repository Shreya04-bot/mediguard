"""
MediGuard AI — Feature 1: Comorbidity Timeline Simulator
Projects current risk forward 5, 10, 20 years under different lifestyle
intervention scenarios using clinically-grounded delta models.

Each intervention reduces one or more risk factors by evidence-backed amounts.
The XGBoost model is re-run for each year with modified inputs.
"""

from __future__ import annotations

import copy
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ── Intervention Definitions ────────────────────────────────────────────────
# Each intervention: {field_key: annual_delta_per_year (applied cumulatively)}
# Deltas are conservative evidence-backed estimates from clinical studies.

INTERVENTIONS: Dict[str, Dict[str, Any]] = {
    "no_change": {
        "label": "No Change (Natural Progression)",
        "description": "Risk progression assuming no lifestyle changes (age-related drift).",
        "color": "#f85149",
        "deltas": {
            # Natural aging effects per year
            "fasting_glucose": +0.8,      # mg/dL per year
            "hba1c":           +0.03,     # % per year
            "blood_pressure_systolic": +0.5,
            "cholesterol_ldl": +0.4,
            "bmi":             +0.1,
        },
    },
    "diet_exercise": {
        "label": "Diet + Exercise (WHO Recommended)",
        "description": "150 min/week moderate exercise + reduced glycaemic index diet.",
        "color": "#3fb950",
        "deltas": {
            "fasting_glucose": -1.5,
            "hba1c":           -0.08,
            "blood_pressure_systolic": -1.0,
            "cholesterol_ldl": -1.2,
            "bmi":             -0.25,
            "physical_activity_encoded": +0.05,  # gradual improvement
        },
    },
    "quit_smoking": {
        "label": "Quit Smoking",
        "description": "Cessation of smoking — CVD risk halves within 1-2 years.",
        "color": "#d29922",
        "deltas": {
            "smoking": "quit_year_1",          # special: set to 0 after year 1
            "blood_pressure_systolic": -1.5,
            "cholesterol_hdl": +0.5,           # HDL improves post-cessation
        },
    },
    "bmi_reduction": {
        "label": "Reduce BMI by 2 units (over 2 years)",
        "description": "Sustained weight loss of ~5-8 kg via diet and activity.",
        "color": "#58a6ff",
        "deltas": {
            "bmi":             -0.20,
            "fasting_glucose": -1.2,
            "blood_pressure_systolic": -0.8,
            "cholesterol_ldl": -0.9,
            "triglycerides":   -2.0,
        },
    },
    "medication": {
        "label": "Medication (Metformin + Statin)",
        "description": "First-line ICMR-recommended pharmacotherapy for DM + CVD risk.",
        "color": "#bc8cff",
        "deltas": {
            "fasting_glucose": -3.5,
            "hba1c":           -0.6,
            "cholesterol_ldl": -3.0,
            "blood_pressure_systolic": -2.0,
            # Natural aging still applies
        },
    },
    "combined_optimal": {
        "label": "Combined Optimal (All Interventions)",
        "description": "Medication + diet + exercise + smoking cessation — best-case scenario.",
        "color": "#40e0d0",
        "deltas": {
            "fasting_glucose": -4.5,
            "hba1c":           -0.65,
            "blood_pressure_systolic": -3.0,
            "cholesterol_ldl": -3.8,
            "bmi":             -0.30,
            "cholesterol_hdl": +0.6,
            "triglycerides":   -3.0,
            "smoking": "quit_year_1",
            "physical_activity_encoded": +0.08,
        },
    },
}

PROJECTION_YEARS = [0, 1, 2, 3, 5, 7, 10, 15, 20]

# Clinical bounds — prevent values going out of physiological range
BOUNDS = {
    "fasting_glucose":          (60.0,  600.0),
    "hba1c":                    (4.0,   16.0),
    "blood_pressure_systolic":  (80,    240),
    "blood_pressure_diastolic": (50,    140),
    "cholesterol_ldl":          (30.0,  400.0),
    "cholesterol_hdl":          (15.0,  150.0),
    "triglycerides":            (40.0,  800.0),
    "bmi":                      (14.0,  55.0),
    "physical_activity_encoded":(0,     3),
}


def _clamp(val: float, key: str) -> float:
    lo, hi = BOUNDS.get(key, (-1e9, 1e9))
    return max(lo, min(hi, val))


def _apply_deltas(
    state: Dict[str, Any],
    deltas: Dict[str, Any],
    year: int,
) -> Dict[str, Any]:
    """Apply one year of intervention deltas to the patient state."""
    new_state = copy.deepcopy(state)
    for key, delta in deltas.items():
        if key not in new_state:
            continue
        if delta == "quit_year_1":
            if year >= 1:
                new_state[key] = 0   # smoking = False after year 1
        elif isinstance(delta, (int, float)):
            new_state[key] = _clamp(float(new_state[key]) + delta, key)
    # Age increases naturally
    new_state["age"] = int(new_state["age"]) + 1
    return new_state


def simulate_timeline(
    patient: Dict[str, Any],
    base_predict_fn,  # callable: patient_dict → {"diabetes": {...}, "cardiovascular": {...}}
    intervention_keys: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Run timeline simulation for selected interventions.

    Returns:
    {
      "years": [0, 1, 2, ...],
      "scenarios": {
        "no_change": {
          "label": "...", "color": "...",
          "diabetes_prob":      [0.45, 0.47, ...],
          "cardiovascular_prob":[0.38, 0.40, ...],
          "snapshots": [patient_state_per_year, ...]
        },
        ...
      },
      "insights": ["At year 10, combined_optimal reduces CVD risk from high to moderate", ...]
    }
    """
    if intervention_keys is None:
        intervention_keys = list(INTERVENTIONS.keys())

    results: Dict[str, Any] = {
        "years": PROJECTION_YEARS,
        "scenarios": {},
        "insights": [],
    }

    baseline_result = base_predict_fn(patient)
    base_dia = baseline_result["diabetes"]["probability"]
    base_cvd = baseline_result["cardiovascular"]["probability"]

    for key in intervention_keys:
        if key not in INTERVENTIONS:
            continue
        intv = INTERVENTIONS[key]
        state = copy.deepcopy(patient)
        dia_probs, cvd_probs, snapshots = [], [], []

        for year in PROJECTION_YEARS:
            if year == 0:
                pred = baseline_result
            else:
                # Apply deltas year by year (cumulative)
                for _ in range(1):
                    state = _apply_deltas(state, intv["deltas"], year)
                pred = base_predict_fn(state)

            dia_probs.append(round(pred["diabetes"]["probability"], 4))
            cvd_probs.append(round(pred["cardiovascular"]["probability"], 4))
            snapshots.append({
                k: v for k, v in state.items()
                if k in ("age", "bmi", "fasting_glucose", "hba1c",
                         "blood_pressure_systolic", "cholesterol_ldl")
            })

        results["scenarios"][key] = {
            "label":              intv["label"],
            "description":        intv["description"],
            "color":              intv["color"],
            "diabetes_prob":      dia_probs,
            "cardiovascular_prob":cvd_probs,
            "snapshots":          snapshots,
        }

    # Generate insight strings
    results["insights"] = _generate_insights(
        results["scenarios"], PROJECTION_YEARS, base_dia, base_cvd
    )
    return results


def _generate_insights(
    scenarios: Dict,
    years: List[int],
    base_dia: float,
    base_cvd: float,
) -> List[str]:
    insights = []
    RISK_LABELS = ["low", "low", "moderate", "moderate", "high", "high", "high", "critical", "critical"]

    def risk_label(p: float) -> str:
        if p < 0.25: return "low"
        if p < 0.50: return "moderate"
        if p < 0.75: return "high"
        return "critical"

    for scenario_key, data in scenarios.items():
        if scenario_key == "no_change":
            continue
        label = data["label"]
        for i, yr in enumerate(years):
            if yr in (10, 20):
                d_now = base_dia
                c_now = base_cvd
                d_then = data["diabetes_prob"][i]
                c_then = data["cardiovascular_prob"][i]
                if risk_label(d_then) != risk_label(d_now):
                    insights.append(
                        f"'{label}': At year {yr}, diabetes risk changes from "
                        f"{risk_label(d_now)} → {risk_label(d_then)} "
                        f"({d_now*100:.0f}% → {d_then*100:.0f}%)"
                    )
                if risk_label(c_then) != risk_label(c_now):
                    insights.append(
                        f"'{label}': At year {yr}, CVD risk changes from "
                        f"{risk_label(c_now)} → {risk_label(c_then)} "
                        f"({c_now*100:.0f}% → {c_then*100:.0f}%)"
                    )
    return insights[:8]  # top 8 most interesting
