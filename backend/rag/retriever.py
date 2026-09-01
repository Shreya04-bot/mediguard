"""
MediGuard AI — RAG Retriever
==============================
Chroma vector database over clinical guideline documents, grounding
`/ai/chat` and the LangGraph agents' RAGAgent node.

Embeddings: HuggingFace sentence-transformers (all-MiniLM-L6-v2) is the
primary embedding backend — best retrieval quality, but requires
network access to huggingface.co the first time it runs (to download
~90MB of model weights; cached locally after that, no network needed
again).

If that download fails (offline environment, firewalled network,
etc.), this module automatically falls back to a real TF-IDF-based
embedding (scikit-learn, already a project dependency, zero external
downloads) rather than disabling RAG entirely. Retrieval quality is
lower with TF-IDF (lexical overlap, not semantic similarity) but it is
a genuine, working retrieval path — not a stub — so `/ai/chat` and the
RAGAgent are never silently running with zero guideline grounding just
because a model download failed once.

See RAG_SETUP.md for how to add real guideline documents and rebuild
the index.
"""

from __future__ import annotations

import logging
import os
import pickle
from typing import List, Optional

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_core.vectorstores import VectorStoreRetriever

from utils.config import settings

logger = logging.getLogger(__name__)

_retriever: Optional[VectorStoreRetriever] = None
GUIDELINES_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "guidelines")
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


# ---------------------------------------------------------------------------
# Offline fallback embedding — real, not a stub
# ---------------------------------------------------------------------------

class TfidfFallbackEmbeddings(Embeddings):
    """
    A genuine embedding backend with zero external downloads: fits a
    scikit-learn TF-IDF vectorizer over the guideline corpus at index
    build time, and projects queries into the same space at query time.

    This is not semantic similarity (won't catch "high blood sugar"
    matching a chunk about "hyperglycemia" the way a real sentence
    embedding would) — but it correctly retrieves guideline chunks that
    share vocabulary with the query, which is a meaningful fraction of
    real clinical questions ("what's the target HbA1c for diabetics"
    shares real words with the guideline text). Used automatically only
    if the HuggingFace embedding model can't be downloaded.
    """

    def __init__(self):
        from sklearn.feature_extraction.text import TfidfVectorizer
        self._vectorizer = TfidfVectorizer(max_features=4096, stop_words="english")
        self._fitted = False

    def fit(self, texts: List[str]) -> None:
        self._vectorizer.fit(texts)
        self._fitted = True

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not self._fitted:
            self.fit(texts)
        return self._vectorizer.transform(texts).toarray().tolist()

    def embed_query(self, text: str) -> List[float]:
        if not self._fitted:
            raise RuntimeError("TfidfFallbackEmbeddings must be fitted on the corpus before querying.")
        return self._vectorizer.transform([text]).toarray().tolist()[0]


def _get_embeddings() -> Embeddings:
    """
    Tries the real sentence-transformer embedding first; falls back to
    TF-IDF if the model can't be downloaded. The failure is logged
    loudly (not swallowed silently) since retrieval quality genuinely
    differs between the two paths — an operator should know which one
    is active.
    """
    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model, model_kwargs={"device": "cpu"})
        # Force the actual download/load now rather than lazily on first
        # query, so we detect failure here and fall back cleanly instead
        # of raising mid-request later.
        embeddings.embed_query("connectivity check")
        logger.info("RAG: using real sentence-transformer embeddings (%s).", settings.embedding_model)
        return embeddings
    except Exception as exc:
        logger.warning(
            "RAG: could not load HuggingFace embedding model %s (%s). "
            "Falling back to TF-IDF embeddings — retrieval will still work, "
            "but with lexical rather than semantic matching. See RAG_SETUP.md "
            "to fix this (usually just needs network access to huggingface.co "
            "on first run).",
            settings.embedding_model, exc,
        )
        return TfidfFallbackEmbeddings()


# ---------------------------------------------------------------------------
# Document loading
# ---------------------------------------------------------------------------

def _chunk_text(text: str, source: str) -> List[Document]:
    """Simple fixed-size chunking with overlap — no extra dependency
    beyond what's already installed, good enough for guideline-length
    documents (a few to a few hundred pages)."""
    text = text.strip()
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(Document(page_content=chunk, metadata={"source": source, "type": "guideline"}))
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def _load_guideline_docs() -> List[Document]:
    """
    Loads every .txt and .pdf file from backend/data/guidelines/,
    chunked for retrieval. Falls back to a small set of built-in
    summaries only if that directory is empty — see RAG_SETUP.md for
    how to add real guideline documents.
    """
    docs: List[Document] = []

    if os.path.isdir(GUIDELINES_DIR):
        for fname in sorted(os.listdir(GUIDELINES_DIR)):
            fpath = os.path.join(GUIDELINES_DIR, fname)
            if fname.endswith(".txt"):
                with open(fpath, "r", encoding="utf-8") as f:
                    docs.extend(_chunk_text(f.read(), fname))
            elif fname.endswith(".pdf"):
                try:
                    from pypdf import PdfReader
                    reader = PdfReader(fpath)
                    text = "\n".join(page.extract_text() or "" for page in reader.pages)
                    docs.extend(_chunk_text(text, fname))
                except Exception as exc:
                    logger.warning("Could not parse guideline PDF %s: %s", fname, exc)
        if docs:
            logger.info("RAG: loaded %d chunks from %d file(s) in %s.",
                        len(docs), len([f for f in os.listdir(GUIDELINES_DIR) if f.endswith((".txt", ".pdf"))]), GUIDELINES_DIR)

    if not docs:
        logger.info("RAG: no guideline files found in %s — using built-in summaries. "
                     "See RAG_SETUP.md to add real guideline documents.", GUIDELINES_DIR)
        docs = _builtin_guidelines()

    return docs


def _builtin_guidelines() -> List[Document]:
    """Minimal built-in guideline summaries, used only when
    backend/data/guidelines/ is empty. Not a substitute for real source
    documents — see RAG_SETUP.md."""
    return [
        Document(
            page_content=(
                "ICMR Standard Treatment Workflow — Type 2 Diabetes Mellitus (2024):\n"
                "Diagnosis: FBG ≥126 mg/dL or 2h PG ≥200 mg/dL or HbA1c ≥6.5%.\n"
                "First-line: Metformin + lifestyle modification (diet + 150 min/week exercise).\n"
                "Target: HbA1c <7%, FBG 80-130 mg/dL, PP <180 mg/dL.\n"
                "Screening: annual FBG for high-risk individuals (obese, family history, age >45).\n"
                "Refer to diabetologist if HbA1c >9% or complications present."
            ),
            metadata={"source": "ICMR_DM_STW_2024 (built-in summary)", "type": "guideline"},
        ),
        Document(
            page_content=(
                "InSH Consensus Guidelines for Hypertension Management (2025):\n"
                "Diagnosis: BP ≥140/90 mmHg on two separate visits.\n"
                "Stage 1 HTN: 130-139/80-89 mmHg — lifestyle modification for 3 months.\n"
                "Stage 2 HTN: ≥140/90 mmHg — immediate pharmacotherapy + lifestyle.\n"
                "First-line agents: ACE inhibitors / ARBs for diabetic patients.\n"
                "Target BP: <130/80 mmHg for diabetics and CVD risk patients.\n"
                "Sodium restriction <5g/day, DASH diet recommended."
            ),
            metadata={"source": "InSH_HTN_Guidelines_2025 (built-in summary)", "type": "guideline"},
        ),
        Document(
            page_content=(
                "Cardiovascular Risk Reduction — Indian Guidelines:\n"
                "Primary prevention: statin therapy for LDL >190 mg/dL or 10-yr CVD risk >7.5%.\n"
                "Smoking cessation mandatory — doubles CVD mortality risk.\n"
                "Physical activity: ≥150 min moderate-intensity aerobic/week reduces CVD risk 30-35%.\n"
                "Diabetes + HTN comorbidity: 3-5× increased CVD risk — aggressive BP + glucose control.\n"
                "Aspirin: low-dose (75-100 mg) for high CVD risk patients after physician evaluation.\n"
                "Referral to cardiologist: chest pain, dyspnea, ECG abnormalities, LDL >300."
            ),
            metadata={"source": "India_CVD_Prevention_Guidelines (built-in summary)", "type": "guideline"},
        ),
        Document(
            page_content=(
                "Lifestyle Modification Guidelines (ICMR/InSH):\n"
                "Diet: low glycaemic index foods, reduce saturated fats, increase fibre >25g/day.\n"
                "Physical activity: 30 min/day × 5 days/week — walking, cycling, or swimming.\n"
                "Weight: BMI target 18.5-22.9 for South Asian populations.\n"
                "Alcohol: limit to <2 units/day — increases triglycerides and BP.\n"
                "Stress management: yoga, meditation shown effective in Indian population studies.\n"
                "Sleep: 7-8 hours — poor sleep associated with insulin resistance."
            ),
            metadata={"source": "Lifestyle_Modification_Guidelines (built-in summary)", "type": "guideline"},
        ),
    ]


# ---------------------------------------------------------------------------
# Chroma vector store
# ---------------------------------------------------------------------------

def _disable_chroma_telemetry() -> None:
    # Chroma's default telemetry (PostHog) is disabled — not needed for a
    # local vector store. Set via env var rather than a client_settings=
    # object passed to Chroma()/Chroma.from_documents(): passing
    # client_settings explicitly bypasses langchain's own logic that sets
    # is_persistent=True when only persist_directory is given (see
    # langchain_community.vectorstores.Chroma.__init__). Without that flag,
    # chromadb's SharedSystemClient treats the store as "ephemeral" — a
    # single shared in-memory identifier, not one keyed by persist_directory
    # — so unrelated Chroma instances (different paths, different
    # processes) can collide on the same in-memory collection. Confirmed via
    # direct inspection of chromadb.api.client.SharedSystemClient's
    # identifier logic while chasing down a real InvalidDimensionException
    # this caused across sequential test runs.
    os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")


def get_retriever() -> VectorStoreRetriever:
    global _retriever
    if _retriever is not None:
        return _retriever

    from langchain_community.vectorstores import Chroma

    logger.info("Initialising Chroma vector store...")
    embeddings = _get_embeddings()

    persist_dir = settings.chroma_persist_dir
    os.makedirs(persist_dir, exist_ok=True)

    # If we fell back to TF-IDF, the vectorizer's vocabulary is fit at
    # index-build time and must be persisted alongside the Chroma store —
    # a fresh, unfitted TfidfVectorizer can't reproduce the same vector
    # space on the next process start.
    tfidf_state_path = os.path.join(persist_dir, "tfidf_fallback.pkl")

    existing_store = os.path.exists(os.path.join(persist_dir, "chroma.sqlite3"))

    if isinstance(embeddings, TfidfFallbackEmbeddings) and existing_store and os.path.exists(tfidf_state_path):
        with open(tfidf_state_path, "rb") as f:
            embeddings._vectorizer = pickle.load(f)
            embeddings._fitted = True

    _disable_chroma_telemetry()

    if existing_store:
        vectorstore = Chroma(
            persist_directory=persist_dir,
            embedding_function=embeddings,
            collection_name="mediguard_guidelines",
        )
        logger.info("RAG: loaded existing Chroma store from %s", persist_dir)
    else:
        docs = _load_guideline_docs()
        if isinstance(embeddings, TfidfFallbackEmbeddings):
            embeddings.fit([d.page_content for d in docs])
            with open(tfidf_state_path, "wb") as f:
                pickle.dump(embeddings._vectorizer, f)

        vectorstore = Chroma.from_documents(
            documents=docs,
            embedding=embeddings,
            persist_directory=persist_dir,
            collection_name="mediguard_guidelines",
        )
        logger.info("RAG: built new Chroma store with %d chunks.", len(docs))

    _retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": settings.rag_top_k},
    )
    return _retriever


def add_documents(docs: List[Document]) -> None:
    """Add new guideline documents to the existing vector store."""
    retriever = get_retriever()
    retriever.vectorstore.add_documents(docs)
    logger.info("RAG: added %d documents to Chroma.", len(docs))


def rebuild_index() -> int:
    """
    Force a full rebuild of the Chroma index from
    backend/data/guidelines/ — used by `python -m rag.ingest` after
    adding/removing guideline files. Returns the number of chunks
    indexed.

    Safe to call multiple times within the same process (e.g. from an
    admin "reingest" action without restarting the server) — chromadb
    caches PersistentClient state in-process, keyed by persist_directory
    path, so deleting that directory on disk alone leaves a stale
    cached client that still thinks the old (now-deleted) collection
    exists with its old embedding dimension. The next write attempt
    then fails with InvalidDimensionException even though the on-disk
    store is gone. Clearing chromadb's system cache avoids this.
    """
    global _retriever
    import shutil
    from chromadb.api.client import SharedSystemClient

    persist_dir = settings.chroma_persist_dir
    if os.path.isdir(persist_dir):
        shutil.rmtree(persist_dir)
    SharedSystemClient.clear_system_cache()
    _retriever = None

    retriever = get_retriever()
    return retriever.vectorstore._collection.count()
