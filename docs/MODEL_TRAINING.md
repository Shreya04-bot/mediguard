# MediGuard AI — Model Training Guide

How to retrain the disease-risk model yourself, from real data, end to end.

## Prerequisites

- Python 3.11+ (project developed/tested against 3.12)
- `pip install -r backend/requirements.txt` (includes pandas, numpy,
  scikit-learn, xgboost, shap, mlflow, pytest)
- No API keys or GPU required — training runs on CPU in well under a
  minute on the real dataset (~22k rows).

## Dataset setup

See `docs/DATASET_SETUP.md` for the full reference (per-source download
commands, licenses, how to add a 6th source). Quick summary — real data
already ships with this repository under `backend/data/raw/`:

| Source | Path | Rows | What it contributes |
|---|---|---|---|
| Pima Indians Diabetes | `backend/data/raw/pima_diabetes.csv` | 768 | Real diabetes diagnoses (Pima Indian women cohort) |
| Cleveland Heart Disease | `backend/data/raw/cleveland_heart.csv` | ~297 | Real CVD diagnoses, real cholesterol |
| Cardiovascular disease dataset | `backend/data/raw/cardio/cardio_train.csv` | 70,000 | Real BP/lipid-category/lifestyle data, general population |
| Framingham Heart Study (teaching set) | `backend/data/raw/framingham/framingham.csv` | 4,240 | Real `prevalentHyp` (hypertension), real smoking, real diabetes diagnosis |
| NHANES (teaching set) | `backend/data/raw/nhanes/nhanes.csv` | 10,000 (6,575 complete rows used) | **Real HDL cholesterol and real physical activity** — the two features every other source above fills with a disclosed constant |

Provenance for each (source URL, license, how it was obtained) is
documented next to each file — see `backend/data/raw/cardio/PROVENANCE.txt`,
`backend/data/raw/framingham/PROVENANCE.txt`,
`backend/data/raw/nhanes/PROVENANCE.txt`, and
`docs/datasets/KAGGLE_GUIDE.md` for the Pima/Heart sources. If any file is
missing, `ml/data_loader.py` trains on whichever sources ARE present and
records exactly which in `data/processed/dataset_metadata.json`
(`sources_used` / `sources_missing`) — it never fabricates a substitute.

Some clinical features (LDL, triglycerides, and a few others) still
aren't measured by any source — see `ml/data_loader.py`'s
`SYNTHETIC_COLUMNS_BY_SOURCE` for exactly which columns, per source, are
filled with a disclosed fixed constant rather than a real per-patient
value. This is documented, not hidden, and does not pretend to be real
data — see `PROJECT_SUMMARY.md` §6 for the full disclosure.

## Training command

```bash
cd backend
python -m ml.train --force-replace
```

Drop `--force-replace` to only promote the new run if it beats the
current `models/best_model.pkl` on macro-averaged ROC-AUC (this is how
`POST /predict/train`, the admin-only retrain API endpoint, behaves too).

There is deliberately **no** `train_diabetes.py` / `train_hypertension.py`
/ `train_cardiovascular.py` split — the production model is one joint
`Pipeline(StandardScaler -> MultiOutputClassifier(XGBoost))` fit once
across all three targets and one shared train/val split, not three
separate models. Splitting the entrypoint into three scripts would either
silently diverge from what's actually deployed, or be a cosmetic wrapper
around the same `fit()` call. Per-target metrics are still fully broken
out in the output (see below).

**Note on reproducibility:** re-running training can shift AUC by roughly
±0.5% between runs even with a fixed `random_state=42` throughout the
pipeline (data loading, train/test split, and the model itself). This is
expected, well-documented XGBoost behavior — histogram-based tree
construction sums floating-point values in an order that isn't perfectly
associative, so bit-for-bit determinism isn't guaranteed even
single-threaded. It is not a bug in this pipeline.

## What gets generated

```
models/
├── best_model.pkl          Currently-promoted model (joblib bundle: pipeline + version + metadata)
├── model_metadata.json     Registry: every trained version's metrics + which is "best"
└── versions/
    └── v1.pkl               Every individual training run (kept even if not promoted)

backend/data/processed/
├── mediguard_train.csv      80% split used for this run
├── mediguard_test.csv       20% held-out split (never trained on)
└── dataset_metadata.json    Row counts, sources used/missing, synthetic-column disclosure

backend/mlruns/ + mlflow.db  MLflow tracking store (gitignored — regenerate by training)
```

Baseline model comparison (Logistic Regression / Random Forest / XGBoost,
run separately from the production training path):

```bash
python -m ml.baseline_comparison
```

Generates `docs/MODEL_COMPARISON.md` (human-readable) and
`backend/ml/artifacts/model_comparison.json` (machine-readable).

## Metrics computed

Per target (`diabetes_label`, `cardiovascular_label`, `hypertension_label`)
and macro-averaged across all three: Accuracy, Precision, Recall, F1,
ROC-AUC. All logged to MLflow (`mlflow.log_metrics`) and to
`model_metadata.json`. SHAP `TreeExplainer` values are computed per
prediction at inference time (not stored per-training-run — see
`ml/model.py::MediGuardMLModel.predict()`).

## How the API uses the trained model

```
data/raw/*.csv (real datasets)
        │
        ▼
ml/data_loader.py     load, validate schema, derive labels, disclose provenance
        │
        ▼
ml/model.py            80/20 stratified split → fit Pipeline → evaluate → SHAP-ready
        │
        ▼
MLflow                  every run logged (metrics, params, model artifact)
        │
        ▼
models/best_model.pkl   promoted version only
        │
        ▼
ml/model.py::get_model()   singleton loaded once at API startup (utils/startup_check.py)
        │
        ▼
POST /predict            real-time inference + SHAP explanation, per request
        │
        ▼
frontend                 PatientDashboard / DoctorPatientDetailPage / MLOpsPage render results
```

If `models/best_model.pkl` doesn't exist yet (fresh clone before ever
training), `utils/startup_check.py` trains one automatically on backend
startup using whatever real sources are present under `data/raw/`.
