"""
MediGuard AI — PredictionHistory Model
======================================
SQLAlchemy model storing disease risk predictions for patients.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship

from auth.db import Base


class PredictionHistory(Base):
    __tablename__ = "prediction_histories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    prediction_id = Column(String(100), nullable=False, unique=True, index=True)
    input_data = Column(Text, nullable=False)  # JSON string
    diabetes_probability = Column(Float, nullable=False)
    diabetes_risk_level = Column(String(20), nullable=False)
    cvd_probability = Column(Float, nullable=False)
    cvd_risk_level = Column(String(20), nullable=False)
    # Nullable: added when hypertension became a genuine 3rd prediction
    # target (real prevalentHyp/BP-threshold label, see ml/data_loader.py).
    # Nullable so this doesn't break loading rows written before this change.
    hypertension_probability = Column(Float, nullable=True)
    hypertension_risk_level = Column(String(20), nullable=True)
    combined_score = Column(Float, nullable=False)
    model_version = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="predictions")
