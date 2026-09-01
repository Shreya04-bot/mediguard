"""
MediGuard AI — MLOps API Route
GET  /api/v1/mlops/runs     — List recent MLflow runs
POST /api/v1/mlops/drift    — Run drift detection
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from ml.model import get_model
from mlops.mlflow_tracker import get_latest_run_metrics
from models.schemas import DriftReport
from auth.dependencies import require_role
from auth.db import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/runs", summary="List recent MLflow experiment runs")
async def get_runs(current_user: User = Depends(require_role("admin"))):
    try:
        runs = get_latest_run_metrics()
        return {"runs": runs, "count": len(runs)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/drift", response_model=DriftReport, summary="Run drift detection")
async def run_drift_check(current_user: User = Depends(require_role("admin"))):
    """
    Compute PSI-based drift against the best model training baseline.
    """
    try:
        result = get_model().drift_report()
        return DriftReport(**result)
    except Exception as exc:
        logger.exception("Drift detection error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
