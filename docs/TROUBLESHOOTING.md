# MediGuard AI — Troubleshooting

Every issue below was actually hit and fixed (or is a known, disclosed
limitation) during this project's development — not a generic checklist.

## Backend won't start

**"No module named 'X'"** — `pip install -r backend/requirements.txt`
wasn't run, or you're not in the right virtualenv. Note: this repo's
`requirements.txt` includes `pytest`/`httpx` (needed to run the test
suite — an earlier version of this file was missing them entirely,
which meant a fresh clone couldn't run its own tests).

**MLflow errors mentioning `pkg_resources`** — MLflow needs `setuptools`
installed, which isn't a given on newer Python installs (setuptools
stopped being bundled with `pip` by default in recent versions, and
`setuptools>=81` removed `pkg_resources` entirely). Fix:
`pip install "setuptools<81"`. Without this, training still completes
(MLflow tracking degrades gracefully, logged as a warning), but you
won't get MLflow run history.

**`Field 'model_dir' in 'Settings' conflicts with protected namespace`
warning** — harmless Pydantic warning, not an error. Safe to ignore.

**JWT_SECRET_KEY startup error mentioning "insecure default"** — you set
`ENVIRONMENT=production` while `JWT_SECRET_KEY` is still the shipped
placeholder. Generate a real one:
`python -c "import secrets; print(secrets.token_hex(32))"` and put it in
`.env`.

## Model / prediction issues

**"Model not found" or predictions fail on a fresh clone** — a trained
model ships at `models/best_model.pkl`, but if it's somehow missing,
`utils/startup_check.py` trains one automatically on first backend
startup using whatever real datasets are present under
`backend/data/raw/`. This takes under a minute. If it's not happening,
check `MODEL_DIR` resolves correctly (see below).

**Changed `MODEL_DIR` in `.env` and nothing happened** — this was a real
bug, fixed in this pass: `MODEL_DIR` used to be declared but never
actually read. It's wired in now (see `ml/model.py::MODEL_ROOT`) and is
resolved **relative to the `backend/` directory**, not your shell's
current directory — `MODEL_DIR=../models` means "one level up from
`backend/`", not "one level up from wherever you ran the command."

**Drift detector reports high drift right after adding/changing a
dataset** — this is correct behavior, not a bug. The drift check compares
current data against the *currently loaded model's* training-time
reference statistics. If you've changed what's in `data/raw/` since that
model was trained, retrain (`python -m ml.train --force-replace`) to
refresh the reference.

**Training run-to-run metrics vary by ~0.5% AUC** even with
`random_state=42` set everywhere — expected. XGBoost's histogram-based
tree construction isn't perfectly floating-point-associative even
single-threaded. Not a reproducibility bug.

## RAG / guideline retrieval issues

**`/ai/chat` or the RAGAgent returns generic advice instead of
guideline-grounded answers** — check `GET /admin/rag-status` (admin auth
required). If `corpus_populated: false`, `backend/data/guidelines/` is
empty except real files; run `python -m rag.ingest`. If it's `true` but
answers still seem generic, check the logged embedding backend — see next.

**Logs say "Falling back to TF-IDF embeddings"** — the
`sentence-transformers` semantic embedding model couldn't download
(no network, or `huggingface.co` unreachable). Retrieval still works
(lexical/keyword matching via TF-IDF instead of semantic similarity),
just with somewhat lower relevance ranking. Not an error — this is a
deliberate, documented fallback so RAG never just stops working.
Confirmed working in this state during this project's own development
(this sandbox couldn't reach huggingface.co either).

**Copied `data/chroma_db/` to a different path and retrieval broke** —
a real issue hit during this project's own development. Chroma stores
some internal references tied to the absolute path it was built at;
copying the directory elsewhere can silently break it. Don't copy —
re-run `python -m rag.ingest` at the target location instead.

## Dataset issues

**Training fails claiming a dataset is unavailable** — `ml/data_loader.py`
trains on whichever of the 5 real sources (Pima, Cleveland Heart, cardio,
Framingham, NHANES) are actually present, and records exactly which in
`data/processed/dataset_metadata.json`. It never substitutes fake data
for a missing source. If you need a specific missing one, see
`docs/DATASET_SETUP.md` for exact download instructions per source.

**Kaggle CLI can't authenticate** — `kaggle datasets download` needs
`~/.kaggle/kaggle.json` (from kaggle.com → Account → Create New API
Token). This project's own development environment couldn't reach
kaggle.com at all — the cardio dataset was obtained via a verified public
GitHub mirror instead (see `data/raw/cardio/PROVENANCE.txt` for exactly
how, if `kaggle` isn't an option for you either).

## Frontend issues

**`npm run build` fails after pulling changes** — run `npm ci` first
(not `npm install`) to get exactly the locked dependency versions,
especially after a `package-lock.json` change (this project fixed a real
high-severity `npm audit` finding in `nanoid` via `npm audit fix`, which
updated the lockfile).

**Port already in use** — backend defaults to 8000, frontend dev server
to 5173. Change with `uvicorn main:app --port <other>` or Vite's
`--port` flag / `vite.config.ts`.

**Every API call from the frontend fails / 404s in local dev** — a real
bug fixed in this project: `frontend/vite.config.ts` previously had no
dev-server proxy configured, despite `.env.example`'s comment claiming
one existed. If you're on an older copy of this repo, add a `server.proxy`
block forwarding `/api` to `http://localhost:8000` (see the current
`vite.config.ts` for the exact config), or set
`VITE_API_BASE_URL=http://localhost:8000/api/v1` directly in
`frontend/.env` as a workaround.

## Test suite issues

**Tests fail on a rerun that passed the first time (duplicate
registration / `IndexError`)** — this was a real bug, fixed in this
pass: tests used to write to the same SQLite file as local dev
(`data/mediguard_users.db`). `tests/conftest.py` now isolates tests onto
a temp DB. If you still see this on a very old copy of this repo, delete
`backend/data/mediguard_users.db` before rerunning.

## Still stuck?

Check `docs/FINAL_PROJECT_STATUS.md` for the current, honest list of
what's fully working vs. what genuinely still requires something this
environment doesn't have (API keys, a specific dataset download, a
GPU/Docker daemon, etc.) — several things that look like bugs are
actually disclosed, documented limitations.
