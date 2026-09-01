"""
MediGuard AI — RAG Retriever Tests

Exercises the real Chroma + fallback-embedding pipeline (no mocking of
Chroma itself) since these are the actual mechanics that matter — only
the HuggingFace model download (network-dependent) is out of scope for
a repeatable test, and the code already falls back to TF-IDF when that
download fails, which is exactly what's tested here.
"""

import os
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest


@pytest.fixture(autouse=True)
def clean_state(monkeypatch):
    """
    Isolates each test with its own, genuinely unique Chroma persist dir
    and guidelines dir (via tempfile.mkdtemp(), not a shared fixed path).

    A shared fixed path was tried first and didn't work even after
    calling chromadb's SharedSystemClient.clear_system_cache() between
    tests — some part of chromadb 0.5.0's in-process state evidently
    survives that call too. Using a unique path per test avoids the
    problem entirely rather than fighting chromadb's caching further,
    and is arguably better test isolation regardless.
    """
    import rag.retriever as retriever_module
    from chromadb.api.client import SharedSystemClient

    chroma_dir = tempfile.mkdtemp(prefix="mediguard_test_chroma_")
    guidelines_dir = tempfile.mkdtemp(prefix="mediguard_test_guidelines_")

    monkeypatch.setattr("utils.config.settings.chroma_persist_dir", chroma_dir)
    monkeypatch.setattr(retriever_module, "GUIDELINES_DIR", guidelines_dir)
    retriever_module._retriever = None
    SharedSystemClient.clear_system_cache()

    yield guidelines_dir

    shutil.rmtree(chroma_dir, ignore_errors=True)
    shutil.rmtree(guidelines_dir, ignore_errors=True)
    retriever_module._retriever = None
    SharedSystemClient.clear_system_cache()
    SharedSystemClient.clear_system_cache()


def test_tfidf_fallback_embeddings_work_standalone():
    """The offline fallback embedding is a real, working Embeddings
    implementation — not a stub that returns zeros or raises."""
    from rag.retriever import TfidfFallbackEmbeddings

    emb = TfidfFallbackEmbeddings()
    docs = ["diabetes management guideline", "hypertension blood pressure treatment", "unrelated cooking recipe"]
    vectors = emb.embed_documents(docs)
    assert len(vectors) == 3
    assert all(len(v) > 0 for v in vectors)

    query_vec = emb.embed_query("blood pressure treatment guideline")
    assert len(query_vec) == len(vectors[0])


def test_retriever_falls_back_to_builtin_guidelines_when_dir_empty():
    """With no files in the guidelines dir, the retriever should still
    work — using the built-in summaries, not silently returning nothing."""
    from rag.retriever import get_retriever

    retriever = get_retriever()
    docs = retriever.invoke("target blood pressure for diabetics")
    assert len(docs) > 0
    assert any("hypertension" in d.page_content.lower() or "blood pressure" in d.page_content.lower() for d in docs)


def test_retriever_loads_real_txt_guideline_file(clean_state):
    """Adding a real .txt file to the guidelines directory should be
    picked up and chunked, not ignored in favor of the built-ins."""
    with open(os.path.join(clean_state, "test_guideline.txt"), "w") as f:
        f.write(
            "Test Clinical Guideline for Xanthine Overdose Management:\n"
            "Diagnosis requires serum xanthine levels above 400 units.\n"
            "First-line treatment is intravenous hydration and activated charcoal.\n"
            "Refer to toxicology if levels exceed 800 units or symptoms of arrhythmia present.\n"
        )

    from rag.retriever import get_retriever

    retriever = get_retriever()
    docs = retriever.invoke("xanthine overdose treatment")
    assert len(docs) > 0
    assert any("xanthine" in d.page_content.lower() for d in docs)
    assert any(d.metadata.get("source") == "test_guideline.txt" for d in docs)


def test_retriever_persists_and_reloads_across_process_restart(clean_state):
    """Simulates a server restart: build the index, discard the in-memory
    retriever reference, then confirm a fresh get_retriever() call loads
    the persisted store rather than silently returning empty results."""
    with open(os.path.join(clean_state, "persist_test.txt"), "w") as f:
        f.write("Persistence Test Guideline: Rare condition Zylophagia requires weekly monitoring.\n")

    import rag.retriever as retriever_module

    first = retriever_module.get_retriever()
    first.invoke("zylophagia")  # forces index build

    # Simulate restart: drop the cached retriever, but keep the persisted files.
    retriever_module._retriever = None

    second = retriever_module.get_retriever()
    docs = second.invoke("zylophagia monitoring")
    assert len(docs) > 0
    assert any("zylophagia" in d.page_content.lower() for d in docs)


def test_rebuild_index_reflects_updated_guideline_files(clean_state):
    """rag.ingest's rebuild_index() should fully replace the index, not
    append to stale data — verified by removing a file and confirming
    its content is no longer retrievable after rebuild."""
    from rag.retriever import rebuild_index, get_retriever
    import rag.retriever as retriever_module

    path_a = os.path.join(clean_state, "a.txt")
    with open(path_a, "w") as f:
        f.write("Guideline about Kryptonite Poisoning: avoid green rocks entirely.\n")

    count_1 = rebuild_index()
    assert count_1 >= 1
    docs = get_retriever().invoke("kryptonite poisoning")
    assert any("kryptonite" in d.page_content.lower() for d in docs)

    os.remove(path_a)
    retriever_module._retriever = None
    count_2 = rebuild_index()

    docs_after = get_retriever().invoke("kryptonite poisoning")
    # Built-in fallback guidelines don't mention kryptonite, so after removing
    # the only file that did and rebuilding, it should no longer surface.
    assert not any("kryptonite" in d.page_content.lower() for d in docs_after)
