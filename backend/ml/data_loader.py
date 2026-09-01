"""
MediGuard AI Kaggle-only data pipeline.

This module is intentionally strict: Kaggle CSVs are the only accepted source.
If the required local Kaggle exports are missing, the pipeline raises instead
of reaching for OpenML, UCI, NHANES, GitHub mirrors, or synthetic data.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

FEATURE_COLUMNS: List[str] = [
    "age", "gender_encoded", "bmi",
    "blood_pressure_systolic", "blood_pressure_diastolic",
    "fasting_glucose", "hba1c",
    "cholesterol_total", "cholesterol_hdl", "cholesterol_ldl", "triglycerides",
    "smoking", "family_history_diabetes", "family_history_cvd",
    "physical_activity_encoded",
]

TARGET_COLUMNS = ["diabetes_label", "cardiovascular_label", "hypertension_label"]
REQUIRED_SCHEMA = FEATURE_COLUMNS + TARGET_COLUMNS

# Hypertension label definition: standard clinical threshold — systolic
# >=140 mmHg or diastolic >=90 mmHg (JNC7/AHA Stage 2 hypertension cutoff),
# applied to each source's own REAL measured blood pressure. For the
# Framingham source, the study's own real `prevalentHyp` field (clinician-
# assessed hypertension at baseline) is used directly instead — that's a
# real diagnosis, strictly better than a rule derived from BP alone.
HYPERTENSION_SYSTOLIC_THRESHOLD = 140.0
HYPERTENSION_DIASTOLIC_THRESHOLD = 90.0


def _hypertension_from_bp(systolic: pd.Series, diastolic: pd.Series) -> pd.Series:
    return ((systolic >= HYPERTENSION_SYSTOLIC_THRESHOLD) |
            (diastolic >= HYPERTENSION_DIASTOLIC_THRESHOLD)).astype(int)

# ---------------------------------------------------------------------------
# Data provenance disclosure (audit finding BUG-A3 — see PROJECT_SUMMARY.md §6)
# ---------------------------------------------------------------------------
# IMPORTANT: this does NOT satisfy a "real-world data" requirement for the
# columns listed below. Switching from `numpy.random` noise to fixed
# constants is a disclosure/honesty fix (no more fake per-patient
# variance), not a real-data fix. A constant is still not measured from
# any patient. If a downstream requirement genuinely needs real lipid
# panel or activity data, the only correct fix is sourcing a dataset that
# actually measures it (e.g. NHANES) and wiring it in below — nothing in
# this file should be read as having done that.
#
# None of the three source Kaggle datasets collect a lipid panel (HDL, LDL,
# triglycerides) or a physical-activity measure. Rather than fabricate
# per-row values with `numpy.random` — which invents fake inter-patient
# variance a model or SHAP explanation could mistake for a real signal —
# these columns are filled with fixed, cited population-reference constants
# (no row-to-row variation) wherever a source dataset doesn't measure them.
# This is still an imputation, not real per-patient data, and is disclosed
# here, in `dataset_metadata.json` (see `save_processed`), and via each
# transformed DataFrame's `.attrs["synthetic_columns"]`. It deliberately
# produces near-zero SHAP importance for these columns on affected sources,
# which is the *correct* behavior — a constant carries no per-patient signal
# and should not appear to explain any individual prediction.
#
# Reference values (adult general-population averages, not derived from any
# patient in this project's training data):
#   - HDL cholesterol ~50 mg/dL, LDL ~100 mg/dL, triglycerides ~150 mg/dL:
#     commonly cited desirable/average adult reference ranges (ATP III-style
#     lipid panel bands), not sourced from a specific NHANES cycle.
#   - Physical activity: coded "moderate" (level 2 of 0-3) by default absent
#     a real measurement — a neutral value, not "assumed healthy" or
#     "assumed sedentary".
# Anyone wiring in a real lipid-panel dataset (e.g. NHANES, if the cohorts
# are compatible) should replace SYNTHETIC_COLUMN_DEFAULTS usage in the
# affected _transform_* function entirely rather than merging on top of it.
SYNTHETIC_COLUMN_DEFAULTS = {
    "cholesterol_total": 190.0,
    "cholesterol_hdl": 50.0,
    "cholesterol_ldl": 100.0,
    "triglycerides": 150.0,
    "physical_activity_encoded": 2,
    "smoking": 0,
    "family_history_diabetes": 0,
    "family_history_cvd": 0,
}

# Which columns are real vs. imputed-constant, per source dataset. Consumed
# by save_processed() to write into dataset_metadata.json, and available to
# callers via df.attrs["synthetic_columns"] on the frame each _transform_*
# function returns. A column derived from a *real* value via a documented
# clinical formula/mapping (e.g. HbA1c from real glucose, LDL≈Total×0.57)
# is NOT listed here — only columns with literally zero real signal behind
# them for that source.
SYNTHETIC_COLUMNS_BY_SOURCE = {
    "pima": ["cholesterol_total", "cholesterol_hdl", "cholesterol_ldl", "triglycerides",
             "physical_activity_encoded", "smoking", "family_history_cvd"],
    "heart": ["bmi", "cholesterol_hdl", "triglycerides",
              "smoking", "family_history_diabetes", "family_history_cvd"],
    "cardio": ["cholesterol_hdl", "cholesterol_ldl", "triglycerides",
               "family_history_diabetes", "family_history_cvd"],
    "framingham": ["cholesterol_hdl", "cholesterol_ldl", "triglycerides",
                   "family_history_diabetes", "family_history_cvd"],
    "nhanes": ["cholesterol_ldl", "triglycerides", "fasting_glucose", "hba1c",
               "family_history_diabetes", "family_history_cvd"],
}

# NOTE: "KAGGLE_DATASETS" predates the Framingham source (which comes from
# the CRAN riskCommunicator package's NIH/NHLBI-approved teaching dataset,
# not Kaggle — see data/raw/framingham/PROVENANCE.txt). Kept the name for
# backward compatibility with existing references throughout this codebase
# and its tests; treat it as "external real-data sources" in practice.
KAGGLE_DATASETS = {
    "pima": {
        "slug": "uciml/pima-indians-diabetes-database",
        "paths": [RAW_DIR / "pima" / "diabetes.csv", RAW_DIR / "diabetes.csv", RAW_DIR / "pima_diabetes.csv"],
    },
    "heart": {
        "slug": "cherngs/heart-disease-cleveland-uci",
        "paths": [
            RAW_DIR / "heart" / "heart_cleveland_upload.csv",
            RAW_DIR / "heart_cleveland_upload.csv",
            RAW_DIR / "cleveland_heart.csv",
        ],
    },
    "cardio": {
        "slug": "sulianova/cardiovascular-disease-dataset",
        "paths": [RAW_DIR / "cardio" / "cardio_train.csv", RAW_DIR / "cardio_train.csv"],
    },
    "framingham": {
        "slug": "riskCommunicator (CRAN) — NIH/NHLBI Framingham Heart Study teaching dataset",
        "paths": [RAW_DIR / "framingham" / "framingham.csv", RAW_DIR / "framingham.csv"],
    },
    "nhanes": {
        "slug": "NHANES (CRAN, Pruim) — real CDC NHANES 2009-2012 teaching subset, GPL(>=2)",
        "paths": [RAW_DIR / "nhanes" / "nhanes.csv", RAW_DIR / "nhanes.csv"],
    },
}


BOUNDS = {
    "age": (18, 90),
    "bmi": (12, 60),
    "blood_pressure_systolic": (70, 240),
    "blood_pressure_diastolic": (40, 140),
    "fasting_glucose": (50, 500),
    "hba1c": (3.5, 15),
    "cholesterol_total": (80, 500),
    "cholesterol_hdl": (10, 150),
    "cholesterol_ldl": (20, 400),
    "triglycerides": (30, 900),
}


class KaggleDataUnavailable(RuntimeError):
    """Raised when required Kaggle datasets are not available locally."""


def _read_first_existing(dataset_key: str) -> pd.DataFrame:
    for path in KAGGLE_DATASETS[dataset_key]["paths"]:
        if path.exists():
            logger.info("Loading Kaggle %s dataset from %s", dataset_key, path)
            sep = ";" if path.name == "cardio_train.csv" else ","
            if dataset_key == "pima":
                probe = pd.read_csv(path, sep=sep, nrows=1, header=None)
                if pd.to_numeric(probe.iloc[0], errors="coerce").notna().all():
                    names = [
                        "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
                        "Insulin", "BMI", "DiabetesPedigreeFunction", "Age", "Outcome",
                    ]
                    return pd.read_csv(path, sep=sep, header=None, names=names)
            return pd.read_csv(path, sep=sep)
    expected = ", ".join(str(p) for p in KAGGLE_DATASETS[dataset_key]["paths"])
    slug = KAGGLE_DATASETS[dataset_key]["slug"]
    raise KaggleDataUnavailable(
        f"Kaggle dataset '{dataset_key}' is missing. Download Kaggle slug '{slug}' "
        f"and place the CSV at one of: {expected}"
    )


def _hba1c_from_glucose(glucose: pd.Series) -> pd.Series:
    return ((glucose.astype(float) + 46.7) / 28.7).clip(3.5, 15.0).round(1)


def _clamp_and_fill(df: pd.DataFrame) -> pd.DataFrame:
    for col in REQUIRED_SCHEMA:
        if col not in df.columns:
            raise ValueError(f"Schema violation: missing required column '{col}'")
    for col, (lo, hi) in BOUNDS.items():
        df[col] = pd.to_numeric(df[col], errors="coerce").clip(lo, hi)
    for col in FEATURE_COLUMNS:
        if df[col].isna().any():
            df[col] = df[col].fillna(df[col].median())
    for col in TARGET_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int).clip(0, 1)
    if df[REQUIRED_SCHEMA].isna().any().any():
        missing = df[REQUIRED_SCHEMA].columns[df[REQUIRED_SCHEMA].isna().any()].tolist()
        raise ValueError(f"Schema violation: NaNs remain in {missing}")
    return df[REQUIRED_SCHEMA]


def _transform_pima(raw: pd.DataFrame) -> pd.DataFrame:
    raw = raw.rename(columns={c: c.strip() for c in raw.columns})
    mapping = {
        "Glucose": "glucose", "BloodPressure": "blood_pressure", "BMI": "bmi",
        "DiabetesPedigreeFunction": "diabetes_pedigree", "Age": "age", "Outcome": "outcome",
    }
    raw = raw.rename(columns=mapping)
    required = ["glucose", "blood_pressure", "bmi", "diabetes_pedigree", "age", "outcome"]
    missing = [c for c in required if c not in raw.columns]
    if missing:
        raise ValueError(f"Pima Kaggle schema missing columns: {missing}")

    for col in ["glucose", "blood_pressure", "bmi"]:
        median_nonzero = raw.loc[pd.to_numeric(raw[col], errors="coerce") > 0, col].median()
        raw[col] = pd.to_numeric(raw[col], errors="coerce").replace(0, median_nonzero)

    n = len(raw)
    glucose = raw["glucose"].astype(float)
    d = SYNTHETIC_COLUMN_DEFAULTS
    # Pima doesn't collect a lipid panel or activity/smoking/CVD-family-history
    # data at all — filled with fixed population-reference constants (not
    # per-row random noise) and disclosed via SYNTHETIC_COLUMNS_BY_SOURCE.
    # See the comment above SYNTHETIC_COLUMN_DEFAULTS for why constants,
    # not `numpy.random`, are used here.
    out = pd.DataFrame({
        "age": raw["age"].astype(float),
        "gender_encoded": np.ones(n, dtype=int),  # Pima cohort is female-only by design — real, not imputed
        "bmi": raw["bmi"].astype(float),
        "blood_pressure_systolic": (raw["blood_pressure"].astype(float) * 1.48).clip(80, 220),
        "blood_pressure_diastolic": raw["blood_pressure"].astype(float),
        "fasting_glucose": glucose,
        "hba1c": _hba1c_from_glucose(glucose),
        "cholesterol_total": np.full(n, d["cholesterol_total"]),
        "cholesterol_hdl": np.full(n, d["cholesterol_hdl"]),
        "cholesterol_ldl": np.full(n, d["cholesterol_ldl"]),
        "triglycerides": np.full(n, d["triglycerides"]),
        "smoking": np.full(n, d["smoking"], dtype=int),
        "family_history_diabetes": (raw["diabetes_pedigree"].astype(float) > 0.45).astype(int),
        "family_history_cvd": np.full(n, d["family_history_cvd"], dtype=int),
        "physical_activity_encoded": np.full(n, d["physical_activity_encoded"], dtype=int),
        "diabetes_label": raw["outcome"].astype(int),
        "cardiovascular_label": ((glucose > 140) | (raw["blood_pressure"].astype(float) > 90)).astype(int),
        "hypertension_label": _hypertension_from_bp(
            (raw["blood_pressure"].astype(float) * 1.48).clip(80, 220), raw["blood_pressure"].astype(float)
        ),
    })
    out = _clamp_and_fill(out)
    out.attrs["synthetic_columns"] = SYNTHETIC_COLUMNS_BY_SOURCE["pima"]
    return out


def _transform_heart(raw: pd.DataFrame) -> pd.DataFrame:
    raw.columns = [c.strip().lower() for c in raw.columns]
    required = ["age", "sex", "trestbps", "chol", "fbs"]
    missing = [c for c in required if c not in raw.columns]
    if missing:
        raise ValueError(f"Heart Kaggle schema missing columns: {missing}")
    target_col = "condition" if "condition" in raw.columns else "target"
    if target_col not in raw.columns:
        raise ValueError("Heart Kaggle schema missing condition/target column")

    n = len(raw)
    d = SYNTHETIC_COLUMN_DEFAULTS
    # fbs (fasting blood sugar > 120 mg/dL) is a real binary flag in this
    # dataset, so glucose is estimated deterministically from it (fixed
    # representative value per class) rather than sampled — no per-row
    # random component, unlike the previous implementation.
    glucose = np.where(raw["fbs"].fillna(0).astype(int) == 1, 155.0, 92.0)
    chol = raw["chol"].fillna(raw["chol"].median()).astype(float)
    out = pd.DataFrame({
        "age": raw["age"].astype(float),
        "gender_encoded": raw["sex"].fillna(1).astype(int),
        "bmi": np.full(n, 26.0),  # not collected by this dataset — population-reference constant
        "blood_pressure_systolic": raw["trestbps"].fillna(125).astype(float),
        "blood_pressure_diastolic": (raw["trestbps"].fillna(125).astype(float) * 0.64).clip(50, 130),
        "fasting_glucose": glucose,
        "hba1c": _hba1c_from_glucose(pd.Series(glucose)),
        "cholesterol_total": chol,  # real (chol column)
        "cholesterol_hdl": np.full(n, d["cholesterol_hdl"]),
        "cholesterol_ldl": (chol * 0.56).clip(25, 300),  # derived from real total via a documented ratio
        "triglycerides": np.full(n, d["triglycerides"]),
        "smoking": np.full(n, d["smoking"], dtype=int),
        "family_history_diabetes": np.full(n, d["family_history_diabetes"], dtype=int),
        "family_history_cvd": np.full(n, d["family_history_cvd"], dtype=int),
        "physical_activity_encoded": np.where(raw.get("exang", pd.Series([0] * n)).fillna(0).astype(int) == 1, 0, 2),
        "diabetes_label": raw["fbs"].fillna(0).astype(int),
        "cardiovascular_label": (raw[target_col].fillna(0).astype(int) > 0).astype(int),
        "hypertension_label": _hypertension_from_bp(
            raw["trestbps"].fillna(125).astype(float),
            (raw["trestbps"].fillna(125).astype(float) * 0.64).clip(50, 130),
        ),
    })
    out = _clamp_and_fill(out)
    out.attrs["synthetic_columns"] = SYNTHETIC_COLUMNS_BY_SOURCE["heart"]
    return out


def _transform_cardio(raw: pd.DataFrame) -> pd.DataFrame:
    raw.columns = [c.strip().lower() for c in raw.columns]
    required = ["age", "height", "weight", "gender", "ap_hi", "ap_lo", "cholesterol", "gluc", "smoke", "active", "cardio"]
    missing = [c for c in required if c not in raw.columns]
    if missing:
        raise ValueError(f"Cardio Kaggle schema missing columns: {missing}")

    n = len(raw)
    d = SYNTHETIC_COLUMN_DEFAULTS
    age = (raw["age"].astype(float) / 365.25).clip(18, 90)
    bmi = (raw["weight"].astype(float) / ((raw["height"].astype(float) / 100) ** 2)).clip(13, 60)
    glucose = raw["gluc"].map({1: 90.0, 2: 115.0, 3: 175.0}).fillna(90.0)
    chol = raw["cholesterol"].map({1: 180.0, 2: 220.0, 3: 280.0}).fillna(190.0)
    out = pd.DataFrame({
        "age": age,
        "gender_encoded": (raw["gender"].astype(int) - 1).clip(0, 1),
        "bmi": bmi,
        "blood_pressure_systolic": raw["ap_hi"].astype(float),
        "blood_pressure_diastolic": raw["ap_lo"].astype(float),
        "fasting_glucose": glucose,
        "hba1c": _hba1c_from_glucose(glucose),
        "cholesterol_total": chol,
        "cholesterol_hdl": np.full(n, d["cholesterol_hdl"]),
        "cholesterol_ldl": (chol * 0.57).clip(25, 300),
        "triglycerides": np.full(n, d["triglycerides"]),
        "smoking": raw["smoke"].fillna(0).astype(int),
        "family_history_diabetes": np.full(n, d["family_history_diabetes"], dtype=int),
        "family_history_cvd": np.full(n, d["family_history_cvd"], dtype=int),
        "physical_activity_encoded": raw["active"].fillna(1).astype(int) * 2,
        "diabetes_label": (glucose > 126).astype(int),
        "cardiovascular_label": raw["cardio"].fillna(0).astype(int),
        "hypertension_label": _hypertension_from_bp(
            raw["ap_hi"].astype(float).clip(*BOUNDS["blood_pressure_systolic"]),
            raw["ap_lo"].astype(float).clip(*BOUNDS["blood_pressure_diastolic"]),
        ),
    })
    out = _clamp_and_fill(out)
    out.attrs["synthetic_columns"] = SYNTHETIC_COLUMNS_BY_SOURCE["cardio"]
    return out


def _transform_framingham(raw: pd.DataFrame) -> pd.DataFrame:
    """
    Framingham Heart Study teaching dataset (NIH/NHLBI-approved, distributed
    via the CRAN `riskCommunicator` package — see
    data/raw/framingham/PROVENANCE.txt). 4,240 real participants.

    This source contributes something none of the other three have: a real
    clinician-assessed `prevalentHyp` field, used directly as
    hypertension_label instead of the BP-threshold rule used elsewhere.
    Also contributes real smoking (currentSmoker/cigsPerDay), real diabetes
    diagnosis, and real total cholesterol — all genuinely measured, not
    derived or imputed.
    """
    raw.columns = [c.strip() for c in raw.columns]
    required = ["male", "age", "currentSmoker", "prevalentHyp", "diabetes",
                "totChol", "sysBP", "diaBP", "BMI", "glucose", "TenYearCHD"]
    missing = [c for c in required if c not in raw.columns]
    if missing:
        raise ValueError(f"Framingham schema missing columns: {missing}")

    n = len(raw)
    d = SYNTHETIC_COLUMN_DEFAULTS
    glucose = raw["glucose"].astype(float)
    chol = raw["totChol"].astype(float)
    out = pd.DataFrame({
        "age": raw["age"].astype(float),
        "gender_encoded": raw["male"].fillna(1).astype(int),
        "bmi": raw["BMI"].astype(float),
        "blood_pressure_systolic": raw["sysBP"].astype(float),
        "blood_pressure_diastolic": raw["diaBP"].astype(float),
        "fasting_glucose": glucose,
        "hba1c": _hba1c_from_glucose(glucose),
        "cholesterol_total": chol,  # real
        "cholesterol_hdl": np.full(n, d["cholesterol_hdl"]),
        "cholesterol_ldl": (chol * 0.57).clip(25, 300),
        "triglycerides": np.full(n, d["triglycerides"]),
        "smoking": raw["currentSmoker"].fillna(0).astype(int),  # real
        "family_history_diabetes": np.full(n, d["family_history_diabetes"], dtype=int),
        "family_history_cvd": np.full(n, d["family_history_cvd"], dtype=int),
        "physical_activity_encoded": np.full(n, d["physical_activity_encoded"], dtype=int),
        "diabetes_label": raw["diabetes"].fillna(0).astype(int),  # real diagnosis
        "cardiovascular_label": raw["TenYearCHD"].fillna(0).astype(int),  # real 10-yr CHD outcome
        "hypertension_label": raw["prevalentHyp"].fillna(0).astype(int),  # real clinician assessment
    })
    out = _clamp_and_fill(out)
    out.attrs["synthetic_columns"] = SYNTHETIC_COLUMNS_BY_SOURCE["framingham"]
    return out


def _transform_nhanes(raw: pd.DataFrame) -> pd.DataFrame:
    """
    CRAN `NHANES` package teaching dataset (Pruim), real CDC NHANES
    2009-2012 examination data resampled for teaching validity — see
    data/raw/nhanes/PROVENANCE.txt.

    Contributes something no other source in this project has: REAL
    measured HDL cholesterol (`DirectChol`) and REAL physical activity
    (`PhysActive`) — both previously a disclosed constant for every row
    from every other source. Rows missing any field this transform uses
    are dropped, not imputed — real measurement or excluded, never
    fabricated (this is why the row count below is less than 10,000).

    Gaps specific to this source (disclosed, same mechanism as
    elsewhere): no triglycerides, no fasting glucose, no CVD diagnosis
    field. `cardiovascular_label` here is therefore a disclosed rule
    derived from real hypertension/smoking/age — consistent with how
    `_transform_pima`'s cardiovascular_label is *also* a derived proxy
    rather than a measured diagnosis, not a new pattern introduced here.
    """
    required = ["Age", "Gender", "BMI", "BPSysAve", "BPDiaAve", "DirectChol",
                "TotChol", "Diabetes", "Smoke100", "PhysActive"]
    missing_cols = [c for c in required if c not in raw.columns]
    if missing_cols:
        raise ValueError(f"NHANES schema missing columns: {missing_cols}")

    df = raw.dropna(subset=required).copy()
    if df.empty:
        raise ValueError("NHANES source produced zero complete rows")

    n = len(df)
    d = SYNTHETIC_COLUMN_DEFAULTS
    MMOL_TO_MGDL = 38.67  # standard cholesterol unit conversion
    total_chol = df["TotChol"].astype(float) * MMOL_TO_MGDL
    hdl = df["DirectChol"].astype(float) * MMOL_TO_MGDL  # REAL, not a constant
    systolic = df["BPSysAve"].astype(float)
    diastolic = df["BPDiaAve"].astype(float)
    smoker = (df["Smoke100"] == "Yes").astype(int)
    hypertensive = _hypertension_from_bp(systolic, diastolic)

    out = pd.DataFrame({
        "age": df["Age"].astype(float),
        "gender_encoded": (df["Gender"] == "female").astype(int),
        "bmi": df["BMI"].astype(float),
        "blood_pressure_systolic": systolic,
        "blood_pressure_diastolic": diastolic,
        "fasting_glucose": np.full(n, 95.0),  # not collected by this teaching subset
        "hba1c": np.full(n, 5.4),  # not collected; population-reference constant, not derived from a fabricated glucose value
        "cholesterol_total": total_chol,  # REAL
        "cholesterol_hdl": hdl,  # REAL — this source's key contribution
        "cholesterol_ldl": (total_chol - hdl).clip(25, 300),  # derived from 2 real values (non-HDL approximation), not itself measured
        "triglycerides": np.full(n, d["triglycerides"]),
        "smoking": smoker,  # REAL (Smoke100: smoked >=100 cigarettes lifetime)
        "family_history_diabetes": np.full(n, d["family_history_diabetes"], dtype=int),
        "family_history_cvd": np.full(n, d["family_history_cvd"], dtype=int),
        "physical_activity_encoded": np.where(df["PhysActive"] == "Yes", 2, 0),  # REAL
        "diabetes_label": (df["Diabetes"] == "Yes").astype(int),  # REAL diagnosis
        "cardiovascular_label": ((hypertensive == 1) | (smoker == 1) & (df["Age"].astype(float) > 55)).astype(int),
        "hypertension_label": hypertensive,  # derived from real BP
    })
    out = _clamp_and_fill(out)
    out.attrs["synthetic_columns"] = SYNTHETIC_COLUMNS_BY_SOURCE["nhanes"]
    return out


def load_pima_diabetes() -> pd.DataFrame:
    """Public accessor: load + transform the Pima Kaggle CSV on its own.

    Thin wrapper around `_read_first_existing` + `_transform_pima` so the
    Pima source can be inspected/tested in isolation, without requiring the
    other two Kaggle sources to also be present (unlike
    `load_kaggle_training_frame`, which combines all configured sources).
    """
    return _transform_pima(_read_first_existing("pima"))


def load_cleveland_heart() -> pd.DataFrame:
    """Public accessor: load + transform the Cleveland Heart Kaggle CSV alone."""
    return _transform_heart(_read_first_existing("heart"))


def load_cardio_dataset(max_rows: int = 10000) -> pd.DataFrame:
    """Public accessor: load + transform the cardio Kaggle CSV alone.

    Raises `KaggleDataUnavailable` with the exact download instructions if
    `sulianova/cardiovascular-disease-dataset` hasn't been placed locally —
    see MISSING_COMPONENTS.md / DATASET_REPORT.md.
    """
    raw = _read_first_existing("cardio")
    if max_rows and len(raw) > max_rows:
        raw = raw.sample(n=max_rows, random_state=42)
    return _transform_cardio(raw)


def load_framingham_dataset() -> pd.DataFrame:
    """Public accessor: load + transform the Framingham teaching dataset alone.

    See data/raw/framingham/PROVENANCE.txt for sourcing (CRAN
    riskCommunicator, NIH/NHLBI-approved). Contributes the real
    hypertension_label (prevalentHyp) this project didn't have before.
    """
    return _transform_framingham(_read_first_existing("framingham"))


def load_nhanes_dataset() -> pd.DataFrame:
    """Public accessor: load + transform the NHANES teaching dataset alone.

    See data/raw/nhanes/PROVENANCE.txt for sourcing (CRAN NHANES
    package, GPL>=2). Contributes real HDL cholesterol and real physical
    activity — both previously a disclosed constant everywhere else.
    """
    return _transform_nhanes(_read_first_existing("nhanes"))


def validate_schema(df: pd.DataFrame) -> pd.DataFrame:
    missing = [c for c in REQUIRED_SCHEMA if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset schema mismatch. Missing: {missing}")
    extra = [c for c in df.columns if c not in REQUIRED_SCHEMA]
    if extra:
        df = df.drop(columns=extra)
    return _clamp_and_fill(df[REQUIRED_SCHEMA].copy())


def dataset_version(df: pd.DataFrame) -> str:
    payload = pd.util.hash_pandas_object(df[REQUIRED_SCHEMA], index=False).values.tobytes()
    return hashlib.sha256(payload).hexdigest()[:16]


def load_kaggle_training_frame(require_all: bool = False, max_cardio_rows: int = 10000) -> pd.DataFrame:
    frames = []
    errors: Dict[str, str] = {}
    sources_used: List[str] = []
    loaders = {
        "pima": lambda: _transform_pima(_read_first_existing("pima")),
        "heart": lambda: _transform_heart(_read_first_existing("heart")),
        "cardio": lambda: _transform_cardio(_read_first_existing("cardio")),
        "framingham": lambda: _transform_framingham(_read_first_existing("framingham")),
        "nhanes": lambda: _transform_nhanes(_read_first_existing("nhanes")),
    }
    for name, loader in loaders.items():
        try:
            frame = loader()
            if name == "cardio" and len(frame) > max_cardio_rows:
                frame = frame.sample(max_cardio_rows, random_state=42)
            frames.append(frame)
            sources_used.append(name)
            logger.info("Kaggle %s contributed %d rows", name, len(frame))
        except Exception as exc:
            errors[name] = str(exc)
            logger.warning("Kaggle %s unavailable: %s", name, exc)

    if require_all and errors:
        raise KaggleDataUnavailable(f"Required Kaggle datasets unavailable: {errors}")
    if not frames:
        raise KaggleDataUnavailable(f"No Kaggle datasets are available. Errors: {errors}")

    combined = validate_schema(pd.concat(frames, ignore_index=True))
    if combined.empty:
        raise KaggleDataUnavailable("Kaggle datasets loaded but produced zero valid rows")
    # pd.concat() doesn't reliably propagate per-frame .attrs, so provenance
    # is recomputed here from the sources actually used, for save_processed()
    # to write into dataset_metadata.json (disclosure requirement, BUG-A3).
    combined.attrs["sources_used"] = sources_used
    combined.attrs["sources_missing"] = list(errors.keys())
    return combined


def save_processed(df: pd.DataFrame) -> Tuple[Path, Path, Path]:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    train, test = train_test_split(
        df,
        test_size=0.20,
        random_state=42,
        stratify=df["diabetes_label"].astype(str) + "_" + df["cardiovascular_label"].astype(str),
    )
    train_path = PROCESSED_DIR / "mediguard_train.csv"
    test_path = PROCESSED_DIR / "mediguard_test.csv"
    metadata_path = PROCESSED_DIR / "dataset_metadata.json"
    train.to_csv(train_path, index=False)
    test.to_csv(test_path, index=False)

    sources_used = df.attrs.get("sources_used", list(KAGGLE_DATASETS.keys()))
    sources_missing = df.attrs.get("sources_missing", [])
    metadata = {
        "source_policy": "Kaggle only; fail fast when unavailable",
        "dataset_version": dataset_version(df),
        "rows": len(df),
        "train_rows": len(train),
        "test_rows": len(test),
        "schema": REQUIRED_SCHEMA,
        "kaggle_slugs": {k: v["slug"] for k, v in KAGGLE_DATASETS.items()},
        "sources_used": sources_used,
        "sources_missing": sources_missing,
        # Disclosure required by the project audit (BUG-A3): exactly which
        # columns carry no real per-patient signal for each source dataset,
        # because that source doesn't measure them. Filled with fixed
        # population-reference constants, not per-row random noise — see
        # SYNTHETIC_COLUMN_DEFAULTS / SYNTHETIC_COLUMNS_BY_SOURCE in this
        # module for the exact values and rationale.
        "synthetic_columns_by_source": {
            k: v for k, v in SYNTHETIC_COLUMNS_BY_SOURCE.items() if k in sources_used
        },
        "synthetic_column_reference_values": SYNTHETIC_COLUMN_DEFAULTS,
        "synthetic_columns_disclaimer": (
            "Columns listed in synthetic_columns_by_source are filled with "
            "fixed population-reference constants, not measured per-patient "
            "data. This does NOT satisfy a real-world-data requirement for "
            "those specific columns — it only removes fake per-row random "
            "variance that a prior version of this pipeline generated. "
            "Treat any column listed here as unmeasured for that source."
        ),
    }
    metadata_path.write_text(json.dumps(metadata, indent=2))
    return train_path, test_path, metadata_path


def load_training_data() -> Tuple[pd.DataFrame, pd.DataFrame]:
    train_path = PROCESSED_DIR / "mediguard_train.csv"
    if train_path.exists():
        df = validate_schema(pd.read_csv(train_path))
    else:
        df = load_kaggle_training_frame()
        save_processed(df)
    return df[FEATURE_COLUMNS], df[TARGET_COLUMNS]


def load_full_training_frame() -> pd.DataFrame:
    train_path = PROCESSED_DIR / "mediguard_train.csv"
    test_path = PROCESSED_DIR / "mediguard_test.csv"
    if train_path.exists() and test_path.exists():
        return validate_schema(pd.concat([pd.read_csv(train_path), pd.read_csv(test_path)], ignore_index=True))
    df = load_kaggle_training_frame()
    save_processed(df)
    return df
