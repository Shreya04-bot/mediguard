"""
Lightweight test app: mounts just the auth/patient/doctor/admin/health
routers so the auth test suite runs fast and doesn't require installing
the full ML/agents/OCR/voice dependency stack (sklearn, shap, langchain,
chromadb, mlflow, pytesseract, pyttsx3, ...) just to validate auth
behaviour. main.py (the real app entrypoint used in production/dev) is
unaffected and mounts every router as normal.
"""
from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from api.routes import auth_routes, patient_routes, doctor_routes, admin_routes, health, notifications, ai_gateway, mlops, prediction, appointment_routes

@asynccontextmanager
async def lifespan(app: FastAPI):
    from auth.db import init_db
    init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.exception_handler(HTTPException)
async def normalized_http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        body = {"error": detail.get("error", "Request failed."), **{k: v for k, v in detail.items() if k != "error"}}
    else:
        body = {"error": str(detail)}
    return JSONResponse(status_code=exc.status_code, content=body, headers=getattr(exc, "headers", None) or {})


@app.exception_handler(RequestValidationError)
async def normalized_validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": "Some of the submitted information is invalid.", "code": "VALIDATION_ERROR", "details": exc.errors()},
    )


app.include_router(auth_routes.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(patient_routes.router, prefix="/api/v1/patient", tags=["Patient"])
app.include_router(doctor_routes.router, prefix="/api/v1/doctor", tags=["Doctor"])
app.include_router(admin_routes.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(ai_gateway.router, prefix="/api/v1/ai", tags=["AI Gateway"])
app.include_router(mlops.router, prefix="/api/v1/mlops", tags=["MLOps"])
app.include_router(prediction.router, prefix="/api/v1/predict", tags=["Prediction"])
app.include_router(appointment_routes.router, prefix="/api/v1/appointments", tags=["Appointments"])