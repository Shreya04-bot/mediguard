"""
MediGuard AI — Guideline Metadata & Version Registry
=======================================================
Tracks provenance for every file in backend/data/guidelines/, separately
from the Chroma vector index itself (rag/retriever.py) and separately
from ML training data (ml/data_loader.py — guideline *knowledge* and
model *training data* are different things and must not be conflated).

For every guideline document we record:
    - name              human-readable title
    - category          e.g. "diabetes", "hypertension", "cvd"
    - source            issuing body, e.g. "ICMR"
    - source_url        where it was downloaded from
    - version            e.g. "2018", "2024 update"
    - publication_date   as published by the issuing body
    - last_checked        last time this repo checked the source for a
                           newer version (manual — see RAG_SETUP.md)
    - document_hash        sha256 of the file, to detect silent edits
    - indexed_date          when `python -m rag.ingest` last embedded it
    - status                "active" | "outdated" | "pending_review"

This module manages backend/data/guidelines/guideline_registry.json.
It does NOT download anything — see RAG_SETUP.md and
rag/ingest.py::fetch_pubmed_abstracts for the two paths that actually
fetch content (manual curl instructions, and the optional PubMed API).
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

GUIDELINES_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "guidelines")
REGISTRY_PATH = os.path.join(GUIDELINES_DIR, "guideline_registry.json")


@dataclass
class GuidelineRecord:
    filename: str
    name: str = ""
    category: str = "uncategorized"
    source: str = "unknown"
    source_url: str = ""
    version: str = ""
    publication_date: str = ""
    last_checked: str = ""
    document_hash: str = ""
    indexed_date: str = ""
    status: str = "pending_review"


def _hash_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_registry() -> Dict[str, GuidelineRecord]:
    if not os.path.exists(REGISTRY_PATH):
        return {}
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return {k: GuidelineRecord(**v) for k, v in raw.items()}


def save_registry(records: Dict[str, GuidelineRecord]) -> None:
    os.makedirs(GUIDELINES_DIR, exist_ok=True)
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump({k: asdict(v) for k, v in records.items()}, f, indent=2)


def sync_registry_with_filesystem() -> Dict[str, GuidelineRecord]:
    """
    Reconciles guideline_registry.json against what's actually on disk in
    data/guidelines/. Called by `rag.ingest` on every run so the registry
    never drifts from reality:
      - new .txt/.pdf files get a stub record (status=pending_review) an
        admin should fill in with real source/version metadata
      - files whose content hash changed get document_hash refreshed and
        status reset to pending_review (someone swapped the file — don't
        silently keep old metadata that may no longer be accurate)
      - records for files that no longer exist are dropped
    """
    records = load_registry()
    on_disk = set()

    if os.path.isdir(GUIDELINES_DIR):
        for fname in sorted(os.listdir(GUIDELINES_DIR)):
            if not fname.endswith((".txt", ".pdf")):
                continue
            on_disk.add(fname)
            fpath = os.path.join(GUIDELINES_DIR, fname)
            new_hash = _hash_file(fpath)

            if fname not in records:
                records[fname] = GuidelineRecord(
                    filename=fname,
                    name=fname,
                    document_hash=new_hash,
                    indexed_date=_now(),
                    status="pending_review",
                )
                logger.info("Guideline registry: new file %s — status=pending_review, "
                            "fill in source/version metadata.", fname)
            elif records[fname].document_hash != new_hash:
                logger.warning("Guideline registry: %s content changed since last index — "
                                "resetting to pending_review.", fname)
                records[fname].document_hash = new_hash
                records[fname].indexed_date = _now()
                records[fname].status = "pending_review"
            else:
                records[fname].indexed_date = _now()

    removed = [f for f in records if f not in on_disk]
    for f in removed:
        del records[f]
        logger.info("Guideline registry: removed stale entry for deleted file %s.", f)

    save_registry(records)
    return records


def update_metadata(filename: str, **fields) -> GuidelineRecord:
    """Admin-facing: set name/category/source/source_url/version/
    publication_date/status for a guideline file already on disk. Does
    NOT touch document_hash/indexed_date — those are filesystem-derived."""
    records = load_registry()
    if filename not in records:
        raise KeyError(f"No guideline registry entry for {filename!r}. "
                        f"Run rag.ingest first so it's picked up from disk.")
    record = records[filename]
    for key, value in fields.items():
        if hasattr(record, key) and key not in ("filename", "document_hash", "indexed_date"):
            setattr(record, key, value)
    record.last_checked = _now()
    save_registry(records)
    return record


def registry_status() -> Dict:
    """Summary used by the admin-facing RAG status endpoint."""
    records = load_registry()
    guideline_files_present = os.path.isdir(GUIDELINES_DIR) and any(
        f.endswith((".txt", ".pdf")) for f in os.listdir(GUIDELINES_DIR)
    )
    return {
        "corpus_populated": guideline_files_present,
        "document_count": len(records),
        "documents": [asdict(r) for r in records.values()],
        "pending_review_count": sum(1 for r in records.values() if r.status == "pending_review"),
        "message": (
            "Real guideline documents are indexed."
            if guideline_files_present
            else "backend/data/guidelines/ is empty — RAG is currently serving 4 "
                 "built-in guideline summaries, not indexed source documents. "
                 "See RAG_SETUP.md."
        ),
    }
