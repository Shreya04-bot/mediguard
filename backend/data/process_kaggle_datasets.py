"""Process local Kaggle CSV exports into the MediGuard training schema."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ml.data_loader import load_kaggle_training_frame, save_processed

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def process() -> None:
    df = load_kaggle_training_frame()
    train_path, test_path, metadata_path = save_processed(df)
    logger.info("Kaggle-only dataset processed.")
    logger.info("Train: %s", train_path)
    logger.info("Test: %s", test_path)
    logger.info("Metadata: %s", metadata_path)


if __name__ == "__main__":
    process()
