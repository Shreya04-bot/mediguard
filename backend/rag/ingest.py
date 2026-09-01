"""
MediGuard AI — RAG Guideline Ingestion CLI
==============================================
Run this after adding/removing files in backend/data/guidelines/ to
rebuild the Chroma index:

    python -m rag.ingest

Optional: pull supplementary abstracts from PubMed's free E-utilities
API for specific clinical topics (same public API already used in
ayurveda/herb_recommender.py's evidence lookup):

    python -m rag.ingest --pubmed-topics "type 2 diabetes management" "hypertension treatment guidelines"

See RAG_SETUP.md for where to get real guideline PDFs and how this
fits together end to end.
"""

from __future__ import annotations

import argparse
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("rag.ingest")


def fetch_pubmed_abstracts(topic: str, max_results: int = 5) -> list[str]:
    """
    Pulls recent abstracts for a topic from PubMed's free E-utilities API
    (no API key required, rate-limited to ~3 req/sec without one).
    Returns a list of "Title. Abstract text." strings ready to be
    chunked and indexed alongside the guideline documents.
    """
    import requests

    search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    fetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

    try:
        search_resp = requests.get(search_url, params={
            "db": "pubmed", "term": topic, "retmax": max_results,
            "sort": "relevance", "retmode": "json",
        }, timeout=10)
        search_resp.raise_for_status()
        ids = search_resp.json().get("esearchresult", {}).get("idlist", [])
        if not ids:
            logger.warning("PubMed: no results for %r", topic)
            return []

        fetch_resp = requests.get(fetch_url, params={
            "db": "pubmed", "id": ",".join(ids), "rettype": "abstract", "retmode": "text",
        }, timeout=15)
        fetch_resp.raise_for_status()
        raw = fetch_resp.text.strip()
        # E-utilities separates records with blank-line-delimited blocks;
        # keep each as its own chunk rather than one giant blob.
        records = [r.strip() for r in raw.split("\n\n\n") if r.strip()]
        logger.info("PubMed: fetched %d abstract(s) for %r", len(records), topic)
        return records
    except requests.RequestException as exc:
        logger.warning("PubMed fetch failed for %r: %s (continuing without it — this is optional enrichment)", topic, exc)
        return []


def main():
    parser = argparse.ArgumentParser(description="Rebuild the MediGuard AI RAG guideline index.")
    parser.add_argument(
        "--pubmed-topics", nargs="*", default=[],
        help="Optional: clinical topics to pull supplementary PubMed abstracts for, e.g. "
             '--pubmed-topics "type 2 diabetes management" "hypertension treatment guidelines"',
    )
    args = parser.parse_args()

    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

    from rag.retriever import GUIDELINES_DIR, rebuild_index
    from rag.guideline_registry import sync_registry_with_filesystem

    if args.pubmed_topics:
        os.makedirs(GUIDELINES_DIR, exist_ok=True)
        for topic in args.pubmed_topics:
            abstracts = fetch_pubmed_abstracts(topic)
            if not abstracts:
                continue
            safe_name = "".join(c if c.isalnum() else "_" for c in topic.lower())[:60]
            out_path = os.path.join(GUIDELINES_DIR, f"pubmed_{safe_name}.txt")
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(f"PubMed abstracts — topic: {topic}\n\n" + "\n\n---\n\n".join(abstracts))
            logger.info("Wrote %s", out_path)

    logger.info("Rebuilding Chroma index from %s ...", GUIDELINES_DIR)
    count = rebuild_index()
    logger.info("Done. Indexed %d chunk(s).", count)

    registry = sync_registry_with_filesystem()
    pending = [f for f, r in registry.items() if r.status == "pending_review"]
    if pending:
        logger.warning(
            "Guideline registry: %d file(s) need source/version metadata filled in "
            "(status=pending_review): %s. Use "
            "rag.guideline_registry.update_metadata(filename, source=..., "
            "source_url=..., version=..., publication_date=...).",
            len(pending), ", ".join(pending),
        )

    if count <= 6:
        logger.warning(
            "Only a handful of chunks indexed — you're likely still running on the "
            "built-in summaries. See RAG_SETUP.md to add real guideline documents "
            "to %s.", GUIDELINES_DIR,
        )


if __name__ == "__main__":
    main()
