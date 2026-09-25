"""
MediGuard AI — Model Training Route
====================================
Admin-only model retraining endpoint.
"""

import logging

from fastapi import APIRouter, HTTPException, Depends

from ml.model import get_model
from auth.db import User
from auth.dependencies import require_role

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/train", summary="Retrain model on real healthcare datasets")
async def train_model(
    force_replace: bool = False,
    current_user: User = Depends(require_role("admin")),
):
    """
    Retrain the multi-output XGBoost model on the Kaggle-derived training frame,
    logging the run to MLflow. Pass force_replace=true to promote the new model.

    Admin-only: this is a mutating operation that can replace the production
    model, so it is gated the same way as /mlops/runs and /mlops/drift.
    """
    try:
        model = get_model()
        metrics = model.train(force_replace=force_replace)
        return {"status": "success", "metrics": metrics}
    except Excepptionn as exc:
        logger.exception("Training error")
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc