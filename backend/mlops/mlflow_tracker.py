"""MLOps helpers backed by real MLflow experiment tracking.

get_latest_run_metrics() now queries MLflow's tracking API (MlflowClient)
directly, so /api/v1/mlops/runs reflects actual logged MLflow runs. The JSON
model_metadata.json registry (written by ml/model.py on every train()) is kept
as a fallback for when MLflow itself is unreachable, and its content is used
to backfill legacy runs that predate MLflow logging.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

from ml.data_loader import FEATURE_COLUMNS
from ml.model import METADATA_PATH, get_model
from utils.config import settings

logger = logging.getLogger(__name__)


def _runs_from_mlflow(limit: int) -> List[Dict[str, Any]] | None:
    try:
        import mlflow
        from mlflow.tracking import MlflowClient

        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        client = MlflowClient()
        experiment = client.get_experiment_by_name(settings.mlflow_experiment_name)
        if experiment is None:
            return None

        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            order_by=["start_time DESC"],
            max_results=limit,
        )
        if not runs:
            return None

        results = []
        for run in runs:
            data = run.data
            results.append({
                "run_id": run.info.run_id,
                "version": data.params.get("version"),
                "status": run.info.status,
                "start_time": run.info.start_time,
                "params": dict(data.params),
                "metrics": dict(data.metrics),
                "auc_score": data.metrics.get("auc_score"),
                "accuracy": data.metrics.get("accuracy"),
                "source": "mlflow",
            })
        return results
    except Exception as exc:
        logger.warning("Could not read runs from MLflow tracking store: %s", exc)
        return None


def _runs_from_registry(limit: int) -> List[Dict[str, Any]]:
    if not METADATA_PATH.exists():
        return []
    metadata = json.loads(METADATA_PATH.read_text())
    models = metadata.get("models", [])[-limit:][::-1]
    for m in models:
        m.setdefault("source", "model_metadata.json (pre-MLflow or MLflow unavailable)")
    return models


def get_latest_run_metrics(limit: int = 10) -> List[Dict[str, Any]]:
    """List recent MLflow experiment runs.

    Prefers MLflow's own tracking API; falls back to the joblib-registry JSON
    (model_metadata.json) if MLflow is unreachable, so the endpoint keeps
    working even if the sqlite tracking store is temporarily unavailable.
    """
    mlflow_runs = _runs_from_mlflow(limit)
    if mlflow_runs:
        return mlflow_runs
    return _runs_from_registry(limit)


def detect_drift(reference_or_current: Any, current: Any | None = None) -> Dict[str, Any]:
    batch = current if current is not None else reference_or_current
    model = get_model()
    if isinstance(batch, pd.DataFrame):
        return model.drift_report(batch[FEATURE_COLUMNS])
    return model.drift_report(batch)


def log_training_run(model: Any, metrics: Dict[str, Any]) -> str | None:
    return metrics.get("mlflow_run_id") or metrics.get("version")
