"""Deprecated: use process_kaggle_datasets.py.

MediGuard AI now allows Kaggle datasets only. This file is retained as a
compatibility entry point and delegates to the strict Kaggle processor.
"""

from __future__ import annotations

from data.process_kaggle_datasets import process


if __name__ == "__main__":
    process()
