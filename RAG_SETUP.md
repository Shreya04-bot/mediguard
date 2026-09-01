# RAG Guideline Setup — ChromaDB is required, not optional

MediGuard AI's `/ai/chat` endpoint and the LangGraph clinical agents
(`RAGAgent` node) are grounded in real clinical guideline documents via
a Chroma vector store. This is a required part of the platform, not an
optional add-on — this doc covers how to set it up properly.

## Current corpus status

As of this build, `backend/data/guidelines/` contains **3 real, sourced
guideline documents** (own-words summaries of official government/WHO
publications, not verbatim copies — see the note at the top of each
file):

| File | Source | Version | Category |
|---|---|---|---|
| `icmr_type2_diabetes_2018.txt` | Indian Council of Medical Research (ICMR) | 2018 | diabetes |
| `who_hypertension_2021.txt` | World Health Organization (WHO), CC BY-NC-SA 3.0 IGO | 2021 | hypertension |
| `who_cvd_risk_2019.txt` | World Health Organization / Lancet Global Health, CC BY 4.0 | 2019/2020 | cardiovascular |

Run `GET /admin/rag-status` (admin auth required) to confirm this live —
it reports `corpus_populated: true` and lists all three documents'
metadata from the registry (`rag/guideline_registry.py`).

**Note on scope:** `who_cvd_risk_2019.txt` is narrower than the other two
— it's composed from the published abstract/methods/findings of the
underlying paper plus the publicly described scope of the WHO HEARTS
package, not from either document's full text (which this session
couldn't retrieve — both `iris.who.int` and `pmc.ncbi.nlm.nih.gov`
blocked automated access). It covers the risk-stratification *approach*
rather than a complete clinical management protocol. See the note at the
top of the file for what it does and doesn't cover, and consult the
cited sources directly for full clinical detail.

## How it works (already built, no code changes needed)

```
backend/data/guidelines/*.txt, *.pdf   (you add real documents here)
              │
              ▼
   python -m rag.ingest                (chunks + embeds + indexes)
              │
              ▼
   backend/data/chroma_db/             (persisted vector store)
              │
              ▼
   /ai/chat, RAGAgent retrieve top-k relevant chunks at query time
```

**Embeddings**: `sentence-transformers/all-MiniLM-L6-v2` (real semantic
embeddings) is the primary backend. If it can't download on first run
(offline environment, firewalled network), `rag/retriever.py`
**automatically falls back to a real TF-IDF embedding** (scikit-learn,
zero external downloads) rather than disabling retrieval — RAG always
does something real, never silently returns nothing. The fallback is
logged loudly so you know which one is active; check your backend logs
for `RAG: using real sentence-transformer embeddings` vs. `RAG: ...
Falling back to TF-IDF embeddings`.

## Step 1 — Download real guideline documents

These are real, publicly available, verified-working sources (checked
at the time this doc was written — re-verify the URL if it's been a
while, organizations do restructure their sites):

| Document | Source | License | Direct link |
|---|---|---|---|
| ICMR Guidelines for Management of Type 2 Diabetes (2018) | Indian Council of Medical Research | Government of India publication | `https://main.icmr.nic.in/sites/default/files/guidelines/ICMR_GuidelinesType2diabetes2018_0.pdf` |
| WHO Guideline for the Pharmacological Treatment of Hypertension in Adults (2021) | World Health Organization | CC BY-NC-SA 3.0 IGO | `https://www.who.int/publications/i/item/9789240033986` (PDF linked from that page) |

Both were fetched and verified as real, complete documents while
writing this guide (73 pages and full guideline text respectively, not
dead links or paywalled stubs).

**To find more**: search `<organization> <condition> guideline PDF
site:<org's official domain>` — prioritize the organization's own
domain (who.int, icmr.gov.in/icmr.nic.in, ada.org for the American
Diabetes Association's Standards of Care, ahajournals.org /
acc.org for AHA/ACC cardiovascular guidelines) over aggregator sites,
which sometimes host outdated or altered copies. Check the license on
each document — WHO's IGO license and most government-published
guidelines (ICMR included) are reusable for a purpose like this;
verify before adding anything from a source with unclear terms.

```bash
cd backend
mkdir -p data/guidelines
curl -o data/guidelines/icmr_diabetes_2018.pdf \
  "https://main.icmr.nic.in/sites/default/files/guidelines/ICMR_GuidelinesType2diabetes2018_0.pdf"
# WHO's PDF link is served from apps.who.int/iris — grab the direct
# link from the publications page above, it occasionally changes:
curl -o data/guidelines/who_hypertension_2021.pdf \
  "https://iris.who.int/server/api/core/bitstreams/f062769d-f075-4a00-87af-0a2106e0bd04/content"
```

## Step 2 — Where to store them

**`backend/data/guidelines/`** — exactly that directory, `.txt` or
`.pdf` files, any filename. This directory doesn't exist by default
(create it as shown above); when empty, `rag/retriever.py` falls back
to 4 small built-in guideline summaries so the system still works out
of the box, but real documents give real retrieval quality.

## Step 3 — Build the index

```bash
cd backend
python -m rag.ingest
```

This chunks every file in `data/guidelines/` (800 chars/chunk, 100 char
overlap), embeds them, and persists the result to
`data/chroma_db/` (configurable via `CHROMA_PERSIST_DIR` in `.env`).
Re-run this any time you add or remove guideline files — it does a
full rebuild, not an incremental update.

Expected output:
```
INFO: Rebuilding Chroma index from .../data/guidelines ...
INFO: RAG: using real sentence-transformer embeddings (sentence-transformers/all-MiniLM-L6-v2).
INFO: RAG: loaded 94 chunks from 2 file(s) in .../data/guidelines.
INFO: RAG: built new Chroma store with 94 chunks.
INFO: Done. Indexed 94 chunk(s).
```

If you see `Falling back to TF-IDF embeddings` instead of `using real
sentence-transformer embeddings`, the model download failed — check
your network can reach `huggingface.co`. Retrieval still works either
way, just with lexical rather than semantic matching until that's
fixed.

Every run also syncs `data/guidelines/guideline_registry.json` — a
metadata record per file (name, category, source, source URL, version,
publication date, last checked, content hash, indexed date, status).
New files get a `pending_review` stub automatically; fill in the real
metadata via:

```python
from rag.guideline_registry import update_metadata
update_metadata(
    "icmr_diabetes_2018.pdf",
    name="ICMR Guidelines for Management of Type 2 Diabetes",
    category="diabetes",
    source="ICMR",
    source_url="https://main.icmr.nic.in/sites/default/files/guidelines/ICMR_GuidelinesType2diabetes2018_0.pdf",
    version="2018",
    publication_date="2018",
    status="active",
)
```

If a file's content changes (you swap in a newer version under the same
filename), the registry detects the hash change and resets that entry to
`pending_review` automatically — it won't silently keep stale metadata.

## Step 4 — Verify it

```bash
python -c "
from rag.retriever import get_retriever
for d in get_retriever().invoke('target blood pressure for diabetics'):
    print(d.metadata['source'], '-', d.page_content[:80])
"
```

You should see chunks from your real guideline PDFs, not the built-in
summaries, ranked by relevance to the query.

As an admin, `GET /admin/rag-status` also reports this: whether the
corpus is populated, per-document metadata from the registry above, and
which embedding backend (`sentence_transformers` vs `tfidf_fallback`) is
actually active.

## Bonus: pulling supplementary content from a live API (PubMed)

`rag/ingest.py` supports fetching recent abstracts from PubMed's free
E-utilities API (no key required) for specific topics, writing them as
additional guideline files before rebuilding the index:

```bash
python -m rag.ingest --pubmed-topics "type 2 diabetes management guidelines" "hypertension treatment first line"
```

This reuses the same public API pattern already used elsewhere in this
codebase (`ayurveda/herb_recommender.py`'s evidence lookup). Each topic
becomes `data/guidelines/pubmed_<topic>.txt` and gets indexed alongside
everything else. Rate-limited to ~3 requests/second without an NCBI API
key — fine for occasional re-ingestion, not for high-frequency calls.

## Production notes

- `Chroma` telemetry is disabled (`ANONYMIZED_TELEMETRY=False` /
  `Settings(anonymized_telemetry=False)`) — no data leaves your
  deployment for a local vector store.
- If you see repeated `Failed to send telemetry event: capture() takes
  1 positional argument but 3 were given` in logs, that's a
  `posthog`/`chromadb` version mismatch — `requirements.txt` pins
  `posthog<3.1,>=2.4` specifically to avoid this; if you're on a
  different install path, apply the same pin.
- Rebuilding the index deletes and recreates `CHROMA_PERSIST_DIR`
  entirely (`rag.retriever.rebuild_index()`) — back it up first if
  you've customized it beyond what `rag.ingest` manages.
