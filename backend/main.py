"""
MediGuard AI — FastAPI Enterprise Application Entry Point
============================================================
Includes Role-Based Access Control APIs (Patient, Doctor, Admin) alongside
Disease Prediction, SHAP Explainability, LangGraph Agents, OCR, Voice, RAG, MLOps, and Ayurveda.
"""

from __future__ import annotations
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from utils.config import settings

# --- LangSmith tracing ------------------------------------------------------
# LangChain's SDK reads these directly from the process environment — it
# doesn't take a config object. Propagating our own `settings` here means
# every LangChain call anywhere in the app (agents/graph.py's LangGraph
# nodes, ai_gateway.py's chat LLM, herb_recommender's LLM fallback) is
# auto-traced to LangSmith the moment LANGCHAIN_API_KEY + a truthy
# LANGCHAIN_TRACING_V2 are set in the environment — no code changes needed
# at each call site. Full tracing dashboard/observability tooling is
# tracked as a separate MLOps follow-up; this just makes the instrumentation
# actually turn on.
if settings.langchain_tracing_v2 and settings.langchain_api_key:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project

from api.routes import (
    health,
    prediction,
    agents,
    reports,
    voice,
    mlops,
    ayurveda,
    auth_routes,
    patient_routes,
    doctor_routes,
    admin_routes,
    notifications,
    ai_gateway,
    appointment_routes,
    preferences,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load best model, initialize ORM tables, and perform startup checks."""
    logger.info("MediGuard AI Enterprise Platform starting up...")
    from auth.db import init_db
    init_db()
    from utils.startup_check import run_startup_checks
    run_startup_checks()
    logger.info("MediGuard AI Enterprise Platform ready.")
    yield
    logger.info("MediGuard AI Enterprise Platform shutting down.")


app = FastAPI(
    title="MediGuard AI Enterprise Platform",
    description="Enterprise Role-Based Healthcare Platform with Disease Risk Prediction, OCR, Voice Assistant, SHAP, and Ayurveda",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves uploaded profile photos (POST /api/v1/auth/profile/photo) and
# anything else already written to settings.upload_dir. Reuses the same
# directory report uploads already write to — no new storage system.
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.exception_handler(HTTPException)
async def normalized_http_exception_handler(request: Request, exc: HTTPException):
    """
    Flattens every HTTPException into the {"error": ..., "code": ...}
    shape the frontend's axios client (lib/axios.ts) reads directly off
    the response body, regardless of whether a route raised a plain
    string detail (legacy code) or a structured {"error","code",...} dict
    (new auth/OTP routes).
    """
    detail = exc.detail
    if isinstance(detail, dict):
        body = {"error": detail.get("error", "Request failed."), **{k: v for k, v in detail.items() if k != "error"}}
    else:
        body = {"error": str(detail)}
    return JSONResponse(status_code=exc.status_code, content=body, headers=getattr(exc, "headers", None) or {})


@app.exception_handler(RequestValidationError)
async def normalized_validation_exception_handler(request: Request, exc: RequestValidationError):
    """Turns FastAPI's default 422 {"detail": [...]} into {"error", "code", "details"}."""
    return JSONResponse(
        status_code=422,
        content={
            "error": "Some of the submitted information is invalid.",
            "code": "VALIDATION_ERROR",
            "details": exc.errors(),
        },
    )

app.include_router(auth_routes.router,    prefix="/api/v1/auth",     tags=["Auth"])
app.include_router(patient_routes.router, prefix="/api/v1/patient",  tags=["Patient"])
app.include_router(doctor_routes.router,  prefix="/api/v1/doctor",   tags=["Doctor"])
app.include_router(admin_routes.router,   prefix="/api/v1/admin",    tags=["Admin"])
app.include_router(health.router,         prefix="/api/v1/health",   tags=["Health"])
app.include_router(prediction.router,     prefix="/api/v1/predict",  tags=["Prediction"])
app.include_router(agents.router,         prefix="/api/v1/agents",   tags=["Agents"])
app.include_router(reports.router,        prefix="/api/v1/reports",  tags=["Reports"])
app.include_router(voice.router,          prefix="/api/v1/voice",    tags=["Voice"])
app.include_router(mlops.router,          prefix="/api/v1/mlops",    tags=["MLOps"])
app.include_router(ayurveda.router,       prefix="/api/v1/features", tags=["Features & Ayurveda"])
app.include_router(notifications.router,  prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(ai_gateway.router,     prefix="/api/v1/ai",       tags=["AI Gateway"])
app.include_router(appointment_routes.router, prefix="/api/v1/appointments", tags=["Appointments"])
app.include_router(preferences.router,     prefix="/api/v1/preferences", tags=["Preferences"])
app.include_router(
    preferences.router,
    prefix="/api/preferences",
    tags=["Preferences (unversioned alias)"],
    include_in_schema=False,
)
# --- Versionless alias -------------------------------------------------
# The new role-based frontend's axios client (src/lib/axios.js) defaults
# to baseURL "/api" (no "/v1") when VITE_API_BASE_URL isn't set. Rather
# than force every deployment to set that env var, the same routers are
# also mounted here so both "/api/v1/auth/login" and "/api/auth/login"
# work identically. Set VITE_API_BASE_URL="/api/v1" explicitly if you'd
# rather not expose both paths.
app.include_router(auth_routes.router,    prefix="/api/auth",     tags=["Auth (unversioned alias)"], include_in_schema=False)
app.include_router(patient_routes.router, prefix="/api/patient",  tags=["Patient (unversioned alias)"], include_in_schema=False)
app.include_router(doctor_routes.router,  prefix="/api/doctor",   tags=["Doctor (unversioned alias)"], include_in_schema=False)
app.include_router(admin_routes.router,   prefix="/api/admin",    tags=["Admin (unversioned alias)"], include_in_schema=False)
app.include_router(reports.router,        prefix="/api/reports",  tags=["Reports (unversioned alias)"], include_in_schema=False)
app.include_router(voice.router,          prefix="/api/voice",    tags=["Voice (unversioned alias)"], include_in_schema=False)
app.include_router(notifications.router,  prefix="/api/notifications", tags=["Notifications (unversioned alias)"], include_in_schema=False)
app.include_router(ai_gateway.router,     prefix="/api/ai",          tags=["AI Gateway (unversioned alias)"], include_in_schema=False)
app.include_router(appointment_routes.router, prefix="/api/appointments", tags=["Appointments (unversioned alias)"], include_in_schema=False)


@app.get("/")
async def root():
    return {
        "service": "MediGuard AI Enterprise Platform",
        "version": "3.0.0",
        "roles_supported": ["patient", "doctor", "admin"],
        "docs": "/docs",
        "health": "/api/v1/health/",
    }
