"""
MediGuard AI — Shared pytest configuration

Pre-imports a few modules at session start that individual test files
temporarily replace via `unittest.mock.patch.dict(sys.modules, {...})`
(see test_phase3_ai_gateway.py's ml.model/agents.graph/rag.retriever
fakes, used to avoid needing shap/langgraph/chromadb installed just to
test the surrounding adapter logic).

Why this matters: `patch.dict` on a key that already exists in
`sys.modules` correctly restores the original module object when the
`with` block exits. But if the key *doesn't* exist yet (module never
genuinely imported), `patch.dict` *deletes* the key on exit instead of
restoring anything — so the next time something does
`import rag.retriever` for real, Python treats it as a brand new,
"cold" import and re-executes the module's top-level code, including
re-importing langchain_core submodules.

That cold re-import is what surfaced a real bug while adding Phase 7's
RAG tests: running test_phase3_ai_gateway.py (which fakes
rag.retriever mid-test) followed by test_phase7_rag.py (which imports
the real rag.retriever fresh) in the same pytest session raised
`pydantic.v1.errors.ConfigError: duplicate validator function
"langchain_core.messages.ai.AIMessage._backwards_compat_tool_calls"` —
a known langchain_core/pydantic-v1-compat footgun triggered by
importing certain langchain_core submodules more than once via
different code paths in one process. Each test file passed in
isolation; only specific combinations run together triggered it.

Pre-importing here means every `patch.dict(sys.modules, {"rag.retriever": ...})`
call across the suite is patching a real, already-loaded module and
correctly restoring it afterward — no more cold re-imports later in
the same session.
"""
import logging
import os
import tempfile
import atexit

logger = logging.getLogger(__name__)

# --- Test DB isolation (fix: tests were writing to the real dev DB) -------
# auth/db.py reads AUTH_DB_PATH once at import time (`DB_PATH = os.getenv(...)`,
# default "./data/mediguard_users.db" — the same file a local `uvicorn main:app`
# run uses). Because the test suite never overrode this, running pytest twice
# in a row (or running a single test file after a full-suite run) hit a DB that
# already had the previous run's users in it, and registration tests using a
# fixed email address (e.g. "notadmin@example.com") would silently no-op on
# the second run instead of sending a fresh OTP — the mocked `send_otp` never
# fires, and `captured[0]` blows up with IndexError. This is exactly the
# "works alone, fails in combination/on rerun" pattern that made these look
# like flaky tests when they're actually a real test-isolation bug.
#
# This must run before ANY module imports `auth.db` (including the
# pre-imports below), so it's the very first thing in this file.
_TEST_DB_PATH = os.path.join(tempfile.gettempdir(), f"mediguard_test_{os.getpid()}.db")
os.environ.setdefault("AUTH_DB_PATH", _TEST_DB_PATH)


def _cleanup_test_db():
    try:
        if os.path.exists(_TEST_DB_PATH):
            os.remove(_TEST_DB_PATH)
    except OSError:
        pass


atexit.register(_cleanup_test_db)

for _module_name in ("rag.retriever", "agents.graph", "ml.model"):
    try:
        __import__(_module_name)
    except Exception as exc:
        # Not fatal — a given test environment may genuinely lack shap/
        # langgraph/chromadb (see individual test files' sys.modules
        # fakes for that case). Just means patch.dict will delete-then-
        # recreate on first real use instead of restore, same as before
        # this conftest existed.
        logger.info("conftest: could not pre-import %s (%s) — tests relying on it being genuinely available will fake it via sys.modules instead.", _module_name, exc)
