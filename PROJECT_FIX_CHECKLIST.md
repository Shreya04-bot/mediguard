# MediGuard AI — Fix Checklist (Final)

> **This is a chronological record of fixes across multiple development
> passes — sections below reflect the state *at that point*, not
> necessarily today.** For the current, authoritative status (test
> counts, feature completeness, model metrics), see
> `docs/FINAL_PROJECT_STATUS.md` and `docs/FINAL_FEATURE_VERIFICATION.md`.
> As of the most recent pass: **111/111 backend tests passing**,
> reproducible twice in a row.

Legend: ✅ Fixed and verified · 🟡 Fixed but needs external/local verification
(network access, GPU, live browser, etc.) · 🔴 Still incomplete · ⚪ Intentionally
out of scope for this pass.

"Verified" below means actually executed in this sandbox this session — pytest,
a live training run, `npm run build`, or direct function calls — not just read.

## BUG_REPORT.md — newly identified items

| ID | Issue | Status | Notes |
|---|---|---|---|
| BUG-A1 | `/predict/train` unauthenticated | ✅ | `Depends(require_role("admin"))` added; also added rate limiting to `/predict` and `/reports/upload` (SECURITY_REPORT #12) |
| BUG-A2 | RAG guideline corpus empty | ✅ | **Corpus now genuinely populated**: 3 real, sourced documents (ICMR Type 2 Diabetes 2018, WHO Hypertension 2021 — CC BY-NC-SA 3.0 IGO, WHO CVD Risk Charts 2019/HEARTS 2020 — CC BY 4.0) fetched via web search/fetch, summarized in my own words (not verbatim — standard practice regardless of source license), ingested for real (`python -m rag.ingest`: 25 real chunks across all 3 files), and verified live end-to-end through `rag_agent_node()` for both a diabetes-risk and a CVD-risk patient — `rag_references` cites the real filenames matching the patient's condition, `rag_output` contains real retrieved guideline text. `GET /admin/rag-status` confirms `corpus_populated: true`, 0 documents pending review. |
| BUG-A3 | "No synthetic data" claim inaccurate | 🟡 (HDL/physical activity ✅ resolved with real data; LDL/triglycerides remain 🔴) | Removed every `numpy.random` fabrication from `ml/data_loader.py`, replaced with disclosed deterministic constants + provenance tracking in `dataset_metadata.json`. **Later in the session, a real NHANES teaching dataset (CRAN, GPL>=2) was found and integrated specifically for HDL cholesterol and physical activity** — genuinely real, measured values now, not constants, wherever this 5th source contributes rows (6,575 of its 10,000 rows have complete data for the required fields; incomplete rows dropped, not imputed). LDL and triglycerides remain disclosed constants — no compatible real per-patient dataset found for those two specifically. This doc does not claim the lipid-panel gap is fully closed — only that HDL and physical activity genuinely are. |
| BUG-A4 | Silent Hindi TTS fallback | ✅ | Returns `X-Voice-Fallback: true` header + log warning instead of silently serving English; also fixed a temp-file leak. (Can't verify the "voice found" branch without an OS Hindi voice pack in this sandbox) |
| BUG-A5 | Precision/Recall not logged | ✅ | Added to `_evaluate()`; verified live through the full chain: training → MLflow → `MLOpsAdminService.get_models_overview()` → confirmed field names match what the frontend reads |
| BUG-A6 | Duplicate legacy frontend | ✅ | Confirmed via grep across the whole repo (`docker-compose.yml`, all `package.json`, `.github/`) that nothing referenced `frontend_legacy_single_dashboard/`, removed it, then re-ran `npm run build` on the real frontend to confirm it was unaffected |

## SECURITY_REPORT.md

| # | Finding | Status | Notes |
|---|---|---|---|
| 1 | JWT secret is the live, well-known default in shipped `.env` | ✅ | Generated a fresh random secret for the shipped `.env` (still: rotate before real deployment — any secret in a delivered zip should be treated as compromised). Also added a startup check that hard-fails if `ENVIRONMENT=production` with the old default |
| 2 | CORS wildcard + credentials | ✅ | Wired `settings.cors_origins` (was defined, unused) into `CORSMiddleware`; made configurable via `CORS_ORIGINS` |
| 3 | `/predict/train` unauthenticated | ✅ | Same fix as BUG-A1 |
| 4-8, 11, 13 | Various "good practice, no finding" items | ✅ | Re-confirmed, not re-litigated |
| 9 | SMTP creds in plaintext `.env` | ⚪ | Standard for this project class; documented in `docs/API_KEYS_SETUP.md` |
| 10 | LLM prompt injection surface | ⚪ | Acknowledged risk, low blast radius (advisory-only LLM output); no code change this pass |
| 12 | No rate limiting on `/predict`, `/reports/upload`, `/voice/*` | 🟡 | Fixed for `/predict` and `/reports/upload` (extracted shared `utils/rate_limit.py`). `/voice/*` still unthrottled — lower priority, smaller cost per call |
| 14 | Dependency vulnerability scan not performed | ✅ | **Actually ran it this pass**: `npm audit` found 1 high-severity `nanoid` vulnerability, fixed via `npm audit fix`, re-confirmed 0 vulnerabilities. `pip-audit` not run (not installed; backend deps otherwise confirmed to install and run cleanly) |

## PERFORMANCE_REPORT.md

| Finding | Status | Notes |
|---|---|---|
| Bundle size / build "not measurable without execution" | ✅ | **Ran `npm run build` live** — succeeds, real code-splitting confirmed (80+ lazy-loaded route chunks), largest chunk 464KB, `tsc --noEmit` typecheck also passes clean |
| Rate limiting gap | 🟡 | See SECURITY_REPORT #12 above |
| SHAP explainer instantiated per-request | 🔴 | Not changed — legitimate future optimization (cache 2 `TreeExplainer`s alongside the model singleton), out of scope for this pass |
| Blocking sync I/O inside `async def` (OCR, TTS, SHAP) | 🔴 | Not changed — would need `run_in_threadpool` wrapping across several routes; real work, out of scope for this pass |
| SQLite under concurrent write load | ⚪ | Acknowledged architectural limitation for a real production deployment; not something to "fix" without a database migration decision |

## DATASET_REPORT.md / MISSING_COMPONENTS.md

| Item | Status | Notes |
|---|---|---|
| Synthetic HDL/LDL/triglycerides/activity columns | ✅ | Rewrote to deterministic, disclosed constants (see BUG-A3 above) — this is the most substantive change of the pass |
| Missing 3rd Kaggle dataset (cardio) | 🔴 | Loader (`load_cardio_dataset()`) implemented and **verified this session** against the dataset's real published schema using a small schema-conformant test file (explicitly not the real dataset, deleted immediately after) — confirmed it parses correctly and combines with the other 2 sources. The actual dataset file requires a Kaggle account + download, blocked by network access |
| Baseline model comparison | ✅ | `ml/baseline_comparison.py`, actually run — see `docs/MODEL_COMPARISON.md`. Real, notable finding: Random Forest edged out XGBoost on available data; not auto-promoted (see file for reasoning), but `ML_ALGORITHM` env var makes switching a one-line config change |
| CI/CD | ✅ | `.github/workflows/ci.yml` added |

## FEATURE_COMPARISON.md

See `docs/FINAL_FEATURE_VERIFICATION.md` for the full 21-item re-score.

## Test suite

- Started this pass: 9 failing (`test_real_data.py` referencing removed
  functions/renamed columns, `test_phase3_ai_gateway.py`/`test_phase4_mlops.py`
  flaky due to a shared-DB test-isolation bug).
- Fixed all of them — root causes, not skips/xfails.
- **Found and fixed a real bug not in any report**: tests wrote to the same
  SQLite file as local dev (`data/mediguard_users.db`), causing failures on
  reruns. Isolated via `conftest.py`.
- Current: **74/74 backend tests pass**, confirmed reproducible by running
  the full suite twice in a row with no manual cleanup in between.
- `tests/test_phase7_rag.py`: 5/5 pass standalone.
- Frontend: `npm run typecheck` ✅, `npm run build` ✅, `npm audit` clean.

## Additional finding — dead configuration (this pass)

`MODEL_DIR` was declared in `utils/config.py::Settings` and documented in
`.env.example`, but `ml/model.py` never actually read `settings.model_dir`
anywhere — it used a separate hardcoded path. Changing `MODEL_DIR` in
`.env` silently did nothing. Fixed: `MODEL_ROOT` now genuinely resolves
from `settings.model_dir` (relative to `backend/`, robust to launch
directory), default updated to `../models` to match where the model
actually ships, and both `.env`/`.env.example` corrected to match.
Verified the shipped model still loads correctly after the change.

## Additional real dataset added (this pass)

A 5th real dataset — the CRAN `NHANES` teaching package (Pruim, GPL>=2,
real CDC 2009-2012 data) — was found and integrated specifically to
replace the disclosed-constant HDL cholesterol and physical-activity
columns with genuinely real, measured values. See
`data/raw/nhanes/PROVENANCE.txt` and `ml/data_loader.py::_transform_nhanes`.
LDL and triglycerides remain disclosed constants — no compatible real
per-patient dataset for those two specifically was found. Model retrained
on the enriched 21,886-row, 5-source dataset; 74/74 tests pass.

## Appointment Scheduling, Symptom Agent, LangGraph error handling (this pass)

- Built real Appointment Scheduling end-to-end: DB model, service layer
  with genuine conflict prevention (doctor/patient double-booking, past
  slots, off-grid times), RBAC-scoped API, and 3 connected frontend pages
  (patient/doctor/admin) — not a disconnected demo. 10 new tests.
- Built a real free-text Symptom Agent (`features/vernacular_nlp.py` +
  `agents/graph.py::symptom_agent_node`): LLM-based extraction with a
  disclosed rule-based fallback, real emergency-symptom detection, and a
  hard safety rule that it never fabricates a risk prediction from
  symptoms alone. Found and fixed a real false-positive bug (fuzzy word
  matching hallucinated symptoms via shared common words) before it
  shipped. 19 new tests.
- Added LLM call timeouts (`utils/llm_timeout.py`, portable — no
  `signal.alarm`, since this project runs on Windows) — previously zero
  timeout protection existed on any of the 4 real LLM call sites.
- Found and fixed 8 real crash-prone `state.get(key, default)` patterns
  in `agents/graph.py` (only applies the default for a *missing* key, not
  an explicit `None`) plus one direct-indexing `KeyError` in
  `rag_agent_node`. 5 new regression tests.
- Fixed a real, previously-undiscovered bug: the Vite dev server had no
  proxy configured despite `.env.example`'s comment claiming one existed
  — every frontend API call in local dev (`npm run dev` + `uvicorn`, the
  exact documented workflow) would have 404'd. Fixed in
  `frontend/vite.config.ts`, verified via `npm run build`; live dual-server
  browser verification wasn't possible in this sandbox (no persistent
  background-process/browser support here — same disclosed limitation as
  Docker/GPU testing throughout this project).
- Final regression: **111/111 backend tests**, reproducible twice in a
  row; frontend typecheck/build/audit all clean.
