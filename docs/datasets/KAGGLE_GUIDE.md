# MediGuard AI — Kaggle Dataset Guide
# What to Download, Where to Store, How to Process

## Overview

MediGuard AI uses 4 Kaggle datasets + 1 UCI dataset for training and validation.
A synthetic data generator is included as fallback for offline use.

---

## DATASET 1 — Primary: PIMA Indians Diabetes Dataset (UCI / Kaggle)

**Kaggle URL:** https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database

**Why:** Gold standard diabetes prediction benchmark. 768 patients.

**Download steps:**
```bash
# Install Kaggle CLI
pip install kaggle

# Place your kaggle.json API token at ~/.kaggle/kaggle.json
# Get it from: https://www.kaggle.com/settings → Create New Token

kaggle datasets download -d uciml/pima-indians-diabetes-database
unzip pima-indians-diabetes-database.zip -d backend/data/raw/pima/
```

**File produced:** `backend/data/raw/pima/diabetes.csv`

**Columns:**
| Column | Maps to MediGuard field |
|--------|------------------------|
| Pregnancies | (context, not used directly) |
| Glucose | fasting_glucose |
| BloodPressure | blood_pressure_diastolic |
| SkinThickness | (drop) |
| Insulin | (context) |
| BMI | bmi |
| DiabetesPedigreeFunction | family_history_diabetes (> 0.5 = True) |
| Age | age |
| Outcome | diabetes_label |

---

## DATASET 2 — Heart Disease: Cleveland Heart Disease Dataset

**Kaggle URL:** https://www.kaggle.com/datasets/cherngs/heart-disease-cleveland-uci

```bash
kaggle datasets download -d cherngs/heart-disease-cleveland-uci
unzip heart-disease-cleveland-uci.zip -d backend/data/raw/heart/
```

**File produced:** `backend/data/raw/heart/heart_cleveland_upload.csv`

**Columns:**
| Column | Maps to MediGuard field |
|--------|------------------------|
| age | age |
| sex | gender_encoded |
| cp (chest pain type) | symptoms |
| trestbps | blood_pressure_systolic |
| chol | cholesterol_total |
| fbs | (fasting blood sugar >120) |
| thalach | (max heart rate — not used) |
| exang | (exercise angina → symptom) |
| target | cardiovascular_label |

---

## DATASET 3 — Indian Diabetes: Indian Diabetes Dataset (Larger)

**Kaggle URL:** https://www.kaggle.com/datasets/vikasukani/diabetes-data-set

```bash
kaggle datasets download -d vikasukani/diabetes-data-set
unzip diabetes-data-set.zip -d backend/data/raw/indian_diabetes/
```

**Why:** Indian patient population, better representative than PIMA.

---

## DATASET 4 — Multi-disease: Cardiovascular Disease Dataset (70,000 patients)

**Kaggle URL:** https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset

```bash
kaggle datasets download -d sulianova/cardiovascular-disease-dataset
unzip cardiovascular-disease-dataset.zip -d backend/data/raw/cardio/
```

**File:** `backend/data/raw/cardio/cardio_train.csv`

**Columns:**
| Column | Maps to MediGuard field |
|--------|------------------------|
| age (days) | age (convert: age_days / 365) |
| gender | gender_encoded |
| height, weight | bmi (calculate: weight/(height/100)^2) |
| ap_hi | blood_pressure_systolic |
| ap_lo | blood_pressure_diastolic |
| cholesterol (1/2/3) | cholesterol category |
| gluc (1/2/3) | glucose category |
| smoke | smoking |
| alco | alcohol |
| active | physical_activity_encoded |
| cardio | cardiovascular_label |

---

## DATASET 5 — Lipid Panel: Lipid/Cholesterol Dataset

**Kaggle URL:** https://www.kaggle.com/datasets/thedevastator/lipid-panel-dataset

```bash
kaggle datasets download -d thedevastator/lipid-panel-dataset
unzip lipid-panel-dataset.zip -d backend/data/raw/lipid/
```

Adds HDL, LDL, triglycerides for patients — augment other datasets.

---

## STORAGE STRUCTURE

```
backend/data/
├── raw/                        ← downloaded CSV files (do not edit)
│   ├── pima/
│   │   └── diabetes.csv
│   ├── heart/
│   │   └── heart_cleveland_upload.csv
│   ├── indian_diabetes/
│   │   └── diabetes.csv
│   ├── cardio/
│   │   └── cardio_train.csv
│   └── lipid/
│       └── lipid_data.csv
│
├── processed/                  ← cleaned, merged, ready for training
│   ├── mediguard_train.csv
│   ├── mediguard_test.csv
│   └── feature_stats.json      ← mean/std for drift baseline
│
├── models/                     ← saved ML models (.pkl)
├── chroma_db/                  ← RAG vector store
├── chroma_ayurveda/            ← Ayurveda RAG vector store
├── guidelines/                 ← ICMR/InSH text files
├── uploads/                    ← user-uploaded medical reports
└── synthetic_dataset.csv       ← auto-generated fallback
```

---

## PROCESSING SCRIPT

Run this script after downloading all datasets:

```bash
cd backend
python data/process_kaggle_datasets.py
```

This script:
1. Loads all raw CSVs
2. Renames and aligns columns to MediGuard schema
3. Imputes missing values using median/mode
4. Creates multi-output labels (diabetes + cardiovascular)
5. Saves `data/processed/mediguard_train.csv` + `mediguard_test.csv`
6. Saves feature statistics for drift detection baseline
