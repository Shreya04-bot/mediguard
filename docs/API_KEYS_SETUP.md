# MediGuard AI — API Keys & External Service Setup

This is a full accounting of every external service the backend can talk
to, verified against the actual code (`agents/llm_factory.py`,
`rag/retriever.py`, `utils/config.py`, `services/otp_service.py`/email
sender) — not copied from a template. **Nothing below is required just to
run the app and get real predictions.** Every ML prediction, SHAP
explanation, dashboard, chart, PDF report, and the entire auth system work
with zero API keys configured.

## Summary: what actually needs a key

| Feature | Needs a key? | Falls back to |
|---|---|---|
| Disease risk prediction (`/predict`) | No | — (pure ML, no LLM/API) |
| SHAP explanations, dashboards, charts, PDF export | No | — |
| Auth, registration, roles | No | Console-logged OTP (see SMTP section) |
| `/ai/chat`, LangGraph agents, Ayurveda AI recommendations | **Yes, for best results** | Ollama (local, free, no key) if Groq/Gemini unset |
| RAG guideline retrieval quality (semantic vs. lexical) | No | TF-IDF fallback (real, just lower quality) |
| Experiment tracking dashboards | No | Local SQLite, always on |
| Call tracing/debugging (LangSmith) | No — pure convenience | Silently off |

## 1. GROQ_API_KEY (recommended — primary LLM provider)

- **Purpose**: powers `/ai/chat`, the LangGraph clinical agents
  (SymptomAgent → ReportAgent → RAGAgent → AyurvedaAgent →
  CoordinatorAgent), and Ayurveda herb/diet recommendations.
- **Required?** No, but without it (and without `GEMINI_API_KEY`) the app
  falls back to Ollama, which requires you to separately install and run
  Ollama locally — Groq's free tier is the path of least resistance for a
  demo/viva.
- **Get one**: https://console.groq.com → sign up (free) → API Keys →
  Create API Key.
- **Set**: `GROQ_API_KEY=gsk_...` in `backend/.env`.
- **Also set**: `LLM_PROVIDER=groq` (already the default) and optionally
  `LLM_MODEL` (default `llama-3.1-8b-instant`).

## 2. GEMINI_API_KEY (optional — alternate LLM provider)

- **Purpose**: same features as Groq, alternate provider if you'd rather
  use Google's models or hit Groq rate limits.
- **Required?** No — only used if `LLM_PROVIDER=gemini`.
- **Get one**: https://aistudio.google.com/app/apikey (free tier available).
- **Set**: `GEMINI_API_KEY=...` and `LLM_PROVIDER=gemini` in `backend/.env`.

## 3. OLLAMA_BASE_URL (optional — fully local, zero-key LLM fallback)

- **Purpose**: last-resort LLM fallback with no external API at all.
- **Required?** No. Only used if both Groq and Gemini are unset/fail.
- **Get it**: install Ollama (https://ollama.com), then
  `ollama pull llama3.1:8b` and leave it running.
- **Set**: `OLLAMA_BASE_URL=http://localhost:11434` (already the default —
  only change this if Ollama runs on a different host/port).

## 4. LANGCHAIN_API_KEY / LangSmith (fully optional — tracing only)

- **Purpose**: traces every LangChain/LangGraph call to
  https://smith.langchain.com for debugging agent behavior. Purely a
  developer convenience — no feature depends on it.
- **Required?** No.
- **Get one**: https://smith.langchain.com → Settings → API Keys.
- **Set**: `LANGCHAIN_API_KEY=...` **and** `LANGCHAIN_TRACING_V2=true`
  (both must be set — `main.py` only enables tracing when both are truthy).

## 5. Embedding model (RAG) — no key needed, but note the network dependency

- `rag/retriever.py` tries to download
  `sentence-transformers/all-MiniLM-L6-v2` from HuggingFace on first use
  (no API key required — it's a public model). If that download fails
  (offline environment, firewall), it automatically falls back to a real
  TF-IDF embedding (scikit-learn, already a dependency, zero downloads).
  Retrieval still works either way; semantic quality is lower on the
  TF-IDF path. See `RAG_SETUP.md`.

## 6. SMTP (optional for dev, needed for production email delivery)

- **Purpose**: sends real OTP codes for registration/password-reset by
  email.
- **Required?** No for local development/demo — leave `SMTP_HOST` blank
  and OTP codes are logged to the server console instead (clearly labeled
  as a dev-only fallback, see `backend/services/` OTP sender).
  **Yes for any real production deployment** — users can't retrieve OTPs
  from server logs they don't have access to.
- **Get credentials**: any SMTP provider works — SendGrid, AWS SES SMTP
  credentials, Postmark, Mailgun, or a plain Gmail app password for a demo.
- **Set** in `backend/.env`:
  ```
  SMTP_HOST=smtp.sendgrid.net
  SMTP_PORT=587
  SMTP_USER=apikey
  SMTP_PASSWORD=your_provider_key
  SMTP_FROM_EMAIL=no-reply@yourdomain.com
  SMTP_USE_TLS=true
  ```

## Explicitly NOT used by this project

To avoid asking for keys the code doesn't call: there is **no OpenAI
integration** (no `OPENAI_API_KEY` anywhere in the codebase — verified by
grep), and **no Kaggle API integration** (dataset acquisition is manual —
see `docs/DATASET_GUIDE.md` / `MISSING_COMPONENTS.md` — so no
`KAGGLE_USERNAME`/`KAGGLE_KEY` is read anywhere either). If you see either
of those mentioned in an older doc/report in this repo, it's stale —
`.env.example` is the source of truth and does not list them.

## Where to put keys

All of the above go in `backend/.env` (copy from `backend/.env.example`).
Never commit `.env` — it's already covered by `.gitignore`.
