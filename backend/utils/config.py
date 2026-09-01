"""
MediGuard AI — Configuration & Settings
All environment variables and application constants.
"""

import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=())

    # App
    app_name: str = "MediGuard AI"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    environment: str = os.getenv("ENVIRONMENT", "development")

    # CORS
    # Comma-separated list in CORS_ORIGINS overrides the dev defaults below.
    # In production, set this to the real frontend origin(s) — never "*"
    # with allow_credentials=True (browsers reject that combination anyway,
    # and it defeats the purpose of CORS).
    cors_origins: List[str] = (
        [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
        or [
            "http://localhost:5173",   # Vite dev
            "http://localhost:3000",   # CRA dev
            "https://mediguard-ai.vercel.app",
        ]
    )

    # LLM / Agents
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    llm_provider: str = os.getenv("LLM_PROVIDER", "groq")       # groq | gemini | ollama
    llm_model: str = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")

    # MLflow
    mlflow_tracking_uri: str = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlflow.db")
    mlflow_experiment_name: str = "mediguard_ai"

    # LangSmith
    langchain_api_key: str = os.getenv("LANGCHAIN_API_KEY", "")
    langchain_tracing_v2: bool = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
    langchain_project: str = "mediguard_ai"

    # Chroma / RAG
    chroma_persist_dir: str = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db")
    rag_top_k: int = 5
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ML Models
    # Resolved relative to the backend/ directory (ml/model.py resolves it
    # via Path(__file__).parents[1] / model_dir, not the process CWD, so
    # this is robust regardless of where uvicorn is launched from).
    # Default "../models" = the project-root models/ directory, matching
    # where models/best_model.pkl actually ships. Previously this setting
    # was declared but never read anywhere — silently ignored if changed.
    # Now it's wired in for real (see ml/model.py::MODEL_ROOT).
    model_dir: str = os.getenv("MODEL_DIR", "../models")

        # File uploads
    upload_dir: str = os.getenv("UPLOAD_DIR", "./data/uploads")
    max_upload_mb: int = 20
    # Public origin the backend is reachable at, used to turn stored
    # relative paths like "/uploads/x.jpg" into absolute URLs the
    # frontend can load directly regardless of its own origin/proxy setup.
    # Set this to your real backend URL in production (e.g. Render/EC2 URL).
    public_base_url: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")

    # Auth / JWT
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "dev-only-change-me-in-production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24h
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

    # OTP / email verification
    otp_expire_seconds: int = int(os.getenv("OTP_EXPIRE_SECONDS", "300"))          # 5 min
    otp_max_attempts: int = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    otp_rate_limit_max: int = int(os.getenv("OTP_RATE_LIMIT_MAX", "5"))            # sends per window
    otp_rate_limit_window_minutes: int = int(os.getenv("OTP_RATE_LIMIT_WINDOW_MINUTES", "60"))
    verification_token_expire_seconds: int = int(os.getenv("VERIFICATION_TOKEN_EXPIRE_SECONDS", "900"))  # 15 min
    reset_token_expire_seconds: int = int(os.getenv("RESET_TOKEN_EXPIRE_SECONDS", "900"))  # 15 min

    # Email delivery (falls back to logging the OTP instead of sending when
    # no SMTP host is configured — see services/email_service.py)
    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", "no-reply@mediguard.ai")
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

settings = Settings()
