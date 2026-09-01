"""
MediGuard AI — Automated Dataset Ingestion, Preprocessing, and MLOps Pipeline
==============================================================================
Script to automatically fetch real-world clinical datasets (Pima Diabetes, Cleveland Heart,
Cardio Train), clean and transform them into processed feature frames, save them to
backend/data/processed/, train the XGBoost disease model, and register the run in MLflow.

Usage:
  python scripts/dataset_pipeline.py --download --preprocess --train
"""

import os
import sys
import argparse
import urllib.request
import logging
from pathlib import Path

# Add parent directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ml.data_loader import (
    RAW_DIR,
    PROCESSED_DIR,
    load_kaggle_training_frame,
    save_processed,
    load_training_data,
)
from ml.model import get_model

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("dataset_pipeline")

# Direct public URLs for baseline datasets if local Kaggle raw CSVs are not pre-downloaded
DATASET_URLS = {
    "pima": {
        "url": "https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.csv",
        "dest": RAW_DIR / "pima" / "diabetes.csv",
    },
    "heart": {
        "url": "https://raw.githubusercontent.com/dsrscientist/dataset1/master/heart_disease.csv",
        "dest": RAW_DIR / "heart" / "heart_cleveland_upload.csv",
    },
}


def download_datasets(force: bool = False):
    """Download baseline datasets from open-access mirrors if missing."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for key, cfg in DATASET_URLS.items():
        dest: Path = cfg["dest"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists() and not force:
            logger.info("Dataset %s already exists at %s", key, dest)
            continue
        try:
            logger.info("Downloading %s dataset from %s...", key, cfg["url"])
            urllib.request.urlretrieve(cfg["url"], str(dest))
            logger.info("Saved %s to %s (%d bytes)", key, dest, dest.stat().st_size)
        except Exception as e:
            logger.error("Failed to download %s: %s", key, e)


def preprocess_and_store():
    """Run data transformation pipeline and store clean dataset in data/processed."""
    logger.info("Ingesting and transforming raw datasets...")
    df = load_kaggle_training_frame(require_all=False)
    train_path, test_path, meta_path = save_processed(df)
    logger.info("Processed dataset stored successfully:")
    logger.info(" - Train set: %s", train_path)
    logger.info(" - Test set:  %s", test_path)
    logger.info(" - Metadata:  %s", meta_path)
    return df


def train_and_register():
    """Train XGBoost model on processed dataset and log to MLflow."""
    logger.info("Training multi-output XGBoost disease model...")
    X, y = load_training_data()
    model = get_model()
    metrics = model.train(X=X, y=y, force_replace=True)
    logger.info("Model training finished. MLflow Metrics:")
    for k, v in metrics.items():
        logger.info("  - %s: %s", k, v)
    return metrics


def main():
    parser = argparse.ArgumentParser(description="MediGuard AI Dataset Pipeline")
    parser.add_argument("--download", action="store_true", help="Download raw open datasets")
    parser.add_argument("--preprocess", action="store_true", help="Clean raw datasets and save to processed/")
    parser.add_argument("--train", action="store_true", help="Train XGBoost model and log to MLflow")
    parser.add_argument("--all", action="store_true", help="Run download, preprocess, and train")
    args = parser.parse_args()

    if args.all or (not args.download and not args.preprocess and not args.train):
        args.download = True
        args.preprocess = True
        args.train = True

    if args.download:
        download_datasets()
    if args.preprocess:
        preprocess_and_store()
    if args.train:
        train_and_register()

    logger.info("Pipeline execution complete.")


if __name__ == "__main__":
    main()
