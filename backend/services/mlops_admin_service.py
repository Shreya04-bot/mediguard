"""
MediGuard AI — Admin ML Models Overview Service
==================================================
Backs the Admin "ML Ops Monitor" dashboard. Combines:
  - MLflow run history (accuracy/AUC per trained version) via
    mlops.mlflow_tracker.get_latest_run_metrics()
  - Real usage counts per model version from PredictionHistory

The currently-loaded model (ml.model.get_model().model_version) is
marked "Production"; every other known version is "Staging" — this
reflects what's actually deployed, not a fabricated status.
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.prediction_history import PredictionHistory

logger = logging.getLogger(__name__)


def _epoch_ms_to_iso(epoch_ms) -> str | None:
    if not epoch_ms:
        return None
    try:
        return datetime.fromtimestamp(epoch_ms / 1000, tz=timezone.utc).isoformat()
    except (TypeError, ValueError, OSError):
        return None


class MLOpsAdminService:

    @staticmethod
    def get_models_overview(db: Session) -> Dict[str, Any]:
        from mlops.mlflow_tracker import get_latest_run_metrics
        from ml.model import get_model

        try:
            current_version = get_model().model_version
        except Exception:
            current_version = None

        try:
            runs = get_latest_run_metrics(limit=20)
        except Exception as exc:
            logger.warning("Could not fetch MLflow runs: %s", exc)
            runs = []

        counts_by_version = dict(
            db.query(PredictionHistory.model_version, func.count(PredictionHistory.id))
            .group_by(PredictionHistory.model_version)
            .all()
        )

        models = []
        seen_versions = set()
        for run in runs:
            version = run.get("version") or run.get("run_id")
            if not version or version in seen_versions:
                continue
            seen_versions.add(version)
            accuracy = run.get("accuracy")
            metrics = run.get("metrics") or {}
            models.append({
                "id": run.get("run_id") or version,
                "name": f"Risk Model {version}",
                "version": version,
                "status": "Production" if version == current_version else "Staging",
                "accuracy": round(accuracy * 100, 1) if isinstance(accuracy, (int, float)) and accuracy <= 1 else accuracy,
                "precision": metrics.get("precision"),
                "recall": metrics.get("recall"),
                "aucScore": run.get("auc_score"),
                "predictions": counts_by_version.get(version, 0),
                "lastUpdated": _epoch_ms_to_iso(run.get("start_time")),
                "source": run.get("source", "mlflow"),
            })

        # Ensure the currently-loaded version always appears even if the
        # MLflow/registry lookup above didn't happen to include it.
        if current_version and current_version not in seen_versions and current_version != "unloaded":
            models.insert(0, {
                "id": current_version,
                "name": f"Risk Model {current_version}",
                "version": current_version,
                "status": "Production",
                "accuracy": None,
                "precision": None,
                "recall": None,
                "aucScore": None,
                "predictions": counts_by_version.get(current_version, 0),
                "lastUpdated": None,
                "source": "loaded",
            })

        total_predictions = sum(counts_by_version.values())
        accuracies = [m["accuracy"] for m in models if isinstance(m.get("accuracy"), (int, float))]
        avg_accuracy = round(sum(accuracies) / len(accuracies), 1) if accuracies else None

        return {
            "models": models,
            "summary": {
                "deployedCount": sum(1 for m in models if m["status"] == "Production"),
                "stagingCount": sum(1 for m in models if m["status"] == "Staging"),
                "totalPredictions": total_predictions,
                "avgAccuracy": avg_accuracy,
                "modelHealth": "healthy" if current_version and current_version != "unloaded" else "no_model_deployed",
            },
        }
