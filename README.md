# MediGuard AI — Ayurveda Edition

> **Intelligent multi-disease risk prediction + Ayurvedic intelligence platform for Diabetes and Cardiovascular conditions.**

B.Tech Major Project — Dept. of CSE, United College of Engineering & Research, Prayagraj
AKTU, Lucknow — May 2026

**Team:** Sneha Upadhyay · Shreya Chauhan · Srishti · Srijan Tripathi
**Supervisor:** Mr. Ajai Kumar Maurya, Assistant Professor

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI (Python 3.11) |
| ML Models | Multi-output XGBoost + SHAP |
| AI Agents | LangGraph (5-agent pipeline) |
| LLM | Groq API (Llama 3.1) / Gemini / Ollama |
| RAG | Chroma DB — ICMR + AYUSH guidelines |
| MLOps | MLflow + LangSmith + GitHub Actions |
| Voice | SpeechRecognition + pyttsx3 (Hindi/English) |
| PDF | ReportLab (bilingual health reports) |
| OCR | Tesseract + LLM parsing |
| Deployment | Docker + docker-compose |

---

## Feature Overview (18 total)

### Core Platform (7)
1. Multi-output XGBoost prediction (Diabetes + CVD + Hypertension, jointly)
2. SHAP explainability dashboard
3. LangGraph 5-agent pipeline (Symptom → Report → RAG → Ayurveda → Coordinator) — Symptom Agent does real free-text NLP extraction (LLM-based, disclosed rule-based fallback), duration/severity/emergency detection, never fabricates a diagnosis
4. Medical report upload (PDF/image OCR)
5. Bilingual voice interface (Hindi/English)
6. MLflow MLOps monitoring + PSI drift detection
7. **Appointment Scheduling** — patient booking with real doctor availability, doctor confirm/reject/complete workflow, admin oversight, full conflict prevention (no double-booking, no past-slot booking)

### 7 Unique Features
| # | Feature | Description |
|---|---------|-------------|
| F1 | **Comorbidity Timeline Simulator** | 5/10/20-year what-if projections under 6 intervention scenarios |
| F2 | **District Risk Heatmap** | UP choropleth bubble map — 75+ districts, PMJAY priority zones |
| F3 | **Vernacular Symptom Chat** | Hindi/Hinglish + English NLP → clinical labels, duration/severity/emergency detection (rule-based + LLM fallback) |
| F4 | **PDF Health Report** | Auto-generated bilingual (Hindi+English) branded PDF |
| F5 | **Lab Report OCR Auto-Fill** | Photo of lab slip → auto-populate all form fields |
| F6 | **Family Risk Cluster** | Multi-member dashboard with inherited pattern detection |
| F7 | *(PDF download built into Prediction page)* | Downloadable report after each assessment |

### 5 Ayurvedic AI Features (Unique to this project)
| # | Feature | Description |
|---|---------|-------------|
| A1 | **Ayurvedic Diet Plan** | Day-wise Prakriti-based meal plan (Hindi + English) |
| A2 | **Prakriti Analyser** | 20-question Vata/Pitta/Kapha quiz + ML risk adjustment |
| A3 | **Herbal Remedy Recommender** | CCRAS evidence-based herbs with drug interaction checks |
| A4 | **Yoga & Pranayama Plan** | 7-day personalised schedule with contraindications |
| A5 | **Ayurvedic AI Agent** | 5th LangGraph node — Charaka Samhita + AYUSH RAG |

---

## Quick Start

### Docker (Recommended)
```bash
git clone https://github.com/your-org/mediguard-ai.git
cd mediguard-ai
cp backend/.env.example backend/.env
# Add GROQ_API_KEY to backend/.env
docker-compose up --build
```
- Frontend: http://localhost
- API docs: http://localhost:8000/docs

### Local Development
```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add GROQ_API_KEY
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install && npm run dev
# Open http://localhost:5173
```

### Model Training

A trained model ships in `models/best_model.pkl` (joint multi-output
XGBoost: diabetes, cardiovascular, **and hypertension** risk — see
`docs/MODEL_TRAINING.md`), so no training is needed to run the app. To
retrain from real data:

```bash
cd backend
python -m ml.train --force-replace
```

Or hit the admin-only API once the server is running (requires an admin
JWT — see `docs/API_KEYS_SETUP.md` / auth docs):
```bash
curl -X POST http://localhost:8000/api/v1/predict/train \
  -H "Authorization: Bearer <admin_access_token>"
```

For a Logistic Regression / Random Forest / XGBoost comparison, run
`python -m ml.baseline_comparison` — see `docs/MODEL_COMPARISON.md`.

---

## Real Datasets

Five real, sourced datasets ship in `backend/data/raw/` — no synthetic
patient data. See `docs/MODEL_TRAINING.md` for the full table and
`docs/datasets/KAGGLE_GUIDE.md` for Kaggle-specific setup:

```bash
pip install kaggle
# Place ~/.kaggle/kaggle.json (from kaggle.com/settings)

cd backend
kaggle datasets download -d uciml/pima-indians-diabetes-database -p data/raw/pima/ --unzip
kaggle datasets download -d cherngs/heart-disease-cleveland-uci -p data/raw/heart/ --unzip
kaggle datasets download -d sulianova/cardiovascular-disease-dataset -p data/raw/cardio/ --unzip
# Framingham (hypertension source) isn't on Kaggle — see
# data/raw/framingham/PROVENANCE.txt for its actual source (CRAN
# riskCommunicator, NIH/NHLBI-approved teaching dataset)
# NHANES (real HDL/physical-activity source) isn't on Kaggle either — see
# data/raw/nhanes/PROVENANCE.txt (CRAN NHANES package, GPL>=2)

python -m ml.train --force-replace
# Produces: data/processed/mediguard_train.csv + mediguard_test.csv + models/best_model.pkl
```

---

## API Endpoints (Highlights — see `docs/API_DOCUMENTATION.md` for all 81, generated live from the OpenAPI schema)

### Core
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health/` | System health check |
| POST | `/api/v1/predict/` | Joint risk prediction |
| POST | `/api/v1/predict/train` | Train/retrain model (admin-only) |
| POST | `/api/v1/agents/analyse` | Multi-agent analysis (structured intake, free-text symptoms, or both) |
| POST | `/api/v1/reports/upload` | Upload medical report |
| POST | `/api/v1/voice/transcribe` | Speech-to-text |
| POST | `/api/v1/voice/tts` | Text-to-speech |
| GET | `/api/v1/mlops/runs` | MLflow run history |
| POST | `/api/v1/mlops/drift` | Drift detection |
| GET | `/api/v1/appointments/doctors` | List doctors available for booking |
| GET | `/api/v1/appointments/doctors/{id}/slots` | Real available time slots for a date |
| POST | `/api/v1/appointments/` | Book an appointment |
| PATCH | `/api/v1/appointments/{id}` | Confirm/reject/complete/cancel (RBAC-scoped) |

### Features & Ayurveda (`/api/v1/features/`)
| Method | Endpoint | Feature |
|--------|----------|---------|
| POST | `/timeline` | F1: Timeline simulator |
| GET | `/heatmap` | F2: District heatmap |
| POST | `/heatmap/record` | F2: Record district prediction |
| POST | `/symptoms/map` | F3: Hindi symptom NLP |
| POST | `/report/pdf` | F4: Generate PDF report |
| POST | `/ocr/autofill` | F5: Lab report OCR |
| POST | `/family/create` | F6: Create family group |
| POST | `/family/member` | F6: Add family member |
| GET | `/family/{id}` | F6: Family dashboard |
| POST | `/ayurveda/diet` | A1: Diet plan |
| GET | `/ayurveda/prakriti/questions` | A2: Quiz questions |
| POST | `/ayurveda/prakriti/score` | A2: Score quiz |
| POST | `/ayurveda/herbs` | A3: Herb recommendations |
| POST | `/ayurveda/yoga` | A4: Yoga plan |
| POST | `/ayurveda/agent` | A5: Ayurvedic AI agent |

---

## Project Structure

```
mediguard-ai/
├── backend/
│   ├── main.py                      # FastAPI entry point (all 17 features)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── agents/
│   │   ├── graph.py                 # LangGraph 4-agent pipeline
│   │   └── llm_factory.py           # Groq / Gemini / Ollama
│   ├── ayurveda/                    # 5 Ayurvedic modules
│   │   ├── ayurveda_agent.py        # A5: LangGraph Ayurveda node
│   │   ├── diet_generator.py        # A1: Meal plan generator
│   │   ├── herb_recommender.py      # A3: Herb recommender
│   │   ├── prakriti_scorer.py       # A2: Dosha quiz scorer
│   │   └── yoga_prescriber.py       # A4: Yoga plan generator
│   ├── features/                    # 6 Unique feature engines
│   │   ├── timeline_simulator.py    # F1: 20-year projection
│   │   ├── district_heatmap.py      # F2: UP district risk map
│   │   ├── vernacular_nlp.py        # F3: Hindi symptom NLP
│   │   ├── pdf_report.py            # F4: Bilingual PDF generator
│   │   ├── ocr_autofill.py          # F5: Lab report OCR
│   │   └── family_cluster.py        # F6: Family risk manager
│   ├── ml/
│   │   ├── model.py                 # XGBoost + SHAP
│   ├── rag/
│   │   └── retriever.py             # Chroma + ICMR/InSH RAG
│   ├── mlops/
│   │   └── mlflow_tracker.py        # Tracking + PSI drift
│   ├── api/routes/
│   │   ├── prediction.py
│   │   ├── agents.py
│   │   ├── reports.py
│   │   ├── voice.py
│   │   ├── mlops.py
│   │   ├── health.py
│   │   └── ayurveda.py              # All F1-F6 + A1-A5 endpoints
│   ├── models/schemas.py
│   ├── utils/config.py
│   ├── data/
│   │   ├── prakriti_questions.json  # A2: 20 Prakriti questions
│   │   ├── herbs_database.json      # A3: 8 herbs with evidence
│   │   ├── process_kaggle_datasets.py
│   │   ├── raw/                     # Downloaded Kaggle CSVs
│   │   └── processed/               # Cleaned training data
│   └── tests/test_backend.py
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── DashboardPage.jsx
        │   ├── PredictionPage.jsx
        │   ├── ReportsPage.jsx
        │   ├── AgentsPage.jsx
        │   ├── MLOpsPage.jsx
        │   ├── VoicePage.jsx
        │   └── features/            # All 12 new feature pages
        │       ├── TimelinePage.jsx
        │       ├── HeatmapPage.jsx
        │       ├── SymptomChatPage.jsx
        │       ├── OCRPage.jsx
        │       ├── FamilyPage.jsx
        │       ├── PrakritiPage.jsx
        │       ├── HerbalPage.jsx
        │       ├── YogaPage.jsx
        │       ├── DietPage.jsx
        │       └── AyurvedaAgentPage.jsx
        ├── components/dashboard/
        │   ├── Layout.jsx           # Sidebar with all 17 nav items
        │   ├── RiskGauge.jsx
        │   └── SHAPChart.jsx
        ├── store/useStore.js
        └── utils/api.js
```

---

## References

The RAG corpus (`backend/data/guidelines/`) is currently indexed with 3
of the sources below — ICMR Guidelines for Management of Type 2 Diabetes
2018, the WHO 2021 hypertension treatment guideline, and a WHO CVD risk
summary — summarized in Claude's own words from the official documents,
not reproduced verbatim. See `RAG_SETUP.md` for exact provenance and how
to add the rest.

1. ICMR-INDIAB Study — *The Lancet Diabetes & Endocrinology*, 2023
2. ICMR Guidelines for Management of Type 2 Diabetes, 2018 *(indexed in RAG)*
3. WHO Guideline for the Pharmacological Treatment of Hypertension in Adults, 2021 *(indexed in RAG)*
4. WHO Cardiovascular Disease Risk Charts, 2019 / HEARTS Technical Package, 2020 *(indexed in RAG)*
5. Ministry of AYUSH — Standard Treatment Guidelines for T2DM, 2021
6. CCRAS — Clinical Evidence for Ayurvedic Herbs in Metabolic Disease, 2019
7. Zhang et al. — Explainable AI for Healthcare: SHAP-based interpretation, *AI in Medicine*, 2023
8. Charaka Samhita — Chikitsa Sthana, Prameha Chikitsa Chapter
9. WHO Traditional Medicine Strategy 2019-2025

---

## Disclaimer

MediGuard AI is an academic research project providing **decision support only**.
It is **not a substitute** for professional medical diagnosis, treatment, or Ayurvedic consultation.
Always consult qualified healthcare professionals (MBBS, BAMS) before making health decisions.
