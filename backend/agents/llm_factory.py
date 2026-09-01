"""
MediGuard AI — LLM Factory
Supports Groq, Gemini, and Ollama.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

from utils.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_llm() -> Any:
    """Return the configured LLM singleton."""

    provider = settings.llm_provider.lower()

    # =========================================================
    # GROQ
    # =========================================================

    if provider == "groq":

        try:
            from langchain_groq import ChatGroq

            llm = ChatGroq(
                groq_api_key=settings.groq_api_key,
                model=settings.llm_model,
                temperature=0.2,
                max_tokens=2048,
                request_timeout=60,
            )

            logger.info(
                "Using Groq LLM: %s",
                settings.llm_model,
            )

            return llm

        except Exception as exc:

            logger.warning(
                "Groq initialization failed: %s",
                exc,
            )

    # =========================================================
    # GEMINI
    # =========================================================

    if provider == "gemini":

        try:
            from langchain_google_genai import ChatGoogleGenerativeAI

            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=settings.gemini_api_key,
                temperature=0.2,
                max_output_tokens=2048,
                timeout=60,
            )

            logger.info("Using Gemini LLM")

            return llm

        except Exception as exc:

            logger.warning(
                "Gemini initialization failed: %s",
                exc,
            )

    # =========================================================
    # OLLAMA FALLBACK
    # =========================================================

    try:
        from langchain_ollama import ChatOllama

        llm = ChatOllama(
            model="llama3.1:8b",
            base_url=settings.ollama_base_url,
            temperature=0.2,
        )

        logger.info(
            "Using Ollama LLM (local): llama3.1:8b"
        )

        return llm

    except Exception as exc:

        raise RuntimeError(
            f"No LLM provider available. Last error: {exc}"
        ) from exc