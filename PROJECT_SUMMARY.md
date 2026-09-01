# MediGuard AI — Final Project Summary

> **Note (most recent pass):** This document was last fully updated
> before Appointment Scheduling, the real free-text Symptom Agent, and
> hypertension as a 3rd prediction target existed. For the current,
> complete picture, see `docs/FINAL_PROJECT_STATUS.md` (current status),
> `docs/FINAL_FEATURE_VERIFICATION.md` (per-feature verification), and
> `docs/API_DOCUMENTATION.md` (all 81 endpoints, generated live). The
> sections below remain accurate for what they cover — folder structure,
> the original 2-target prediction/RAG/Ayurveda architecture, dataset
> disclosure — just not exhaustive of everything now in the project.

This is the consolidated deliverable requested at the start of this
project: folder structure, database schema, API documentation, new
features, fixed bugs, new endpoints, dataset sources, and setup/training
instructions. Earlier drafts of this project kept per-phase changelogs
(`PHASE_1_CHANGELOG.md` through `PHASE_6_CHANGELOG.md`); those have since
been superseded and removed — `PROJECT_FIX_CHECKLIST.md` and
`docs/FINAL_FEATURE_VERIFICATION.md` are now the authoritative,
up-to-date status documents, and this document is the pull-together.

Everything below was generated from or verified against the actual
running application (OpenAPI schema introspection, SQLAlchemy metadata
introspection, live HTTP calls, and — for this document's later
revisions — live pytest/training runs) — not written from memory.

---

## 1. Folder structure

```
mediguard-ai/
├── backend/                      FastAPI application
│   ├── api/routes/                12 route modules, 72 endpoints
│   ├── auth/                      JWT, OTP, sessions, RBAC
│   ├── agents/                    LangGraph multi-agent pipeline + LLM factory
│   ├── ayurveda/                  Prakriti scoring, diet/yoga/herb generators
│   ├── features/                  OCR autofill, heatmap, timeline, symptom NLP
│   ├── ml/                        XGBoost model, SHAP, drift detection
│   ├── mlops/                     MLflow tracking
│   ├── models/                    SQLAlchemy ORM models + Pydantic schemas
│   ├── rag/                       Chroma-backed guideline retriever
│   ├── services/                  Business logic layer (one per domain)
│   ├── data/                      processed/raw Kaggle data, SQLite DB, uploads
│   ├── mlruns/, mlflow.db          Real MLflow experiment tracking store
│   └── tests/                     41 tests across 4 phase-based test files
├── frontend/                      Role-based React/Vite dashboard (Admin/Doctor/Patient)
├── models/                        best_model.pkl + versioned models + registry
├── deployment/                    DEPLOYMENT.md (production guide)
├── docs/                          API_KEYS_SETUP.md, MODEL_TRAINING.md, MODEL_COMPARISON.md,
│                                   FINAL_FEATURE_VERIFICATION.md, datasets/KAGGLE_GUIDE.md
├── datasets/, notebooks/, guidelines/   As in original project structure
├── docker-compose.yml
├── RAG_SETUP.md                   Guideline corpus setup (start here for RAG)
├── PROJECT_FIX_CHECKLIST.md       Current, authoritative audit/fix status
└── README.md                      Local dev setup, quick start
```

---

## 2. Database schema

SQLite (`backend/data/mediguard_users.db`), 16 tables, all
UUID-primary-keyed. Introspected directly from the live SQLAlchemy
metadata:

| Table | Purpose | Key relationships |
|---|---|---|
| `users` | All accounts (patient/doctor/admin) | — |
| `patient_profiles` | Patient demographic/medical fields | `user_id` → `users.id` |
| `doctor_profiles` | License, hospital, specialization | `user_id` → `users.id` |
| `doctor_patient_links` | Connection requests + accepted links | `patient_id`, `doctor_id` → `users.id` |
| `prediction_histories` | Every AI prediction run | `user_id` → `users.id` |
| `medical_reports` | OCR-parsed lab reports | `user_id` → `users.id` |
| `family_members` | Family risk cluster entries | `patient_id` → `users.id` |
| `notifications` | In-app notifications | `user_id` → `users.id` |
| `audit_logs` | Admin/security audit trail | `user_id` → `users.id` |
| `invitations` | Admin-invite-admin flow | `inviter_id` → `users.id` |
| `otp_codes` | Hashed OTP codes (registration + password reset) | — |
| `verification_tokens` | Single-use tokens issued after OTP success | — |
| `auth_sessions` | Refresh-token sessions, revocation tracking | `user_id` → `users.id` |

Full column-level detail (types, nullability, foreign keys) is at the
bottom of this document, generated directly from `Base.metadata`.

---

## 3. API documentation

**72 endpoints across 12 route modules.** Full interactive docs at
`/docs` (Swagger) or `/redoc` when the backend is running — this is
the authoritative, always-current reference. Summary by module:

| Module | Count | Covers |
|---|---|---|
| Auth | 10 | Registration (OTP-gated), login, refresh, logout, password reset |
| Patient | 11 | Profile, doctors, predictions, reports, timeline, health score, family |
| Doctor | 11 | Profile, linked patients, link requests, timeline, family, clinical analysis, analytics |
| Admin | 9 | Dashboard stats, analytics, user management, doctor verification, ML models, audit logs |
| Features & Ayurveda | 16 | Timeline simulation, heatmap, symptom mapping, PDF reports, OCR autofill, Prakriti/diet/yoga/herbs, family clusters |
| AI Gateway | 3 | `/ai/predict`, `/ai/ocr`, `/ai/chat` — frontend-facing adapter layer |
| Notifications | 3 | List, mark-read, mark-all-read |
| Prediction | 2 | Internal joint risk prediction, manual retrain trigger |
| MLOps | 2 | MLflow run history, drift detection |
| Voice | 2 | Transcription, TTS (backend endpoints exist; the live frontend uses the browser's Web Speech API instead — see Phase 3) |
| Agents | 1 | Raw multi-agent analysis (auth-gated; doctors normally use the wrapped per-patient version instead) |
| Health | 1 | System health check |

---

## 4. New features built (Phases 1–6)

**Authentication & security**
- OTP-gated registration and password reset (email verification)
- Doctor license verification workflow with admin approval queue
- Refresh-token sessions with real server-side revocation (logout
  actually invalidates the token, not just client-side deletion)
- Rate limiting on the AI chat endpoint
- Role-based portal login checks (a patient account can't log into the
  doctor portal)

**Dashboards (Admin / Doctor / Patient)**
- Every dashboard page connected to real backend data — previously 100%
  static mock UI (see Phase 2's audit)
- Real admin platform analytics (patient/doctor counts, monthly
  activity trends, disease distribution — all live DB aggregates)
- Real doctor cohort risk analytics
- Real patient health score (computed vitality index from latest
  prediction)
- Chronological health timeline (merged predictions + report uploads)
  for both patient self-view and doctor patient-view
- Family risk cluster — full CRUD, DB-backed (replaced a broken
  in-memory prototype — see bug list)
- Doctor ↔ patient connection request workflow (send/accept/reject)
- Real-time notification system (create, list, mark-read, mark-all-read)

**AI features**
- Real trained ML model (XGBoost, joint diabetes + cardiovascular risk,
  AUC 0.9185) with SHAP explainability
- OCR lab report parsing (WHO/ADA/ACC reference-range-aware), for both
  images and PDFs
- Conversational AI assistant with role-aware prompts (patient/doctor/
  admin) and RAG grounding when available
- Voice assistant (client-side Web Speech API + the chat backend)
- LangGraph multi-agent clinical analysis (Symptom → Report → RAG →
  Coordinator), wrapped for doctors to run against a linked patient's
  real saved prediction data — no re-entry of clinical data
- Evidence-based Ayurvedic herb/diet/yoga recommendations, integrated
  into prediction results

**MLOps**
- Admin ML Ops Monitor: real model registry, deployed vs. staging
  versions, accuracy/precision/recall, prediction volume
- Manual drift detection (PSI-based) with per-feature breakdown, wired
  into the admin UI
- LangSmith tracing with meaningful tags/metadata (role, endpoint,
  user/patient IDs), not just an on/off toggle

**Deployment**
- Dockerfile + nginx config for the new frontend (didn't exist before)
- Consolidated single-repo project structure
- Production deployment guide covering secrets, TLS, CORS, and scaling

---

## 5. Bugs found and fixed

This project surfaced an unusual number of real, pre-existing bugs —
not just missing integration work. Full detail in each phase's
changelog; summary:

| # | Bug | Found in | Fixed in |
|---|---|---|---|
| 1 | `auth.db` never actually exported `User` despite 7+ files importing it — backend couldn't start at all | Phase 1 | Phase 1, hardened in Phase 4 |
| 2 | Hardcoded fake medical history sent on every prediction request regardless of user input | Phase 3 | Phase 3 |
| 3 | Prediction form couldn't supply the clinical data the model actually requires | Phase 3 | Phase 3 |
| 4 | `FactorBreakdown.jsx` couldn't render its own documented API contract | Phase 3 | Phase 3 |
| 5 | Fabricated "Gemini 3.6 Flash"/"Gemini OCR"/"FHIR EHR sync" branding across 5 UI locations, describing capabilities that don't exist | Phase 3 | Phase 3 |
| 6 | `/agents/analyse` accepted arbitrary data from anyone, unauthenticated, running expensive LLM calls | Phase 3 | Phase 3 |
| 7 | No trained model artifact existed anywhere in the project — registry referenced files on someone else's machine | Phase 4 | Phase 4 |
| 8 | MLflow 3.x rejected XGBoost's Booster type during model logging, silently failing every training run's experiment tracking | Phase 4 | Phase 4 |
| 9 | SHAP value scaling produced nonsensical numbers ("+203%") because raw values aren't in 0–1 range | Phase 4 | Phase 4 |
| 10 | Circular-import fix from bug #1 only worked by luck of import order; deadlocked under a different order | Phase 4 | Phase 4 |
| 11 | `/mlops/runs` and `/mlops/drift` completely unauthenticated | Phase 4 | Phase 4 |
| 12 | Live API keys (Groq, Gemini, LangSmith) committed in plaintext, `.gitignore` didn't exclude `.env` | Phase 5 | Phase 5 |
| 13 | Frontend Docker build would fail — `package-lock.json` deleted during testing, never restored, `npm ci` requires it | Phase 5 | Phase 5 |
| 14 | `family_cluster.py` stored all data in an in-memory dict — no persistence, no auth, no ownership | Phase 2 | Phase 2 |
| 15 | `/auth/register/send-otp` and `/auth/password-reset/send-otp` silently dropped `expiresInSeconds` due to an overly-narrow `response_model` — invisible to 41 passing tests, caught only via live HTTP testing | Phase 6 | Phase 6 |

Bugs #1 and #10 are the same root issue at two different depths — #1
was the surface-level fix, #10 is what happened when that fix was
tested from a different angle three phases later and found to be
order-dependent rather than actually robust.

---

## 6. Dataset sources (Kaggle-only policy)

Per `data/processed/dataset_metadata.json` and
`docs/datasets/KAGGLE_GUIDE.md` — every row comes from real Kaggle sources
(no fabricated rows, and labels/outcomes are always real). **This is not
the same as saying every feature is real, and no version of this doc
should claim it is.**

None of the 3 source Kaggle datasets collect a lipid panel (HDL, LDL,
triglycerides) or a physical-activity measure, and 2 of the 3 don't
collect BMI, smoking status, or family history either. `ml/data_loader.py`
fills those columns with fixed, cited population-reference **constants**
(no row-to-row variation) rather than `numpy.random` noise — see
`SYNTHETIC_COLUMN_DEFAULTS`/`SYNTHETIC_COLUMNS_BY_SOURCE` in that file for
the exact list per source. **Removing the random-noise generator is a
disclosure/honesty improvement, not a fix that satisfies a real-world-data
requirement.** A constant is still not a real per-patient observation —
it just no longer pretends to be one by carrying fake inter-patient
variance. Anywhere the synopsis or a stakeholder requires these specific
lab values to be real, the only actual fix is sourcing a compatible
dataset that measures them (e.g., NHANES for lipid panels) and wiring it
into `ml/data_loader.py` in place of the constants — not something this
project can claim to have done. This was not possible in the environment
that produced this cleanup pass (no network access beyond package
registries; no dataset-search tooling available), and remains an open
item — see `PROJECT_FIX_CHECKLIST.md`.

Real, unmodified inputs throughout (all 3 sources): age, blood pressure,
fasting glucose (real for Pima/cardio; a deterministic 2-value estimate
from a real fbs flag for Heart), and the diabetes/CVD outcome labels
themselves.

| Dataset | Source | Used for |
|---|---|---|
| PIMA Indians Diabetes Database | [kaggle.com/datasets/uciml/pima-indians-diabetes-database](https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database) | Diabetes features/labels |
| Heart Disease Cleveland (UCI) | [kaggle.com/datasets/cherngs/heart-disease-cleveland-uci](https://www.kaggle.com/datasets/cherngs/heart-disease-cleveland-uci) | Cardiovascular features/labels |
| Cardiovascular Disease Dataset | [kaggle.com/datasets/sulianova/cardiovascular-disease-dataset](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset) | Cardiovascular features/labels |

Combined, cleaned, and merged into 1,071 rows (856 train / 215 test),
dataset version hash `03701715c24da6a9`, stored at
`backend/data/processed/`. See `docs/datasets/KAGGLE_GUIDE.md` for the
exact column-mapping and download steps if you need to reproduce or
extend this from scratch.

---

## 7. Training & setup instructions

**A trained model ships in this repo — you do not need to train
anything to run the app.** See `README.md`'s Quick Start for the full
walkthrough (prerequisites, backend/frontend startup, first-login flow,
LLM key setup, Docker) and `docs/MODEL_TRAINING.md` if you do want to
retrain. Quick version:

```bash
# Backend
cd backend
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in GROQ_API_KEY etc. — see docs/API_KEYS_SETUP.md
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

To retrain (optional — e.g. after adding more data):
```bash
cd backend
python3 -c "from ml.model import get_model; print(get_model().train())"
```

Full production deployment steps (Docker, secrets, TLS, scaling) are in
`deployment/DEPLOYMENT.md`.

---

## 8. Full database schema (generated from live SQLAlchemy metadata)

```
audit_logs
  id: VARCHAR(36) [PK] NOT NULL
  user_id: VARCHAR(36) -> users.id
  action: VARCHAR(100) NOT NULL
  resource: VARCHAR(100) NOT NULL
  details: TEXT
  ip_address: VARCHAR(45)
  timestamp: DATETIME NOT NULL

auth_sessions
  id: VARCHAR(36) [PK] NOT NULL
  user_id: VARCHAR(36) NOT NULL -> users.id
  access_jti: VARCHAR(36) NOT NULL
  refresh_token_hash: VARCHAR(64) NOT NULL
  user_agent: VARCHAR(255)
  ip_address: VARCHAR(64)
  created_at: DATETIME NOT NULL
  expires_at: DATETIME NOT NULL
  revoked_at: DATETIME

doctor_patient_links
  id: VARCHAR(36) [PK] NOT NULL
  patient_id: VARCHAR(36) NOT NULL -> users.id
  doctor_id: VARCHAR(36) NOT NULL -> users.id
  status: VARCHAR(20) NOT NULL
  notes: TEXT
  created_at: DATETIME NOT NULL
  updated_at: DATETIME NOT NULL

doctor_profiles
  id: VARCHAR(36) [PK] NOT NULL
  user_id: VARCHAR(36) NOT NULL -> users.id
  medical_license: VARCHAR(100) NOT NULL
  hospital_name: VARCHAR(200) NOT NULL
  specialization: VARCHAR(100) NOT NULL
  license_upload: VARCHAR(500)
  experience_years: INTEGER
  bio: TEXT
  created_at: DATETIME NOT NULL
  updated_at: DATETIME NOT NULL

family_members
  id: VARCHAR(36) [PK] NOT NULL
  patient_id: VARCHAR(36) NOT NULL -> users.id
  name: VARCHAR(120) NOT NULL
  relation: VARCHAR(50) NOT NULL
  age: INTEGER
  patient_data: TEXT
  prediction: TEXT
  diabetes_risk_level: VARCHAR(20)
  cvd_risk_level: VARCHAR(20)
  combined_score: FLOAT
  smoking: BOOLEAN
  conditions: TEXT
  created_at: DATETIME NOT NULL

invitations
  id: VARCHAR(36) [PK] NOT NULL
  inviter_id: VARCHAR(36) NOT NULL -> users.id
  email: VARCHAR(255) NOT NULL
  role: VARCHAR(20) NOT NULL
  token: VARCHAR(100) NOT NULL
  status: VARCHAR(20) NOT NULL
  created_at: DATETIME NOT NULL
  expires_at: DATETIME NOT NULL

medical_reports
  id: VARCHAR(36) [PK] NOT NULL
  user_id: VARCHAR(36) NOT NULL -> users.id
  report_name: VARCHAR(255) NOT NULL
  file_type: VARCHAR(20) NOT NULL
  file_path: VARCHAR(500)
  extracted_data: TEXT
  summary: TEXT
  flags: TEXT
  uploaded_at: DATETIME NOT NULL

notifications
  id: VARCHAR(36) [PK] NOT NULL
  user_id: VARCHAR(36) NOT NULL -> users.id
  title: VARCHAR(200) NOT NULL
  message: TEXT NOT NULL
  type: VARCHAR(50) NOT NULL
  is_read: BOOLEAN NOT NULL
  created_at: DATETIME NOT NULL

otp_codes
  id: VARCHAR(36) [PK] NOT NULL
  email: VARCHAR(255) NOT NULL
  purpose: VARCHAR(30) NOT NULL
  code_hash: VARCHAR(64) NOT NULL
  attempts: INTEGER NOT NULL
  max_attempts: INTEGER NOT NULL
  consumed: BOOLEAN NOT NULL
  expires_at: DATETIME NOT NULL
  created_at: DATETIME NOT NULL

patient_profiles
  id: VARCHAR(36) [PK] NOT NULL
  user_id: VARCHAR(36) NOT NULL -> users.id
  dob: VARCHAR(10)
  gender: VARCHAR(20)
  blood_group: VARCHAR(10)
  phone: VARCHAR(20)
  address: TEXT
  emergency_contact: VARCHAR(100)
  medical_history: TEXT
  created_at: DATETIME NOT NULL
  updated_at: DATETIME NOT NULL

prediction_histories
  id: VARCHAR(36) [PK] NOT NULL
  user_id: VARCHAR(36) NOT NULL -> users.id
  prediction_id: VARCHAR(100) NOT NULL
  input_data: TEXT NOT NULL
  diabetes_probability: FLOAT NOT NULL
  diabetes_risk_level: VARCHAR(20) NOT NULL
  cvd_probability: FLOAT NOT NULL
  cvd_risk_level: VARCHAR(20) NOT NULL
  combined_score: FLOAT NOT NULL
  model_version: VARCHAR(50) NOT NULL
  created_at: DATETIME NOT NULL

users
  id: VARCHAR(36) [PK] NOT NULL
  name: VARCHAR(120) NOT NULL
  email: VARCHAR(255) NOT NULL
  hashed_password: VARCHAR(255) NOT NULL
  role: VARCHAR(20) NOT NULL
  verification_status: VARCHAR(20) NOT NULL
  preferred_language: VARCHAR(10) NOT NULL
  avatar_url: VARCHAR(500)
  is_active: BOOLEAN NOT NULL
  created_at: DATETIME NOT NULL
  updated_at: DATETIME NOT NULL

verification_tokens
  id: VARCHAR(36) [PK] NOT NULL
  email: VARCHAR(255) NOT NULL
  purpose: VARCHAR(30) NOT NULL
  token_hash: VARCHAR(64) NOT NULL
  consumed: BOOLEAN NOT NULL
  expires_at: DATETIME NOT NULL
  created_at: DATETIME NOT NULL
```

---

## 9. Test coverage

**41/41 tests passing** across 4 phase-based test files
(`test_auth_roles.py`, `test_phase2_dashboards.py`,
`test_phase3_ai_gateway.py`, `test_phase4_mlops.py`), plus Phase 6's
live end-to-end HTTP verification (registration → OTP → login → real
prediction → real Ayurveda recommendations, all through the actual
running server, not a test client). Real production frontend build
(`npm run build`) verified clean with zero TypeScript errors.

## 10. Known open items

- **Appointments feature** — flagged in Phase 2, still undecided. No
  appointments/scheduling concept exists anywhere in the data model;
  the UI elements that referenced it were removed rather than backed
  with fake data. Building it for real is new scope, not a wiring fix.
- No CI/CD pipeline (flagged in `deployment/DEPLOYMENT.md`).
- `main.py`'s CORS is still a development-friendly wildcard — flagged
  as a pre-production TODO in `deployment/DEPLOYMENT.md`.
- RAG embeddings (`sentence-transformers`/`torch`) weren't installed in
  the sandbox used to build this — the graceful-degradation path is
  what's been tested; a real deployment with those installed should get
  a final verification pass of full RAG retrieval.
