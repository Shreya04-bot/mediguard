"""
MediGuard AI — API Response Cache & Fallback Manager
=====================================================
Centralized caching layer for all external API calls.

Architecture:
  Primary:   Live API call (OpenML, PubMed, OpenFDA, CDC, data.gov.in)
  Secondary: Disk cache (TTL-based, JSON/CSV)
  Tertiary:  Last-known-good snapshot (never expires)
  Emergency: Evidence-based static fallback (NOT random)

Cache locations:
  data/api_cache/       — JSON API responses (short TTL: hours-days)
  data/snapshots/       — Last-known-good responses (never expire)
  data/real_datasets/   — Downloaded CSVs (long TTL: weeks)
"""

from __future__ import annotations

import functools
import hashlib
import json
import logging
import os
import time
from typing import Any, Callable, Optional, TypeVar

import requests

logger = logging.getLogger(__name__)

BASE_DIR    = os.path.join(os.path.dirname(__file__), "..", "data")
CACHE_DIR   = os.path.join(BASE_DIR, "api_cache")
SNAP_DIR    = os.path.join(BASE_DIR, "snapshots")

for d in [CACHE_DIR, SNAP_DIR]:
    os.makedirs(d, exist_ok=True)

F = TypeVar("F", bound=Callable[..., Any])


# ─────────────────────────────────────────────────────────────────────────────
# Core cache primitives
# ─────────────────────────────────────────────────────────────────────────────

def _key_to_path(key: str, cache_dir: str) -> str:
    safe = hashlib.md5(key.encode()).hexdigest()[:16]
    return os.path.join(cache_dir, f"{safe}.json")


def cache_get(key: str, ttl: float) -> Optional[Any]:
    p = _key_to_path(key, CACHE_DIR)
    if not os.path.exists(p):
        return None
    if time.time() - os.path.getmtime(p) > ttl:
        return None
    try:
        with open(p) as f:
            return json.load(f)
    except Exception:
        return None


def cache_set(key: str, value: Any) -> None:
    p = _key_to_path(key, CACHE_DIR)
    try:
        with open(p, "w") as f:
            json.dump(value, f)
        # Also save as snapshot (survives TTL expiry)
        snap = _key_to_path(key, SNAP_DIR)
        with open(snap, "w") as f:
            json.dump({"data": value, "saved_at": time.strftime("%Y-%m-%d %H:%M UTC")}, f)
    except Exception as e:
        logger.debug("Cache write failed: %s", e)


def snapshot_get(key: str) -> Optional[Any]:
    """Return last-known-good snapshot — used when live API AND cache both fail."""
    p = _key_to_path(key, SNAP_DIR)
    if not os.path.exists(p):
        return None
    try:
        with open(p) as f:
            snap = json.load(f)
        return snap.get("data")
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Decorator: cached_api_call
# ─────────────────────────────────────────────────────────────────────────────

def cached_api(cache_key: str, ttl: float = 3600) -> Callable[[F], F]:
    """
    Decorator: wraps any function that makes an external API call.
    Implements the three-tier fallback automatically.

    Usage:
        @cached_api("pubmed_karela", ttl=7*86400)
        def fetch_pubmed_karela():
            return requests.get(...).json()
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{cache_key}:{args}:{sorted(kwargs.items())}"

            # Tier 1: Live cache
            cached = cache_get(key, ttl)
            if cached is not None:
                return cached

            # Tier 2: Live API call
            try:
                result = func(*args, **kwargs)
                if result is not None:
                    cache_set(key, result)
                    return result
            except Exception as exc:
                logger.warning("API call failed for %s: %s", cache_key, exc)

            # Tier 3: Last-known-good snapshot
            snap = snapshot_get(key)
            if snap is not None:
                logger.info("Using snapshot fallback for %s", cache_key)
                return snap

            return None
        return wrapper  # type: ignore
    return decorator


# ─────────────────────────────────────────────────────────────────────────────
# Resilient HTTP client
# ─────────────────────────────────────────────────────────────────────────────

class ResilientHTTPClient:
    """
    HTTP client with automatic retry, rate-limiting, and timeout management.
    Prevents hammering APIs when they are temporarily unavailable.
    """

    def __init__(
        self,
        max_retries: int = 3,
        backoff_base: float = 2.0,
        default_timeout: int = 15,
    ) -> None:
        self.max_retries    = max_retries
        self.backoff_base   = backoff_base
        self.default_timeout = default_timeout
        self._last_call_time: dict = {}
        self._min_interval: dict = {}

    def set_rate_limit(self, domain: str, min_interval_seconds: float) -> None:
        """Register per-domain rate limits."""
        self._min_interval[domain] = min_interval_seconds

    def _respect_rate_limit(self, url: str) -> None:
        domain = url.split("/")[2]
        min_interval = self._min_interval.get(domain, 0)
        if min_interval > 0:
            elapsed = time.time() - self._last_call_time.get(domain, 0)
            if elapsed < min_interval:
                time.sleep(min_interval - elapsed)
        self._last_call_time[domain] = time.time()

    def get(self, url: str, **kwargs) -> Optional[requests.Response]:
        """GET with retry + backoff."""
        self._respect_rate_limit(url)
        kwargs.setdefault("timeout", self.default_timeout)

        last_error = None
        for attempt in range(self.max_retries):
            try:
                resp = requests.get(url, **kwargs)
                if resp.status_code == 429:
                    # Rate limited — wait and retry
                    wait = self.backoff_base ** (attempt + 2)
                    logger.info("Rate limited by %s — waiting %.0fs", url[:40], wait)
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                return resp
            except requests.exceptions.Timeout:
                logger.debug("Timeout on attempt %d for %s", attempt + 1, url[:60])
                last_error = "timeout"
            except requests.exceptions.ConnectionError:
                logger.debug("Connection error on attempt %d for %s", attempt + 1, url[:60])
                last_error = "connection"
            except requests.exceptions.HTTPError as e:
                if e.response.status_code in (400, 401, 403, 404):
                    # Don't retry client errors
                    logger.debug("Client error %d for %s", e.response.status_code, url[:60])
                    return None
                last_error = str(e)

            # Exponential backoff
            if attempt < self.max_retries - 1:
                wait = self.backoff_base ** attempt
                time.sleep(wait)

        logger.warning("All %d attempts failed for %s: %s", self.max_retries, url[:60], last_error)
        return None

    def get_json(self, url: str, **kwargs) -> Optional[Any]:
        resp = self.get(url, **kwargs)
        if resp is None:
            return None
        try:
            return resp.json()
        except Exception:
            return None


# Module-level shared client with sensible rate limits
http = ResilientHTTPClient(max_retries=3, default_timeout=15)
http.set_rate_limit("eutils.ncbi.nlm.nih.gov", 0.34)   # PubMed: 3 req/sec
http.set_rate_limit("api.fda.gov",               0.20)   # OpenFDA: 5 req/sec
http.set_rate_limit("api.openml.org",             0.50)   # OpenML: 2 req/sec
http.set_rate_limit("data.gov.in",                1.00)   # data.gov.in: 1 req/sec
http.set_rate_limit("data.cdc.gov",               0.50)   # CDC Socrata: 2 req/sec


# ─────────────────────────────────────────────────────────────────────────────
# Cache status report (for MLOps dashboard)
# ─────────────────────────────────────────────────────────────────────────────

def get_cache_status() -> dict:
    """Return cache statistics for the MLOps monitoring dashboard."""
    cache_files   = [f for f in os.listdir(CACHE_DIR) if f.endswith(".json")]
    snap_files    = [f for f in os.listdir(SNAP_DIR)  if f.endswith(".json")]

    total_size_kb = sum(
        os.path.getsize(os.path.join(CACHE_DIR, f))
        for f in cache_files
    ) / 1024

    expired = sum(
        1 for f in cache_files
        if time.time() - os.path.getmtime(os.path.join(CACHE_DIR, f)) > 86400
    )

    return {
        "cache_entries":      len(cache_files),
        "snapshot_entries":   len(snap_files),
        "total_size_kb":      round(total_size_kb, 1),
        "expired_entries":    expired,
        "cache_dir":          CACHE_DIR,
        "snapshot_dir":       SNAP_DIR,
    }


def clear_expired_cache(max_age_seconds: float = 7 * 86400) -> int:
    """Remove cache entries older than max_age_seconds. Returns count removed."""
    removed = 0
    for fname in os.listdir(CACHE_DIR):
        p = os.path.join(CACHE_DIR, fname)
        if time.time() - os.path.getmtime(p) > max_age_seconds:
            try:
                os.remove(p)
                removed += 1
            except Exception:
                pass
    logger.info("Cache cleanup: removed %d expired entries", removed)
    return removed
