"""
MediGuard AI — Training CLI entrypoint
==========================================
Run: python -m ml.train [--force-replace]

Trains the joint multi-output classifier (diabetes_label,
cardiovascular_label, hypertension_label) on every real data source
available under backend/data/raw/ (see ml/data_loader.py), evaluates it,
logs the run to MLflow, and saves it to models/best_model.pkl (if
--force-replace or if it beats the current best on AUC).

Why one script, not train_diabetes.py / train_hypertension.py /
train_cardiovascular.py separately: the production model is a genuinely
joint sklearn Pipeline(StandardScaler -> MultiOutputClassifier(...)) that
shares one fitted scaler and one train/val split across all three
targets — it is not three independent models that happen to ship
together. Splitting this into per-target scripts would either (a) silently
diverge from what actually ships (if each script fit its own scaler on a
different split), or (b) be a thin, purely cosmetic wrapper around the
exact same shared fit() call. Neither is worth the added surface. If you
need per-target metrics, they're already broken out — see the output of
this command, or ml/model.py::_evaluate().

For baseline model comparison (Logistic Regression / Random Forest /
XGBoost side-by-side), use `python -m ml.baseline_comparison` instead —
see docs/MODEL_COMPARISON.md.
"""

from __future__ import annotations

import argparse
import json
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("ml.train")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the MediGuard AI multi-output risk model.")
    parser.add_argument(
        "--force-replace", action="store_true",
        help="Promote this run to models/best_model.pkl even if it doesn't beat the current best AUC.",
    )
    args = parser.parse_args()

    from ml.model import get_model
    model = get_model()
    logger.info("Starting training run (force_replace=%s) ...", args.force_replace)
    metrics = model.train(force_replace=args.force_replace)

    print(json.dumps(metrics, indent=2, default=str))
    logger.info(
        "Done. version=%s decision=%s — model file: %s",
        metrics.get("version"), metrics.get("decision"),
        "models/best_model.pkl" if metrics.get("decision") == "promoted" else "models/versions/ only (not promoted)",
    )


if __name__ == "__main__":
    main()
