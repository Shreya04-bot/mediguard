# MediGuard AI — Manual Run Guide (Windows)

Docker is **not** required and is not the primary way to run this project.
This is the exact, real workflow for running MediGuard AI manually on
Windows — every command below was checked against what this codebase
actually needs (see `docs/TROUBLESHOOTING.md` for issues genuinely hit
while building this).

## 1. Prerequisites

- **Python 3.11+** (developed/tested against 3.12) — https://www.python.org/downloads/windows/
  During install, check **"Add python.exe to PATH"**.
- **Node.js 20+** — https://nodejs.org/ (LTS installer includes npm).
- Optional: **Git for Windows** if you're cloning rather than extracting a zip.

Verify in PowerShell or Command Prompt:
```powershell
python --version
node --version
npm --version
```

## 2. Get the project

Extract the zip (or `git clone`), then open a terminal **in the project's
root folder** (the one containing `backend/`, `frontend/`, `models/`).

## 3. Backend setup

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
```

(PowerShell may block script execution the first time — if you see an
execution-policy error, run
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first, then
retry `venv\Scripts\activate`.)

```powershell
pip install -r requirements.txt
```

Configure environment:
```powershell
copy .env.example .env
```
Open `.env` in a text editor and fill in `GROQ_API_KEY` (recommended,
free — see `docs/API_KEYS_SETUP.md`). Everything else has a working
default; nothing else is required to start the app.

## 4. Start the backend

```powershell
uvicorn main:app --reload --port 8000
```

- API: http://localhost:8000
- Interactive docs (Swagger UI): http://localhost:8000/docs
- A trained model already ships at `models/best_model.pkl` — no training
  needed to get real predictions on first run.

Leave this terminal running. Open a **new** terminal for the frontend.

## 5. Frontend setup and start

```powershell
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- It's pre-configured to talk to the backend at `http://localhost:8000`
  via a Vite dev-server proxy (`frontend/vite.config.ts` → `server.proxy`,
  forwards `/api/*` to `http://localhost:8000`) — this proxy was actually
  missing until this pass (a real bug: the frontend's own `.env.example`
  comment said it "assumes the backend is reverse-proxied," but nothing
  ever configured that proxy, so every API call would have 404'd in local
  dev). Fixed and build-verified; if you still see connection errors,
  confirm both dev servers are actually running and check the browser's
  Network tab for the exact failing URL.

## 6. First login

No seed users ship in this repo (a fresh database has none). Register a
new account from the frontend's sign-up page — pick role "patient" or
"doctor" (doctor accounts need admin approval via
`POST /api/v1/admin/verification/{doctor_id}` before they show up as
bookable in Appointments; register an admin account first, or promote
one directly in the DB, to approve doctors).

Registration requires email verification (OTP). Without a configured
SMTP provider (see `docs/API_KEYS_SETUP.md`), the OTP code is printed to
the **backend terminal**, not emailed — check there.

## 7. Optional: view MLflow run history

MLflow itself doesn't need to be running for the app to work — it's just
a SQLite file (`backend/mlflow.db`). To browse past training runs in a
UI:
```powershell
cd backend
venv\Scripts\activate
mlflow ui --backend-store-uri sqlite:///mlflow.db --port 5000
```
Then open http://localhost:5000.

## 8. Retrain the model (optional)

```powershell
cd backend
venv\Scripts\activate
python -m ml.train --force-replace
```
See `docs/MODEL_TRAINING.md` for the full explanation and
`docs/DATASET_SETUP.md` for the 5 real datasets already included.

## 9. Run the test suite (optional)

```powershell
cd backend
venv\Scripts\activate
set ENVIRONMENT=test
set JWT_SECRET_KEY=test-secret-for-local-runs
pytest -v
```
(In PowerShell, use `$env:ENVIRONMENT="test"` and
`$env:JWT_SECRET_KEY="test-secret-for-local-runs"` instead of `set`.)

Expected: all tests pass. Run it twice in a row to confirm no
test-isolation issues (a real bug this project hit and fixed earlier —
see `PROJECT_FIX_CHECKLIST.md`).

## 10. What to try once it's running

1. Log in (or register).
2. **Predict**: Patient → Predict Disease → fill in the form → see
   diabetes/cardiovascular/hypertension risk with SHAP explanations.
3. **Symptom Chat**: Patient → Symptom Chat → describe symptoms in plain
   language (e.g. "I've been very thirsty and tired for weeks") → see
   extracted symptoms and a non-diagnostic risk-support response.
4. **Appointments**: Patient → Appointments → Book Appointment → pick a
   doctor, date, and open slot. Log in as that doctor (or register one
   and approve it as admin) → Appointments → Confirm it.
5. **MLOps**: Admin → ML Ops → real model versions, metrics, and a
   manual drift-detection trigger.
6. **RAG**: ask the AI chat about diabetes, hypertension, or
   cardiovascular risk management — responses are grounded in the 3 real
   indexed guideline documents (see `RAG_SETUP.md`).

## Stopping everything

`Ctrl+C` in each terminal (backend and frontend). Deactivate the Python
virtual environment with `deactivate` if you want to leave it.

## Something not working?

See `docs/TROUBLESHOOTING.md` — it documents real issues actually hit
during this project's development, not a generic checklist.
