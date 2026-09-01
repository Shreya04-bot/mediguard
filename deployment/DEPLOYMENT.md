# MediGuard AI — Production Deployment Guide

For local development, use `../README.md`'s Quick Start instead — this
document covers running MediGuard AI somewhere real people can reach it.

---

## ⚠️ Before anything else: secrets

**An earlier development pass on this project found live API keys
(Groq, Gemini, LangSmith) committed directly in `backend/.env`, with no
`.gitignore` protection.** This has been fixed and re-verified — `.env`
is git-ignored (confirmed via `git check-ignore -v backend/.env`) and
the shipped copy is stripped of real values (only blank
`GROQ_API_KEY=` / `GEMINI_API_KEY=` / `LANGCHAIN_API_KEY=` placeholders
remain), and `.env.example` documents every variable — but if you're
deploying a copy of this repo from before that fix, or you suspect the
original keys were ever pushed to a shared/public git history:

1. **Rotate every key** at its provider before doing anything else —
   Groq console, Google AI Studio, LangSmith settings.
2. Confirm `.env` is actually excluded: `git check-ignore -v backend/.env`
   should print a match. If it prints nothing, `.env` is *not* ignored
   and you should fix that before committing anything.
3. Never bake secrets into a Docker image. This project's `Dockerfile`s
   don't `COPY` `.env` files — secrets are injected at container
   runtime via `env_file:`/environment variables. Keep it that way.

For real production, don't rely on a `.env` file on disk at all — use
your platform's secrets manager (AWS Secrets Manager, GCP Secret
Manager, Docker Swarm/Kubernetes secrets, Railway/Render/Fly.io's
built-in env var stores, etc.) and inject them as environment variables
at deploy time.

---

## Minimum required configuration for production

From `backend/.env.example`, at minimum change these from their dev
defaults:

| Variable | Why |
|---|---|
| `JWT_SECRET_KEY` | Dev default is a well-known placeholder string. Generate a real one: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DEBUG` | Set `false` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM_EMAIL` | Without these, OTP codes are only logged to the server console — fine for local dev, not usable for real users. Point at SendGrid, SES SMTP, Postmark, etc. |
| `GROQ_API_KEY` (or your chosen `LLM_PROVIDER`'s key) | Chat, the LangGraph clinical agents, and the Ayurveda AI agent all return a clear 503 without this — everything else (prediction, OCR, dashboards) works fine without it |

---

## Docker Compose (single-host deployment)

```bash
cd mediguard-ai
cp backend/.env.example backend/.env   # fill in real values, see above
docker compose up --build -d
```

This builds two images:
- **backend** — FastAPI + the real trained model (`models/best_model.pkl`
  ships inside the image), Tesseract/espeak/poppler for OCR/voice/PDF
- **frontend** — the role-based dashboard, compiled by Vite and served
  by nginx, which also proxies `/api/*` to the backend container

Volumes `backend_data` and `model_store` persist the SQLite DB and any
retrained models across container recreation — don't `docker compose
down -v` unless you actually want to lose that data.

### Put a reverse proxy with TLS in front of this

`docker-compose.yml` exposes the frontend on port 80 and the backend
directly on port 8000. Neither serves HTTPS. For anything beyond a
demo, put a reverse proxy (Caddy, Traefik, nginx, or your cloud
provider's load balancer) in front that terminates TLS and forwards to
the frontend container's port 80 — don't expose port 8000 to the
public internet at all; only the frontend's nginx (which proxies to it
internally on the Docker network) needs to reach it.

### CORS

`main.py` currently sets `allow_origins=["*"]` for developer
convenience. **Lock this down for production** — restrict it to your
actual frontend origin(s) once you have a real domain, since a
wildcard origin with credentialed requests is a real attack surface.

---

## Scaling beyond a single container

A few things in this codebase are currently single-process,
in-memory, or SQLite-backed — fine for a single instance, worth
revisiting before running multiple backend replicas:

- **SQLite** (`AUTH_DB_PATH`) — works for one process. For multiple
  backend replicas behind a load balancer, migrate to Postgres (the
  SQLAlchemy models don't use anything SQLite-specific, so this is a
  connection-string + Alembic-migration change, not a rewrite).
- **`/ai/chat`'s rate limiter** (`api/routes/ai_gateway.py`) is an
  in-memory sliding window, per-process. Behind multiple replicas each
  process would track its own limit independently — move to a shared
  store (Redis) if you scale horizontally.
- **OTP/session state** already lives in the SQLite DB (not in-memory),
  so that part scales fine once the DB itself does.
- **Chroma (RAG vector store)** — persisted to a local directory
  (`CHROMA_PERSIST_DIR`). For multiple replicas, either mount a shared
  volume or move to Chroma's client-server mode / a managed vector DB.

---

## Health checks & monitoring

- Backend: `GET /api/v1/health/` — already wired into both the
  Dockerfile's `HEALTHCHECK` and `docker-compose.yml`.
- Frontend: nginx responds on `/` — wired into the frontend
  Dockerfile's `HEALTHCHECK`.
- **MLOps**: the admin **ML Ops Monitor** page
  (`/dashboard/admin/mlops`) shows real model health status, deployed
  vs. staging model versions, and a manual drift-detection trigger
  (`POST /mlops/drift`, admin-only). There's no automated
  drift-triggered retraining — that's a deliberate scope decision, not
  an oversight (`RETRAIN_ON_DRIFT` exists as an opt-in env var — see
  `backend/.env.example`).
- **LangSmith**: set `LANGCHAIN_API_KEY` + `LANGCHAIN_TRACING_V2=true`
  to get real tracing of every chat/agent LLM call at
  smith.langchain.com, tagged by role and endpoint (see
  `docs/API_KEYS_SETUP.md`).

---

## What's *not* covered here

- CI/CD pipeline setup (GitHub Actions, etc.) — not built as part of
  this project.
- Automated backups of the SQLite/Postgres database — set this up per
  your hosting provider.
- Multi-region / high-availability topology — this is a single-region
  deployment guide.

If you need any of these, they're reasonable follow-ups but weren't in
scope for the phases completed so far — flag it and it can be scoped
as its own piece of work.
