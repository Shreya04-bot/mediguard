"""
MediGuard AI — LLM Call Timeout Helper
======================================

Universal timeout wrapper for synchronous and asynchronous LLM calls.

Designed for Windows and async LangGraph nodes.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import logging
from typing import Any, List

logger = logging.getLogger(__name__)

# 60 seconds gives Groq enough time while still preventing hanging requests.
DEFAULT_LLM_TIMEOUT_SECONDS = 60

_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=4,
    thread_name_prefix="llm-call",
)


class LLMTimeoutError(TimeoutError):
    """Raised when an LLM call exceeds the configured timeout."""


def invoke_with_timeout(
    llm: Any,
    messages: List[Any],
    timeout: float = DEFAULT_LLM_TIMEOUT_SECONDS,
    **kwargs,
) -> Any:
    """Run synchronous LLM invocation with a hard timeout."""

    future = _executor.submit(
        llm.invoke,
        messages,
        **kwargs,
    )

    try:
        return future.result(timeout=timeout)

    except concurrent.futures.TimeoutError as exc:
        future.cancel()

        logger.error(
            "LLM synchronous call exceeded %s seconds",
            timeout,
        )

        raise LLMTimeoutError(
            f"LLM call exceeded {timeout}s timeout"
        ) from exc


async def ainvoke_with_timeout(
    llm: Any,
    messages: List[Any],
    timeout: float = DEFAULT_LLM_TIMEOUT_SECONDS,
    **kwargs,
) -> Any:
    """Run asynchronous LLM invocation with a hard timeout."""

    try:
        return await asyncio.wait_for(
            llm.ainvoke(
                messages,
                **kwargs,
            ),
            timeout=timeout,
        )

    except asyncio.TimeoutError as exc:

        logger.error(
            "LLM asynchronous call exceeded %s seconds",
            timeout,
        )

        raise LLMTimeoutError(
            f"LLM call exceeded {timeout}s timeout"
        ) from exc