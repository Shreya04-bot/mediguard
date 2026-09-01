"""MediGuard AI — Health Check Route"""

from fastapi import APIRouter
from models.schemas import HealthResponse
from utils.config import settings

router = APIRouter()


@router.get("/", response_model=HealthResponse, summary="System health check")
async def health_check():
    services = {}

    # Check MLflow
    try:
        import mlflow
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        services["mlflow"] = "ok"
    except Exception:
        services["mlflow"] = "unavailable"

    # Check Chroma
    try:
        import chromadb
        services["chroma"] = "ok"
    except Exception:
        services["chroma"] = "unavailable"

    # Check ML model
    try:
        from ml.model import get_model
        m = get_model()
        services["ml_model"] = "loaded" if m.pipeline else "uninitialised"
    except Exception:
        services["ml_model"] = "error"

    overall = "healthy" if all(v in ("ok", "loaded", "uninitialised") for v in services.values()) else "degraded"
    return HealthResponse(status=overall, services=services, version="1.0.0")
