"""
MediGuard AI — Shared Rate Limiter
=====================================
Extracted from api/routes/ai_gateway.py's original in-file limiter (see
SECURITY_REPORT.md finding #12: rate limiting existed on /ai/chat but not
on other cost-bearing endpoints like /predict, /reports/upload, or
/voice/*). Same simple in-memory sliding-window approach — fine for a
single-process deployment; swap for a Redis-backed limiter if/when this
runs behind multiple workers.

Usage:
    from utils.rate_limit import check_rate_limit
    check_rate_limit("predict", rate_key, max_requests=30, window_seconds=60)
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Dict

from fastapi import HTTPException, status

# Keyed by (bucket_name, identity) so different endpoints don't share a budget.
_rate_limit_log: Dict[tuple, deque] = defaultdict(deque)


def check_rate_limit(bucket: str, key: str, max_requests: int, window_seconds: int = 60) -> None:
    """Raises HTTP 429 if `key` has made >= max_requests calls to `bucket`
    within the last `window_seconds`. Call once per request, near the top
    of the route handler, before doing any real work."""
    now = time.time()
    log_key = (bucket, key)
    window = _rate_limit_log[log_key]
    while window and now - window[0] > window_seconds:
        window.popleft()
    if len(window) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": f"Rate limit exceeded for {bucket}, please wait before retrying"},
        )
    window.append(now)
