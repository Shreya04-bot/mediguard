"""
MediGuard AI — Baseline Model Comparison
============================================
Implements the model comparison the synopsis's "Expected Results" section
calls for: Logistic Regression and Random Forest baselines evaluated
against the production XGBoost pipeline, using the identical
train/validation split, feature set, and metrics as `ml/model.py`'s real
training path — so the comparison is apples-to-apples with what's
actually deployed, not a separate toy evaluation.

Run:
    python -m ml.baseline_comparison

Writes docs/MODEL_COMPARISON.md with the results table and the explicit
selection criterion, and prints the same table to stdout. Does NOT modify
the production model registry (models/best_model.pkl) — this is an
evaluation/reporting tool, not a training entrypoint. If a baseline is
selected as champion, promoting it into `ml/model.py::_make_pipeline()`
is a separate, deliberate code change (see the bottom of this file).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.multioutput import MultiOutputClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from ml.data_loader import FEATURE_COLUMNS, TARGET_COLUMNS, load_full_training_frame
from ml.model import XGB_PARAMS, _make_pipeline

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("ml.baseline_comparison")

DOCS_PATH = Path(__file__).resolve().parents[2] / "docs" / "MODEL_COMPARISON.md"

CANDIDATES = {
    "Logistic Regression": lambda: Pipeline([
        ("scaler", StandardScaler()),
        ("clf", MultiOutputClassifier(
            LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42), n_jobs=1)),
    ]),
    "Random Forest": lambda: Pipeline([
        ("scaler", StandardScaler()),
        ("clf", MultiOutputClassifier(
            RandomForestClassifier(n_estimators=300, max_depth=8, min_samples_leaf=3,
                                    class_weight="balanced", random_state=42, n_jobs=1), n_jobs=1)),
    ]),
    "XGBoost (production)": _make_pipeline,
}


def _evaluate_per_target(pipeline: Pipeline, X_val: pd.DataFrame, y_val: pd.DataFrame) -> Dict[str, float]:
    """Same metric set as ml/model.py::_evaluate, kept independent (not
    imported) so this comparison doesn't silently change if that function
    is edited for production-only reasons later."""
    predictions = pipeline.predict(X_val.values if hasattr(X_val, "values") else X_val)
    probabilities = pipeline.predict_proba(X_val.values if hasattr(X_val, "values") else X_val)
    out: Dict[str, float] = {}
    aucs, accs, precs, recs, f1s = [], [], [], [], []
    for idx, target in enumerate(TARGET_COLUMNS):
        labels = y_val[target]
        probs = probabilities[idx][:, 1]
        pred = predictions[:, idx]
        auc = roc_auc_score(labels, probs) if labels.nunique() > 1 else 0.5
        aucs.append(auc)
        accs.append(accuracy_score(labels, pred))
        precs.append(precision_score(labels, pred, zero_division=0))
        recs.append(recall_score(labels, pred, zero_division=0))
        f1s.append(f1_score(labels, pred, zero_division=0))
    out["accuracy"] = round(float(np.mean(accs)), 4)
    out["precision"] = round(float(np.mean(precs)), 4)
    out["recall"] = round(float(np.mean(recs)), 4)
    out["f1"] = round(float(np.mean(f1s)), 4)
    out["roc_auc"] = round(float(np.mean(aucs)), 4)
    return out


def run_comparison() -> Dict[str, Dict[str, float]]:
    full = load_full_training_frame()
    X, y = full[FEATURE_COLUMNS], full[TARGET_COLUMNS]

    # Identical split to ml/model.py::train() — same random_state and
    # stratification key, so every candidate sees the same train/val rows.
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.20, random_state=42,
        stratify=(y["diabetes_label"].astype(str) + "_" + y["cardiovascular_label"].astype(str)
                  + "_" + y["hypertension_label"].astype(str)),
    )

    results: Dict[str, Dict[str, float]] = {}
    for name, factory in CANDIDATES.items():
        logger.info("Training %s ...", name)
        pipeline = factory()
        pipeline.fit(X_train, y_train)
        results[name] = _evaluate_per_target(pipeline, X_val, y_val)
        logger.info("%s: %s", name, results[name])
    return results


def _select_champion(results: Dict[str, Dict[str, float]]) -> str:
    # Selection criterion, stated explicitly per the audit requirement:
    # In a clinical screening context, missing a real positive case
    # (false negative) is costlier than a false alarm, so the champion is
    # chosen by ROC-AUC first (overall discriminative power, threshold-
    # independent) with Recall as the tiebreaker — not raw accuracy, which
    # rewards models that lean toward the majority class.
    ranked = sorted(results.items(), key=lambda kv: (kv[1]["roc_auc"], kv[1]["recall"]), reverse=True)
    return ranked[0][0]


def _write_report(results: Dict[str, Dict[str, float]], champion: str, n_train: int, n_val: int) -> None:
    lines = [
        "# MediGuard AI — Baseline Model Comparison",
        "",
        f"Generated by `python -m ml.baseline_comparison`. Train rows: {n_train}, "
        f"validation rows: {n_val} (80/20 split, `random_state=42`, stratified on "
        "diabetes/CVD/hypertension label combination — identical to the production "
        "training split in `ml/model.py::MediGuardMLModel.train()`).",
        "",
        "**Data note:** these numbers reflect whichever of the 5 real data sources "
        "(Pima, Cleveland Heart, cardio, Framingham, NHANES) are present under "
        "`backend/data/raw/` when this was run (see "
        "`data/processed/dataset_metadata.json` → `sources_used` / `sources_missing` "
        "for exactly which). Re-run this script if the set of available sources changes.",
        "",
        "## Selection criterion",
        "",
        "Ranked by **ROC-AUC** (threshold-independent discriminative power) first, "
        "**Recall** as tiebreaker — in a clinical screening tool, a missed real "
        "positive (false negative) is more costly than a false alarm, so recall is "
        "weighted above raw accuracy, which would reward a model that leans on the "
        "majority class.",
        "",
        "## Results (macro-averaged across diabetes_label + cardiovascular_label + hypertension_label)",
        "",
        "| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |",
        "|---|---|---|---|---|---|",
    ]
    for name, m in results.items():
        marker = " 🏆" if name == champion else ""
        lines.append(
            f"| {name}{marker} | {m['accuracy']:.4f} | {m['precision']:.4f} | "
            f"{m['recall']:.4f} | {m['f1']:.4f} | {m['roc_auc']:.4f} |"
        )
    lines += [
        "",
        f"**Selected: {champion}**",
        "",
        (
            "This matches the model already deployed in production "
            "(`ml/model.py::_make_pipeline()` uses XGBoost) — no production change "
            "needed."
            if champion.startswith("XGBoost")
            else (
                f"⚠️ **{champion} outperformed the production XGBoost pipeline on this "
                "run.** This comparison script does not auto-promote a new production "
                "model — `ml/model.py::_make_pipeline()` was intentionally left "
                "unchanged pending a deliberate human review before switching the "
                "production algorithm."
            )
        ),
    ]

    # Recall trade-off callout: only relevant when some non-champion candidate
    # has meaningfully higher recall than the champion — worth surfacing even
    # when champion selection didn't need a tiebreak, since it's a real
    # clinical trade-off a human might reasonably weigh differently than pure
    # AUC does. Only the single highest-recall alternative is surfaced, not
    # every candidate that clears the bar, to avoid redundant callouts.
    champ_recall = results[champion]["recall"]
    alternatives = [(name, m) for name, m in results.items() if name != champion]
    if alternatives:
        best_alt_name, best_alt = max(alternatives, key=lambda kv: kv[1]["recall"])
        if best_alt["recall"] > champ_recall + 0.02:  # >2pp higher recall is worth flagging
            lines += [
                "",
                f"**Trade-off worth noting explicitly:** {champion} wins on ROC-AUC "
                f"({results[champion]['roc_auc']:.4f} vs {best_alt['roc_auc']:.4f}), but "
                f"{best_alt_name} has meaningfully higher recall ({best_alt['recall']:.4f} vs "
                f"{champ_recall:.4f}). In a clinical screening context, higher recall "
                "means fewer missed real positive cases at the cost of more false "
                "alarms. If false negatives are judged more costly than the AUC gap "
                f"justifies, {best_alt_name} is a legitimate alternative — switch via "
                "`ML_ALGORITHM` in `.env` and retrain. This is a judgment call about "
                "acceptable trade-offs a clinician/stakeholder should make, not one "
                "this comparison script makes for you.",
            ]

    lines += [
        "",
        "## Reproduce",
        "",
        "```bash",
        "cd backend",
        "python -m ml.baseline_comparison",
        "```",
    ]
    DOCS_PATH.parent.mkdir(parents=True, exist_ok=True)
    DOCS_PATH.write_text("\n".join(lines))
    logger.info("Wrote %s", DOCS_PATH)


JSON_PATH = Path(__file__).resolve().parent / "artifacts" / "model_comparison.json"


def _write_json(results: Dict[str, Dict[str, float]], champion: str, n_train: int, n_val: int) -> None:
    import json as _json
    from datetime import datetime, timezone
    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "train_rows": n_train,
        "validation_rows": n_val,
        "selection_criterion": "roc_auc primary, recall tiebreak",
        "results": results,
        "champion": champion,
    }
    JSON_PATH.write_text(_json.dumps(payload, indent=2))
    logger.info("Wrote %s", JSON_PATH)


def main() -> None:
    full = load_full_training_frame()
    results = run_comparison()
    champion = _select_champion(results)
    n_val = int(round(len(full) * 0.20))
    n_train = len(full) - n_val
    _write_report(results, champion, n_train=n_train, n_val=n_val)
    _write_json(results, champion, n_train=n_train, n_val=n_val)


if __name__ == "__main__":
    main()
