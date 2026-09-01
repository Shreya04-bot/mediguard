"""
MediGuard AI — Joint Disease Risk Prediction Route
=====================================================
Multi-output XGBoost prediction with SHAP explanations.
Persists prediction run to database if user is authenticated.
"""

import uuid
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session

from ml.model import get_model
from models.schemas import PatientInput, PredictionResponse, DiseaseRisk, SHAPFeature, RiskLevel
from auth.db import get_db, User
from auth.dependencies import oauth2_scheme, decode_access_token, require_role
from services.patient_service import PatientService
from utils.rate_limit import check_rate_limit

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=PredictionResponse, summary="Joint disease risk prediction")
async def predict(
    patient: PatientInput,
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Run multi-output ML prediction for Diabetes and Cardiovascular risk.
    Returns probabilities, risk levels, confidence scores, and top SHAP feature explanations.
    """
    # SECURITY_REPORT.md finding #12: /predict previously had no throttling
    # at all (unlike /ai/chat), making it a cheap DoS/cost vector since it
    # runs a full ML inference (+ SHAP) per call. Keyed by user id when
    # authenticated, else client IP.
    rate_key = None
    if token:
        try:
            rate_key = decode_access_token(token).get("sub")
        except Exception:
            rate_key = None
    if not rate_key:
        rate_key = request.client.host if request.client else "anonymous"
    check_rate_limit("predict", rate_key, max_requests=30, window_seconds=60)

    try:
        model = get_model()
        raw = patient.model_dump()
        result = model.predict(raw)

        def _build_risk(d: dict) -> DiseaseRisk:
            return DiseaseRisk(
                probability=d["probability"],
                risk_level=RiskLevel(d["risk_level"]),
                confidence=d["confidence"],
                shap_features=[
                    SHAPFeature(
                        feature=f["feature"],
                        value=f["value"],
                        shap_value=f["shap_value"],
                        impact=f["impact"],
                    )
                    for f in d.get("shap_features", [])
                ],
            )

        resp = PredictionResponse(
            patient_id=str(uuid.uuid4()),
            diabetes_risk=_build_risk(result["diabetes"]),
            cardiovascular_risk=_build_risk(result["cardiovascular"]),
            hypertension_risk=_build_risk(result["hypertension"]),
            combined_risk_score=result["combined_risk_score"],
            model_version=result["model_version"],
            prediction_id=result["prediction_id"],
            timestamp=result["timestamp"],
        )

        # Save to DB if authenticated
        if token:
            try:
                payload = decode_access_token(token)
                user_id = payload.get("sub")
                if user_id:
                    user = db.query(User).filter(User.id == user_id).first()
                    if user:
                        PatientService.save_prediction(
                            db=db,
                            user_id=user.id,
                            prediction_id=result["prediction_id"],
                            input_data=raw,
                            diabetes_prob=result["diabetes"]["probability"],
                            diabetes_level=result["diabetes"]["risk_level"],
                            cvd_prob=result["cardiovascular"]["probability"],
                            cvd_level=result["cardiovascular"]["risk_level"],
                            hypertension_prob=result["hypertension"]["probability"],
                            hypertension_level=result["hypertension"]["risk_level"],
                            combined_score=result["combined_risk_score"],
                            model_version=result["model_version"],
                        )
            except Exception as e:
                logger.warning("Could not persist prediction to DB: %s", e)

        return resp
    except Exception as exc:
        logger.exception("Prediction error")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


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
    except Exception as exc:
        logger.exception("Training error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
