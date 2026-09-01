# MediGuard AI — Final Project Status

Consolidated status as of the end of this development pass. Supersedes
individual phase changelogs (removed earlier — see `PROJECT_FIX_CHECKLIST.md`
for the itemized audit-fix history and this document for the current-state
summary).

## 1. Completed — actual verified features

- **Multi-output disease prediction**: diabetes, cardiovascular, and
  hypertension — 3 genuinely independent targets in one joint XGBoost
  pipeline, trained on 21,886 real patient records from 5 real sources.
- **SHAP explainability** for every prediction, all 3 targets.
- **Baseline model comparison** (Logistic Regression, Random Forest,
  XGBoost) — real run, XGBoost wins on ROC-AUC (0.9604 vs RF 0.9542 vs
  LogReg 0.9119); Random Forest's higher recall explicitly flagged as a
  clinically-relevant trade-off, not hidden.
- **MLflow experiment tracking**, real training runs logged and queried.
- **RAG-grounded AI chat and LangGraph clinical agents**, with a real,
  populated guideline corpus (3 documents covering all 3 conditions).
- **Appointment Scheduling** — the full patient→doctor→admin workflow,
  real conflict prevention, RBAC-scoped at both API and service layers,
  connected frontend (not a disconnected demo).
- **Symptom Agent** — real free-text natural-language symptom
  extraction (LLM-based with a disclosed rule-based fallback), duration/
  severity/emergency detection, and a hard safety rule against
  fabricating a risk prediction from symptoms alone.
- **LangGraph error handling** — LLM call timeouts (previously entirely
  absent), and 9 real crash sites found and fixed (malformed/`None`
  input, missing dict keys).
- Full RBAC (admin/doctor/patient), JWT auth, OTP email verification
  (console fallback in dev).
- Multimodal report ingestion (PDF/image OCR), longitudinal prediction
  history, Ayurveda herb/diet recommendations, bilingual voice interface.
- CI/CD workflow definition, rate limiting on the most expensive
  endpoints, hardened CORS/JWT/auth defaults, a fixed dead-config bug
  (`MODEL_DIR`), and a fixed Vite dev-proxy bug (frontend API calls
  would have 404'd in local dev).

## 2. External verification required

Things this sandbox genuinely cannot execute, listed with exactly what's
needed to verify them locally:

- **CI/CD**: needs a real GitHub Actions runner. Push to a GitHub repo
  with the included `.github/workflows/ci.yml` to verify.
- **Docker deployment**: needs a Docker daemon. This project's primary
  documented run method is manual (`docs/MANUAL_RUN_GUIDE.md`), so this
  is lower-priority than for a Docker-first project, but
  `docker-compose.yml` is included and should be tested before relying
  on it for deployment.
- **Live browser E2E of the Vite proxy fix**: needs an actual browser
  session against both dev servers running simultaneously. Config is
  correct and `npm run build` passes; run `npm run dev` + `uvicorn
  main:app --reload` per `docs/MANUAL_RUN_GUIDE.md` and click through
  the app to confirm.
- **Real LLM provider behavior** (Groq/Gemini/Ollama): needs a real API
  key or a running Ollama instance. This sandbox has neither — every LLM
  code path was verified via its documented fallback behavior instead
  (which is itself real, tested behavior, not a mock).
- **Kaggle account** for re-downloading the cardio dataset from its
  original source (a verified GitHub mirror was used instead — see
  `data/raw/cardio/PROVENANCE.txt`).

## 3. Remaining limitations (genuine, not oversights)

1. **Real per-patient LDL and triglycerides data** — no compatible
   dataset found despite searching. HDL and physical activity *were*
   resolved this session (NHANES); these two specifically remain
   disclosed constants.
2. **Appointment doctor availability is a fixed default schedule**
   (Mon–Sat, 9am–5pm, 30-min slots), not yet per-doctor-configurable.
3. **CI/CD and Docker** implemented but unexecuted here (see §2).
4. **`/voice/*` endpoints** still unthrottled (lower priority than
   `/predict`/`/reports/upload`/`/appointments`, which are rate-limited).
5. **A cardiovascular-specific RAG guideline** is narrower in scope than
   the diabetes/hypertension ones (built from a paper's abstract/methods,
   not full text — both `iris.who.int` and `pmc.ncbi.nlm.nih.gov`
   blocked automated full-document access).

## 4. Model information

| | |
|---|---|
| **Targets** | `diabetes_label`, `cardiovascular_label`, `hypertension_label` |
| **Algorithm** | XGBoost (`MultiOutputClassifier`), selectable via `ML_ALGORITHM` env var (Random Forest, Logistic Regression also implemented and compared) |
| **Features** | age, gender, BMI, systolic/diastolic BP, fasting glucose, HbA1c, total/HDL/LDL cholesterol, triglycerides, smoking, family history (diabetes/CVD), physical activity |
| **Dataset version** | `84c2e6e41a0b0610` (hash of the combined training frame) |
| **Training date** | 2026-08-12 |
| **Model version** | v1 (clean retrain after adding the NHANES source) |
| **Samples** | 21,886 real patient records |
| **Accuracy** | 0.9306 |
| **ROC-AUC** | 0.9604 |
| Full per-target Precision/Recall/F1 | `models/model_metadata.json` |

## 5. Dataset provenance

| Name | Source | URL | Version/Date | License | Rows | Purpose |
|---|---|---|---|---|---|---|
| Pima Indians Diabetes | Kaggle (`uciml/pima-indians-diabetes-database`) | kaggle.com/datasets/uciml/pima-indians-diabetes-database | — | CC0 | 768 | Diabetes diagnosis, glucose, BMI, BP |
| Cleveland Heart Disease | Kaggle (`cherngs/heart-disease-cleveland-uci`) | kaggle.com/datasets/cherngs/heart-disease-cleveland-uci | — | Public | ~297 | CVD diagnosis, cholesterol, BP |
| Cardiovascular disease dataset | Kaggle (`sulianova/cardiovascular-disease-dataset`), obtained via verified GitHub mirror | see `data/raw/cardio/PROVENANCE.txt` | — | Kaggle | 70,000 | BP, lipid category, smoking, activity, CVD diagnosis |
| Framingham Heart Study (teaching set) | CRAN `riskCommunicator` | cran.r-project.org/package=riskCommunicator | NIH/NHLBI-approved, request #7161 | Academic/teaching | 4,240 | Real hypertension diagnosis, smoking, diabetes diagnosis, total cholesterol |
| NHANES (teaching set) | CRAN `NHANES` (Pruim) | cran.r-project.org/package=NHANES | 2009–2012 cycles | GPL (>= 2) | 10,000 (6,575 complete rows used) | Real HDL cholesterol, real physical activity, real BP/BMI/diabetes/smoking |

## 6. Guideline provenance (RAG)

| Name | Source | Version | License |
|---|---|---|---|
| ICMR Guidelines for Management of Type 2 Diabetes | Indian Council of Medical Research | 2018 | Government publication |
| WHO Guideline for the Pharmacological Treatment of Hypertension in Adults | World Health Organization | 2021 | CC BY-NC-SA 3.0 IGO |
| WHO Cardiovascular Disease Risk Charts / HEARTS Technical Package | WHO / Lancet Global Health | 2019/2020 | CC BY 4.0 |

All three indexed as own-words summaries with full source attribution,
not verbatim reproductions — see the note at the top of each file in
`backend/data/guidelines/`.

## 7. Training commands

```bash
cd backend
python -m ml.train --force-replace          # production model
python -m ml.baseline_comparison             # LogReg/RF/XGBoost comparison
```
Full walkthrough: `docs/MODEL_TRAINING.md`. Dataset setup:
`docs/DATASET_SETUP.md`.

## 8. API keys

**Required to run the app: none.** `GROQ_API_KEY` recommended (free
tier) for `/ai/chat` and the LangGraph agents to use real LLM responses
instead of their disclosed fallbacks. Full breakdown:
`docs/API_KEYS_SETUP.md`.

## 9. How to run

`docs/MANUAL_RUN_GUIDE.md` — the complete, Windows-focused, real
step-by-step (Docker is not required or primary).

## 10. How to test

```bash
cd backend
venv\Scripts\activate   # or source venv/bin/activate on macOS/Linux
set ENVIRONMENT=test & set JWT_SECRET_KEY=test-secret & pytest -v
```
**111/111 passing**, confirmed reproducible twice in a row.

## 11. Backend tests

111/111, reproducible. Breakdown: 74 original (auth, RBAC, ML, RAG,
MLOps, real-data), 10 appointment scheduling, 19 Symptom Agent, 5 LLM/
LangGraph error handling, 3 real-data/dataset provenance additions.
`tests/test_phase7_rag.py`: 5/5.

## 12. Frontend

`npm run typecheck`: clean. `npm run build`: clean (including after the
Vite proxy fix). `npm audit`: 0 vulnerabilities.

## 13. RAG status

Populated and verified live end-to-end. 3 real documents, 25 real
indexed chunks, `GET /admin/rag-status` reports `corpus_populated: true`.
Confirmed correct source-specific retrieval for both a diabetes query and
a separate CVD query.

## 14. Security status

- JWT secret: fresh random value shipped; hard-fails startup if
  `ENVIRONMENT=production` with the insecure default.
- CORS: configurable via `CORS_ORIGINS`, no longer wildcard-with-credentials.
- `/predict/train`: admin-only.
- Rate limiting: `/predict`, `/reports/upload`, `/appointments` (booking).
- `npm audit`: 0 vulnerabilities.
- No secrets found in the repository (pattern-scanned).

## 15. Files/docs removed or added this project

**Removed** (obsolete/superseded, dangling refs fixed): `FIXES.md`,
`REAL_DATA_REFACTOR.md`, `SETUP.md`, `PHASE_1_CHANGELOG.md` through
`PHASE_6_CHANGELOG.md`.

**Added**: `docs/API_KEYS_SETUP.md`, `docs/DATASET_SETUP.md`,
`docs/MODEL_TRAINING.md`, `docs/MODEL_COMPARISON.md`,
`docs/API_DOCUMENTATION.md`, `docs/TROUBLESHOOTING.md`,
`docs/MANUAL_RUN_GUIDE.md`, `docs/FINAL_FEATURE_VERIFICATION.md`,
`docs/FINAL_PROJECT_STATUS.md` (this file).

## 16. Old model artifacts removed

7 stale model versions and one orphaned metadata backup removed earlier
in this project's development; the model directory was cleared and
retrained fresh a second time after adding the NHANES source (drift
detection correctly flagged the prior model as stale against the new
distribution — confirming that check works as intended).

## 17. Final project structure

```
mediguard-ai/
├── frontend/
│   ├── src/pages/patient/PatientAppointmentsPage.tsx
│   ├── src/pages/doctor/DoctorAppointmentsPage.tsx
│   ├── src/pages/admin/AdminAppointmentsPage.tsx
│   ├── src/services/appointmentService.js
│   └── vite.config.ts                 (dev proxy fixed)
├── backend/
│   ├── ml/                            data_loader.py, model.py, train.py, baseline_comparison.py
│   ├── rag/                           retriever.py, ingest.py, guideline_registry.py
│   ├── agents/                        graph.py (5-node LangGraph), llm_factory.py
│   ├── features/vernacular_nlp.py     symptom extraction (English + Hindi)
│   ├── models/appointment.py          + services/appointment_service.py + api/routes/appointment_routes.py
│   ├── utils/llm_timeout.py           portable LLM call timeout
│   ├── data/
│   │   ├── raw/                       pima, heart, cardio/, framingham/, nhanes/ (real data + PROVENANCE.txt)
│   │   └── guidelines/                3 real, sourced guideline documents + registry
│   └── tests/                         111 tests
├── models/                            best_model.pkl (v1) + versions/ + model_metadata.json
├── docs/                              (see §15)
├── .github/workflows/ci.yml
├── RAG_SETUP.md, PROJECT_SUMMARY.md, PROJECT_FIX_CHECKLIST.md, README.md
└── .env.example
```

This project is **not** 100% complete against every conceivable
requirement — §2 and §3 above are genuine, disclosed gaps, not
oversights.
