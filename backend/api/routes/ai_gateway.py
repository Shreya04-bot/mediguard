"""
MediGuard AI — Frontend AI Gateway
=====================================
The frontend's three AI-facing endpoints (documented in
frontend/src/services/predictionService.js, reportService.js,
chatbotService.js) use simpler, UI-shaped contracts than the backend's
internal services (ml/model.py's full clinical PatientInput, the
richer ReportAnalysisResult, the multi-agent LangGraph pipeline). This
router is the adapter layer between them — it does NOT reimplement any
ML/OCR/LLM logic, it translates.

Endpoints:
  POST /ai/predict  -> ml.model.get_model() + ayurveda.herb_recommender
  POST /ai/ocr      -> features.ocr_autofill.extract_from_image (images) or
                        pypdf + the same regex extractor (PDF)
  POST /ai/chat     -> agents.llm_factory.get_llm(), grounded with
                        rag.retriever when available
"""

from __future__ import annotations
import base64
import logging
import re
import time
from collections import defaultdict, deque
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.db import get_db, User
from auth.dependencies import oauth2_scheme, decode_access_token
from services.patient_service import PatientService

logger = logging.getLogger(__name__)
router = APIRouter()

SUPPORTED_DISEASE_TYPES = {"Type 2 Diabetes", "Cardiovascular Risk", "Hypertension"}

FEATURE_LABELS = {
    "age": "Age",
    "gender_encoded": "Gender",
    "bmi": "Body Mass Index",
    "blood_pressure_systolic": "Systolic Blood Pressure",
    "blood_pressure_diastolic": "Diastolic Blood Pressure",
    "fasting_glucose": "Fasting Glucose",
    "hba1c": "HbA1c",
    "cholesterol_total": "Total Cholesterol",
    "cholesterol_hdl": "HDL Cholesterol",
    "cholesterol_ldl": "LDL Cholesterol",
    "triglycerides": "Triglycerides",
    "smoking": "Smoking Status",
    "family_history_diabetes": "Family History of Diabetes",
    "family_history_cvd": "Family History of Heart Disease",
    "physical_activity_encoded": "Physical Activity Level",
}


async def _current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Best-effort auth: these endpoints work for anonymous demo use, but
    persist results when a valid token is present, matching the pattern
    already used in prediction.py/reports.py."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        return db.query(User).filter(User.id == user_id).first() if user_id else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# POST /ai/predict
# ---------------------------------------------------------------------------

class VitalsIn(BaseModel):
    age: str
    gender: str = "male"
    bmi: str
    bloodPressure: str
    glucose: str
    hba1c: str
    cholesterolTotal: str
    cholesterolHdl: str
    cholesterolLdl: str
    triglycerides: str
    physicalActivity: str = "moderate"


class PredictRequestIn(BaseModel):
    diseaseType: str
    vitals: VitalsIn
    smoking: bool = False
    familyHistoryDiabetes: bool = False
    familyHistoryCvd: bool = False
    medicalHistory: List[str] = Field(default_factory=list)


def _to_float(value: str, field_name: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail={"error": f"vitals.{field_name} must be a number"})


def _map_risk_level(level: str) -> str:
    # Frontend's documented union is Low|Moderate|High only; "critical"
    # (the model's most severe bucket) maps to High rather than being
    # silently dropped or causing a type mismatch on the frontend.
    return {"low": "Low", "moderate": "Moderate", "high": "High", "critical": "High"}.get(level, "Moderate")


@router.post("/predict", summary="Run disease risk prediction (frontend-facing contract)")
async def ai_predict(
    payload: PredictRequestIn,
    request: Request,
    current_user: Optional[User] = Depends(_current_user_optional),
    db: Session = Depends(get_db),
):
    if payload.diseaseType not in SUPPORTED_DISEASE_TYPES:
        raise HTTPException(status_code=422, detail={"error": "diseaseType is not a supported assessment type"})

    bp_match = re.match(r"^(\d{2,3})\s*/\s*(\d{2,3})$", payload.vitals.bloodPressure.strip())
    if not bp_match:
        raise HTTPException(status_code=400, detail={"error": "vitals.bloodPressure must be in the form systolic/diastolic"})
    systolic, diastolic = int(bp_match.group(1)), int(bp_match.group(2))

    raw = {
        "age": int(_to_float(payload.vitals.age, "age")),
        "gender": payload.vitals.gender,
        "bmi": _to_float(payload.vitals.bmi, "bmi"),
        "blood_pressure_systolic": systolic,
        "blood_pressure_diastolic": diastolic,
        "fasting_glucose": _to_float(payload.vitals.glucose, "glucose"),
        "hba1c": _to_float(payload.vitals.hba1c, "hba1c"),
        "cholesterol_total": _to_float(payload.vitals.cholesterolTotal, "cholesterolTotal"),
        "cholesterol_hdl": _to_float(payload.vitals.cholesterolHdl, "cholesterolHdl"),
        "cholesterol_ldl": _to_float(payload.vitals.cholesterolLdl, "cholesterolLdl"),
        "triglycerides": _to_float(payload.vitals.triglycerides, "triglycerides"),
        "smoking": payload.smoking,
        "family_history_diabetes": payload.familyHistoryDiabetes,
        "family_history_cvd": payload.familyHistoryCvd,
        "physical_activity": payload.vitals.physicalActivity,
    }

    try:
        from ml.model import get_model
        model = get_model()
        result = model.predict(raw)
    except Exception as exc:
        logger.exception("Prediction model unavailable")
        raise HTTPException(status_code=503, detail={"error": "Prediction model temporarily unavailable"}) from exc

    selected_key = {
        "Type 2 Diabetes": "diabetes",
        "Cardiovascular Risk": "cardiovascular",
        "Hypertension": "hypertension",
    }[payload.diseaseType]
    selected = result[selected_key]

    top_factors = selected.get("shap_features", [])[:5]
    max_abs_shap = max((abs(f["shap_value"]) for f in top_factors), default=0) or 1
    primary_factors = [
        {
            "label": FEATURE_LABELS.get(f["feature"], f["feature"]),
            # Relative contribution strength (-100..100), not a probability
            # or percentage-point delta — SHAP values here live in log-odds/
            # margin space (commonly -1..+2 for this model), so the raw
            # magnitude isn't directly meaningful to a non-technical reader.
            # Scaling relative to the strongest factor in this list keeps
            # the numbers bounded and comparable regardless of the model's
            # actual output scale.
            "impact": round((f["shap_value"] / max_abs_shap) * 100, 1),
        }
        for f in top_factors
    ]

    risk_level = selected["risk_level"]
    recommendations = _build_recommendations(risk_level, selected.get("shap_features", []), payload)
    preventive_ayurveda = _build_ayurveda_tips(result["diabetes"]["risk_level"], result["cardiovascular"]["risk_level"])

    if current_user:
        try:
            PatientService.save_prediction(
                db=db, user_id=current_user.id, prediction_id=result["prediction_id"], input_data=raw,
                diabetes_prob=result["diabetes"]["probability"], diabetes_level=result["diabetes"]["risk_level"],
                cvd_prob=result["cardiovascular"]["probability"], cvd_level=result["cardiovascular"]["risk_level"],
                combined_score=result["combined_risk_score"], model_version=result["model_version"],
            )
        except Exception:
            logger.warning("Could not persist prediction to DB", exc_info=True)

    return {
        "riskScore": round(selected["probability"] * 100),
        "riskLevel": _map_risk_level(risk_level),
        "primaryFactors": primary_factors,
        "recommendations": recommendations,
        "preventiveAyurveda": preventive_ayurveda,
    }


def _build_recommendations(risk_level: str, shap_features: List[Dict[str, Any]], payload: PredictRequestIn) -> List[str]:
    """
    Templated, deterministic recommendations grounded in the model's own
    top contributing factors — not a generic canned list. Falls back
    cleanly if fewer factors are present; never blocks the response.
    """
    recs: List[str] = []
    increasing = [f for f in shap_features if f["shap_value"] > 0][:3]
    factor_hints = {
        "fasting_glucose": "Schedule a follow-up HbA1c and fasting glucose panel with your doctor.",
        "hba1c": "Discuss glycaemic control options (diet, medication) with your doctor given your HbA1c reading.",
        "cholesterol_ldl": "Consider a lipid-lowering consultation — your LDL is a leading contributor to this risk.",
        "cholesterol_total": "A follow-up lipid panel is advisable given your total cholesterol reading.",
        "triglycerides": "Reducing refined carbohydrates and alcohol can help lower triglycerides.",
        "blood_pressure_systolic": "Monitor blood pressure regularly; consider a cardiology follow-up.",
        "blood_pressure_diastolic": "Monitor blood pressure regularly; consider a cardiology follow-up.",
        "bmi": "A structured weight-management plan may meaningfully reduce this risk.",
        "smoking": "Smoking cessation is the single highest-impact change available to you.",
    }
    for f in increasing:
        hint = factor_hints.get(f["feature"])
        if hint and hint not in recs:
            recs.append(hint)

    if payload.smoking and factor_hints["smoking"] not in recs:
        recs.append(factor_hints["smoking"])

    if risk_level in ("high", "critical"):
        recs.insert(0, "Book an appointment with a physician promptly to review these results.")
    elif not recs:
        recs.append("Maintain current lifestyle habits and repeat this assessment periodically.")

    recs.append("This is decision support only — always confirm findings with a qualified clinician.")
    return recs[:6]


def _build_ayurveda_tips(diabetes_risk_level: str, cvd_risk_level: str) -> List[str]:
    try:
        from ayurveda.herb_recommender import recommend_herbs
        # fetch_pubmed=False: pubmed.ncbi.nlm.nih.gov enrichment is a
        # nice-to-have, not worth the network round trip (or failure) on
        # every prediction request's hot path.
        result = recommend_herbs(diabetes_risk_level, cvd_risk_level, max_herbs=3, fetch_pubmed=False)
        return [
            f"{h['name_en']} ({h['scientific']}) — {h['dosage_en']}"
            for h in result.get("recommended_herbs", [])
            if h.get("safe_to_use", True)
        ]
    except Exception:
        logger.warning("Ayurveda herb recommendation unavailable", exc_info=True)
        return []


# ---------------------------------------------------------------------------
# POST /ai/ocr
# ---------------------------------------------------------------------------

class OcrRequestIn(BaseModel):
    imageBase64: str
    mimeType: str


ALLOWED_OCR_TYPES = {"image/png", "image/jpeg", "image/jpg", "application/pdf"}
MAX_OCR_BYTES = 20 * 1024 * 1024

_GOOD_LABELS = {"normal", "desirable", "optimal", "acceptable", "low_risk"}
_LOW_LABELS = {"critical_low", "low_hdl", "underweight"}


def _biomarker_status(label: str) -> str:
    if label in _GOOD_LABELS:
        return "Normal"
    if label in _LOW_LABELS:
        return "Low"
    return "High"


def _reference_range_str(field: str) -> str:
    from features.ocr_autofill import CLINICAL_REFERENCE
    ranges = CLINICAL_REFERENCE.get(field, {}).get("ranges", [])
    good = next((r for r in ranges if r["label"] in _GOOD_LABELS), ranges[0] if ranges else None)
    if not good:
        return "N/A"
    return f"{good['min']}-{good['max']}"


def _analyze_pdf_bytes(pdf_bytes: bytes) -> Dict[str, Any]:
    """Mirrors features.ocr_autofill.extract_from_image's return shape,
    but for text-based PDFs (no image OCR needed — pypdf text extraction
    is more reliable than rasterizing + tesseract for a real PDF)."""
    from features.ocr_autofill import _extract_with_regex, CLINICAL_REFERENCE
    try:
        from pypdf import PdfReader
        import io as _io
        reader = PdfReader(_io.BytesIO(pdf_bytes))
        text = "".join(p.extract_text() or "" for p in reader.pages)
    except Exception as exc:
        logger.warning("PDF parse error: %s", exc)
        return {"error": str(exc), "fields": {}}

    fields = _extract_with_regex(text)
    critical_flags = [
        f"{fld}: {data['value']} {CLINICAL_REFERENCE.get(fld, {}).get('unit', '')} [{data['clinical_status']['label']}]"
        for fld, data in fields.items()
        if data.get("clinical_status", {}).get("label", "") in
           ("crisis", "very_high", "critical_low", "diabetes", "stage2_htn")
    ]
    return {
        "fields": fields,
        "ocr_text_preview": text[:300] if text else "",
        "critical_flags": critical_flags,
        "total_extracted": len(fields),
    }


@router.post("/ocr", summary="Parse a lab report image/PDF (frontend-facing contract)")
async def ai_ocr(
    payload: OcrRequestIn,
    current_user: Optional[User] = Depends(_current_user_optional),
    db: Session = Depends(get_db),
):
    if payload.mimeType not in ALLOWED_OCR_TYPES:
        raise HTTPException(status_code=400, detail={"error": "Unsupported file type"})

    raw_b64 = payload.imageBase64.split(",", 1)[-1] if "," in payload.imageBase64 else payload.imageBase64
    try:
        file_bytes = base64.b64decode(raw_b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail={"error": "Invalid base64 image data"})

    if len(file_bytes) > MAX_OCR_BYTES:
        raise HTTPException(status_code=413, detail={"error": "File exceeds 20MB limit"})

    try:
        if payload.mimeType == "application/pdf":
            analysis = _analyze_pdf_bytes(file_bytes)
        else:
            from features.ocr_autofill import extract_from_image
            from agents.llm_factory import get_llm
            try:
                llm = get_llm()
            except Exception:
                llm = None
            analysis = extract_from_image(file_bytes, llm=llm)
    except Exception as exc:
        logger.exception("OCR engine error")
        raise HTTPException(status_code=503, detail={"error": "OCR engine temporarily unavailable"}) from exc

    if analysis.get("error"):
        raise HTTPException(status_code=503, detail={"error": "OCR engine temporarily unavailable"})

    fields = analysis.get("fields", {})
    if not fields:
        raise HTTPException(status_code=422, detail={"error": "Could not extract legible biomarker data from this image"})

    from features.ocr_autofill import CLINICAL_REFERENCE
    biomarkers = [
        {
            "name": FEATURE_LABELS.get(field, field.replace("_", " ").title()),
            "value": data["value"],
            "unit": CLINICAL_REFERENCE.get(field, {}).get("unit", ""),
            "range": _reference_range_str(field),
            "status": _biomarker_status(data.get("clinical_status", {}).get("label", "")),
        }
        for field, data in fields.items()
    ]

    critical_flags = analysis.get("critical_flags", [])
    ai_summary = (
        f"Extracted {len(biomarkers)} biomarker(s) from this report. "
        + (f"{len(critical_flags)} value(s) flagged outside WHO/ADA/ACC reference ranges."
           if critical_flags else "All extracted values are within normal reference ranges.")
    )
    actionable_plan = (
        [f"Discuss with your doctor: {flag}" for flag in critical_flags]
        if critical_flags else ["No abnormal values detected — continue routine monitoring."]
    )

    if current_user:
        try:
            PatientService.save_report(
                db=db, user_id=current_user.id, report_name="OCR Lab Report",
                file_type="pdf" if payload.mimeType == "application/pdf" else "image",
                file_path=None,
                extracted_data={f: d["value"] for f, d in fields.items()},
                summary=ai_summary, flags=critical_flags,
            )
        except Exception:
            logger.warning("Could not persist OCR report to DB", exc_info=True)

    return {
        "reportType": "Comprehensive Metabolic Panel" if len(biomarkers) > 2 else "Lab Report Analysis",
        "labName": "Not detected on report",
        "date": "Not detected on report",
        "biomarkers": biomarkers,
        "aiSummary": ai_summary,
        "actionablePlan": actionable_plan,
    }


# ---------------------------------------------------------------------------
# POST /ai/chat
# ---------------------------------------------------------------------------

class ChatTurnIn(BaseModel):
    role: str
    content: str


class ChatRequestIn(BaseModel):
    message: str
    history: List[ChatTurnIn] = Field(default_factory=list)
    userRole: str = "patient"


_ROLE_SYSTEM_PROMPTS = {
    "patient": (
        "You are MediGuard AI's patient-facing health assistant. Explain things in "
        "plain, reassuring language a non-clinician can follow. You can explain "
        "predictions, lab reports, general risk factors, and medications in general "
        "terms, and suggest sensible follow-up actions. You are not a substitute for "
        "a doctor: for diagnosis, dosing, or urgent symptoms, always recommend the "
        "person consult their physician or emergency services. Never fabricate a "
        "specific diagnosis or prescribe a specific drug/dose."
    ),
    "doctor": (
        "You are MediGuard AI's clinical assistant for a doctor. You may use "
        "clinical terminology and reference guideline-style reasoning (ICMR/ADA/ACC/"
        "JNC-8 style thresholds) to help interpret risk scores, lab values, and "
        "differential considerations. You are decision support, not the final word — "
        "flag clinical judgement calls back to the physician rather than asserting them."
    ),
    "admin": (
        "You are MediGuard AI's platform assistant for an administrator. Help with "
        "platform usage, workflow, and general product questions. You do not have "
        "access to specific patient records through this chat."
    ),
}

# Simple in-memory sliding-window rate limiter (per user id if authenticated,
# else per IP). Fine for a single-process deployment; swap for a Redis-backed
# limiter if/when this runs behind multiple workers.
_RATE_LIMIT_MAX = 20
_RATE_LIMIT_WINDOW_SECONDS = 60
_rate_limit_log: Dict[str, deque] = defaultdict(deque)


def _check_rate_limit(key: str) -> None:
    now = time.time()
    window = _rate_limit_log[key]
    while window and now - window[0] > _RATE_LIMIT_WINDOW_SECONDS:
        window.popleft()
    if len(window) >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": "Rate limit exceeded, please wait before sending another message"},
        )
    window.append(now)


@router.post("/chat", summary="Conversational AI assistant (frontend-facing contract)")
async def ai_chat(
    payload: ChatRequestIn,
    request: Request,
    current_user: Optional[User] = Depends(_current_user_optional),
):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail={"error": "message is required"})
    if len(message) > 2000:
        raise HTTPException(status_code=400, detail={"error": "message is required"})

    rate_key = current_user.id if current_user else (request.client.host if request.client else "anonymous")
    _check_rate_limit(rate_key)

    role = payload.userRole if payload.userRole in _ROLE_SYSTEM_PROMPTS else "patient"
    system_prompt = _ROLE_SYSTEM_PROMPTS[role]

    # RAG grounding: best-effort. Chroma/embeddings may not be available in
    # every environment — degrade to no extra context rather than fail the
    # whole chat request (same philosophy as agents/graph.py).
    context = None
    try:
        from rag.retriever import get_retriever
        docs = get_retriever().invoke(message)
        if docs:
            context = "\n\n".join(f"[{d.metadata.get('source', 'guideline')}] {d.page_content}" for d in docs[:3])
            system_prompt += f"\n\nRelevant clinical guideline excerpts (cite the source tag if you use these):\n{context}"
    except Exception:
        logger.info("RAG retrieval unavailable for this chat turn; continuing without it.")

    try:
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        from agents.llm_factory import get_llm

        messages = [SystemMessage(content=system_prompt)]
        for turn in payload.history[-10:]:
            if turn.role == "user":
                messages.append(HumanMessage(content=turn.content))
            elif turn.role == "assistant":
                messages.append(AIMessage(content=turn.content))
        messages.append(HumanMessage(content=message))

        llm = get_llm()
        from utils.llm_timeout import invoke_with_timeout
        response = invoke_with_timeout(
            llm,
            messages,
            config={
                "tags": ["mediguard-ai", "endpoint:ai-chat", f"role:{role}"],
                "metadata": {
                    "endpoint": "/ai/chat",
                    "user_role": role,
                    "user_id": current_user.id if current_user else "anonymous",
                    "rag_grounded": bool(context),
                },
                "run_name": f"chat-{role}",
            },
        )
        reply = response.content if hasattr(response, "content") else str(response)
    except Exception as exc:
        logger.exception("Chat LLM unavailable")
        raise HTTPException(status_code=503, detail={"error": "AI assistant temporarily unavailable"}) from exc

    return {"reply": reply}
