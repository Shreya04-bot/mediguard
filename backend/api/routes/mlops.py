import json
import logging
from typing import List

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ml.model import get_model
from mlops.mlflow_tracker import get_latest_run_metrics
from models.schemas import DriftReport
from models.prediction_history import PredictionHistory
from auth.dependencies import require_role
from auth.db import get_db, User

router = APIRouter()
logger = logging.getLogger(__name__)

# Need at least this many recent real predictions logged before a drift
# check against them is statistically meaningful.
MIN_DRIFT_SAMPLE_SIZE = 30
# How many of the most recent predictions to pull as the "current" window.
DRIFT_SAMPLE_LIMIT = 500


@router.get("/runs", summary="List recent MLflow experiment runs")
async def get_runs(current_user: User = Depends(require_role("admin"))):
    try:
        runs = get_latest_run_metrics()
        return {"runs": runs, "count": len(runs)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/drift", response_model=DriftReport, summary="Run drift detection")
async def run_drift_check(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Compute PSI-based drift between the training baseline and the most
    recent REAL prediction inputs logged in prediction_histories — not
    the training data compared against itself.
    """
    try:
        model = get_model()

        rows = (
            db.query(PredictionHistory.input_data)
            .order_by(desc(PredictionHistory.created_at))
            .limit(DRIFT_SAMPLE_LIMIT)
            .all()
        )
        if len(rows) < MIN_DRIFT_SAMPLE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Not enough real prediction data yet to check for drift "
                    f"({len(rows)}/{MIN_DRIFT_SAMPLE_SIZE} predictions logged)."
                ),
            )

        encoded_rows = []
        for (raw_json,) in rows:
            try:
                encoded_rows.append(model._encode_patient(json.loads(raw_json)).iloc[0].to_dict())
            except Exception as exc:
                logger.warning("Skipping malformed prediction_history row in drift check: %s", exc)

        current_df = pd.DataFrame(encoded_rows)
        result = model.drift_report(current_df)
        return DriftReport(**result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Drift detection error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc