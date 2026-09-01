"""Startup validation for the MediGuard AI ML lifecycle."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def run_startup_checks() -> None:
    """Load the best model or train once from Kaggle data when no model exists."""
    from utils.config import settings

    if settings.jwt_secret_key == "dev-only-change-me-in-production":
        if settings.environment.lower() in ("production", "prod"):
            raise RuntimeError(
                "JWT_SECRET_KEY is still the insecure default while "
                "ENVIRONMENT=production. Generate a real secret with "
                "`python -c \"import secrets; print(secrets.token_hex(32))\"` "
                "and set it in backend/.env before starting in production."
            )
        logger.warning(
            "JWT_SECRET_KEY is using the insecure development default. "
            "This is fine for local dev, but MUST be changed before any "
            "real deployment (set ENVIRONMENT=production to enforce this)."
        )

    if settings.cors_origins == ["*"]:
        logger.warning("CORS is wide open (allow_origins=['*']); restrict CORS_ORIGINS before deploying.")

    from ml.model import get_model

    model = get_model()
    result = model.train_if_needed()
    logger.info("ML startup lifecycle result: %s", result)

    try:
        from features.district_heatmap import get_heatmap_data

        data = get_heatmap_data()
        logger.info("District heatmap baseline ready: %d districts", len(data))
    except Exception as exc:
        logger.warning("Heatmap warmup failed: %s", exc)
