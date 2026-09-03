"""
MediGuard AI — Pydantic Models (Request / Response schemas)
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"
    UNKNOWN = "unknown"  # No quantitative prediction available (e.g. a symptom-only query with no clinical inputs) — not a risk level, an honest "not computed" state.


class Language(str, Enum):
    EN = "en"
    HI = "hi"


# ---------------------------------------------------------------------------
# Patient Input
# ---------------------------------------------------------------------------

class PatientInput(BaseModel):
    """Core clinical features required for joint disease risk prediction."""
    age: int = Field(..., ge=1, le=120, description="Age in years")
    gender: str = Field(..., pattern="^(male|female|other)$")
    bmi: float = Field(..., ge=10.0, le=70.0)
    blood_pressure_systolic: int = Field(..., ge=60, le=260, description="Systolic BP (mmHg)")
    blood_pressure_diastolic: int = Field(..., ge=40, le=160, description="Diastolic BP (mmHg)")
    fasting_glucose: float = Field(..., ge=50.0, le=600.0, description="Fasting glucose mg/dL")
    hba1c: float = Field(..., ge=3.0, le=20.0, description="HbA1c %")
    cholesterol_total: float = Field(..., ge=50.0, le=600.0, description="Total cholesterol mg/dL")
    cholesterol_hdl: float = Field(..., ge=10.0, le=200.0)
    cholesterol_ldl: float = Field(..., ge=10.0, le=400.0)
    triglycerides: float = Field(..., ge=30.0, le=1000.0)
    smoking: bool = False
    family_history_diabetes: bool = False
    family_history_cvd: bool = False
    physical_activity: str = Field(default="moderate", pattern="^(sedentary|light|moderate|active)$")
    symptoms: Optional[List[str]] = Field(default_factory=list)
    language: Language = Language.EN


# ---------------------------------------------------------------------------
# Prediction Response
# ---------------------------------------------------------------------------

class SHAPFeature(BaseModel):
    feature: str
    value: float
    shap_value: float
    impact: str    # "increases" | "decreases"


class DiseaseRisk(BaseModel):
    probability: float = Field(..., ge=0.0, le=1.0)
    risk_level: RiskLevel
    confidence: float
    shap_features: List[SHAPFeature] = Field(default_factory=list)


class PredictionResponse(BaseModel):
    model_config = ConfigDict(
        protected_namespaces=()
    )

    patient_id: str
    diabetes_risk: DiseaseRisk
    cardiovascular_risk: DiseaseRisk
    hypertension_risk: DiseaseRisk
    combined_risk_score: float
    model_version: str
    prediction_id: str
    timestamp: str


# ---------------------------------------------------------------------------
# Agent / Coordinator Response
# ---------------------------------------------------------------------------

class AgentRecommendation(BaseModel):
    agent_name: str
    findings: str
    recommendations: List[str] = Field(default_factory=list)
    guideline_references: List[str] = Field(default_factory=list)
    confidence: float = 1.0


class CoordinatorResponse(BaseModel):
    final_risk_level: RiskLevel
    summary: str
    agent_outputs: List[AgentRecommendation]
    triage_priority: str     # "routine" | "urgent" | "emergency"
    next_steps: List[str]
    disclaimer: str = (
        "MediGuard AI provides decision support only. "
        "Always consult a qualified healthcare professional."
    )
# ---------------------------------------------------------------------------
# Voice
# ---------------------------------------------------------------------------

class VoiceTranscriptionRequest(BaseModel):
    language: Language = Language.EN


class VoiceTranscriptionResponse(BaseModel):
    transcript: str
    language: Language
    confidence: float


class TTSRequest(BaseModel):
    text: str = Field(..., max_length=2000)
    language: Language = Language.EN


# ---------------------------------------------------------------------------
# MLOps / Monitoring
# ---------------------------------------------------------------------------

class DriftReport(BaseModel):
    run_id: str
    dataset_size: int
    psi_score: float
    drift_detected: bool
    feature_drifts: Dict[str, float] = Field(default_factory=dict)
    recommendation: str


class ModelMetrics(BaseModel):
    model_config = ConfigDict(
        protected_namespaces=()
    )

    model_name: str
    version: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: float
    logged_at: str

# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    services: Dict[str, str]
    version: str


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------

class AppointmentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class AppointmentCreateRequest(BaseModel):
    doctor_id: str
    appointment_date: str = Field(..., description="YYYY-MM-DD")
    start_time: str = Field(..., description="HH:MM, 24-hour, must align to the clinic's 30-minute slot grid")
    reason: str = Field(..., min_length=3, max_length=1000)


class AppointmentStatusUpdateRequest(BaseModel):
    status: AppointmentStatus
    notes: Optional[str] = Field(None, max_length=2000)
    cancellation_reason: Optional[str] = Field(None, max_length=1000)


class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: Optional[str] = None
    doctor_id: str
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None
    appointment_date: str
    start_time: str
    end_time: str
    reason: str
    status: AppointmentStatus
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None
    created_at: str
    updated_at: str


class DoctorSummary(BaseModel):
    id: str
    name: str
    specialization: Optional[str] = None
    hospital_name: Optional[str] = None
    experience_years: Optional[int] = None


class AvailableSlotsResponse(BaseModel):
    doctor_id: str
    date: str
    available_slots: List[str]
    clinic_hours: str

