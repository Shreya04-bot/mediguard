"""
MediGuard AI — Ayurveda & Extra Features API Routes
All new feature endpoints are consolidated here.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from auth.dependencies import get_current_user
from pydantic import BaseModel
import io

router = APIRouter(
    dependencies=[Depends(get_current_user)]
)
logger = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════════════════════
# FEATURE 1 — Comorbidity Timeline
# ════════════════════════════════════════════════════════════════════════════

class TimelineRequest(BaseModel):
    patient_data: Dict[str, Any]
    intervention_keys: Optional[List[str]] = None


@router.post("/timeline", summary="F1: 5/10/20-year comorbidity timeline simulation")
async def simulate_timeline(req: TimelineRequest):
    try:
        from features.timeline_simulator import simulate_timeline
        from ml.model import get_model

        model = get_model()
        encoded_patient = model._encode_patient(req.patient_data).iloc[0].to_dict()

        result = simulate_timeline(
            encoded_patient,
            model.predict,
            req.intervention_keys,
        )

        return result
    except Exception as exc:
        logger.exception("Timeline error")
        raise HTTPException(500, str(exc))

# ════════════════════════════════════════════════════════════════════════════
# FEATURE 2 — District Heatmap
# ════════════════════════════════════════════════════════════════════════════

@router.get("/heatmap", summary="F2: UP district-level risk heatmap data")
async def get_heatmap():
    try:
        from features.district_heatmap import get_heatmap_data, get_state_summary
        return {"districts": get_heatmap_data(), "summary": get_state_summary()}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@router.post("/heatmap/record", summary="F2: Record a prediction for district aggregation")
async def record_district_prediction(payload: Dict[str, Any]):
    try:
        from features.district_heatmap import record_prediction
        record_prediction(
            payload.get("district_id","unknown"),
            payload.get("diabetes_prob", 0.0),
            payload.get("cvd_prob", 0.0),
        )
        return {"status": "recorded"}
    except Exception as exc:
        raise HTTPException(500, str(exc))


# ════════════════════════════════════════════════════════════════════════════
# FEATURE 3 — Vernacular Symptom Chat
# ════════════════════════════════════════════════════════════════════════════

class SymptomChatRequest(BaseModel):
    text: str
    use_llm_fallback: bool = True


@router.post("/symptoms/map", summary="F3: Hindi vernacular symptom → clinical label mapping")
async def map_symptoms(req: SymptomChatRequest):
    try:
        from features.vernacular_nlp import map_symptoms as _map_symptoms

        llm = None
        if req.use_llm_fallback:
            # LLM is optional: the rule-based WHO ICD-11 dictionary works without it.
            try:
                from agents.llm_factory import get_llm
                llm = get_llm()
            except Exception as exc:
                logger.warning("LLM unavailable, using dictionary only: %s", exc)

        return _map_symptoms(req.text, llm=llm)
    except Exception as exc:
        logger.exception("Symptom mapping error")
        raise HTTPException(500, str(exc))


# ════════════════════════════════════════════════════════════════════════════
# FEATURE 4 — PDF Health Report
# ════════════════════════════════════════════════════════════════════════════

class PDFReportRequest(BaseModel):
    patient_data: Dict[str, Any]
    prediction: Dict[str, Any] = {}
    agent_summary: Optional[str] = None
    language: str = "en"


@router.post(
    "/report/pdf",
    summary="F4: Generate bilingual personalised health report PDF",
)
async def generate_pdf(req: PDFReportRequest):
    try:
        from features.pdf_report import generate_pdf_report

        # ---------------------------------------------------------------------
        # COPY PATIENT DATA
        # ---------------------------------------------------------------------

        patient_data = dict(
            req.patient_data or {}
        )

        # ---------------------------------------------------------------------
        # GET PATIENT NAME FROM PATIENT DATA
        # ---------------------------------------------------------------------
        # The PDF should have one source of truth for the patient's identity.
        # We no longer accept a separate patient_name field.

        patient_name = (
            patient_data.get("patient_name")
            or patient_data.get("name")
            or patient_data.get("full_name")
            or patient_data.get("username")
            or "Patient"
        )

        patient_name = str(
            patient_name
        ).strip() or "Patient"

        # ---------------------------------------------------------------------
        # PREDICTION
        # ---------------------------------------------------------------------

        prediction = dict(
            req.prediction or {}
        )

        required_report_keys = {
            "diabetes_risk",
            "cardiovascular_risk",
            "combined_risk_score",
        }

        # ---------------------------------------------------------------------
        # GENERATE PREDICTION IF FRONTEND DID NOT PROVIDE ONE
        # ---------------------------------------------------------------------

        if not required_report_keys.issubset(
            prediction.keys()
        ):

            from ml.model import get_model

            model = get_model()

            model_patient = {
                "age": patient_data.get(
                    "age"
                ),

                "gender": patient_data.get(
                    "gender",
                    "male",
                ),

                "bmi": patient_data.get(
                    "bmi"
                ),

                "blood_pressure_systolic": patient_data.get(
                    "blood_pressure_systolic"
                ),

                "blood_pressure_diastolic": patient_data.get(
                    "blood_pressure_diastolic"
                ),

                "fasting_glucose": patient_data.get(
                    "fasting_glucose"
                ),

                "hba1c": patient_data.get(
                    "hba1c"
                ),

                "cholesterol_total": patient_data.get(
                    "cholesterol_total"
                ),

                "cholesterol_hdl": patient_data.get(
                    "cholesterol_hdl"
                ),

                "cholesterol_ldl": patient_data.get(
                    "cholesterol_ldl"
                ),

                "triglycerides": patient_data.get(
                    "triglycerides"
                ),

                "smoking": patient_data.get(
                    "smoking",
                    False,
                ),

                "family_history_diabetes": patient_data.get(
                    "family_history_diabetes",
                    False,
                ),

                "family_history_cvd": patient_data.get(
                    "family_history_cvd",
                    False,
                ),

                "physical_activity": patient_data.get(
                    "physical_activity",
                    "moderate",
                ),
            }

            prediction = model.predict(
                model_patient
            )

            if not isinstance(
                prediction,
                dict,
            ):
                raise ValueError(
                    "Model prediction must be a dictionary"
                )

        # ---------------------------------------------------------------------
        # VALIDATE / NORMALIZE PREDICTION VALUES
        # ---------------------------------------------------------------------

        try:

            dia_risk = prediction.get(
                "diabetes_risk",
                {},
            )

            cvd_risk = prediction.get(
                "cardiovascular_risk",
                {},
            )

            if not isinstance(
                dia_risk,
                dict,
            ):
                dia_risk = {}

            if not isinstance(
                cvd_risk,
                dict,
            ):
                cvd_risk = {}

            dia_probability = float(
                dia_risk.get(
                    "probability",
                    0,
                ) or 0
            )

            cvd_probability = float(
                cvd_risk.get(
                    "probability",
                    0,
                ) or 0
            )

            dia_probability = max(
                0.0,
                min(
                    dia_probability,
                    1.0,
                ),
            )

            cvd_probability = max(
                0.0,
                min(
                    cvd_probability,
                    1.0,
                ),
            )

            # -------------------------------------------------------------
            # Combined score is expected to be 0–1.
            # If it does not exist, calculate it from the two probabilities.
            # -------------------------------------------------------------

            combined_score = prediction.get(
                "combined_risk_score"
            )

            if combined_score is None:

                combined_score = (
                    dia_probability
                    + cvd_probability
                ) / 2

                prediction[
                    "combined_risk_score"
                ] = combined_score

            else:

                combined_score = float(
                    combined_score
                )

                # Protect against invalid model output.
                if combined_score > 1.0:
                    combined_score = (
                        combined_score / 100.0
                    )

                combined_score = max(
                    0.0,
                    min(
                        combined_score,
                        1.0,
                    ),
                )

                prediction[
                    "combined_risk_score"
                ] = combined_score

        except (
            TypeError,
            ValueError,
        ) as exc:

            logger.exception(
                "Invalid prediction values"
            )

            raise HTTPException(
                status_code=422,
                detail=(
                    "Prediction contains invalid "
                    "risk probability values"
                ),
            ) from exc

        # ---------------------------------------------------------------------
        # DO NOT RECALCULATE A SECOND RISK SCALE HERE
        # ---------------------------------------------------------------------
        #
        # pdf_report.py is the single source of truth for report risk levels.
        #
        # This prevents the previous bug where:
        #
        #     0.112
        #
        # was compared against:
        #
        #     30 and 70
        #
        # ---------------------------------------------------------------------

        # ---------------------------------------------------------------------
        # GENERATE PDF
        # ---------------------------------------------------------------------

        pdf_bytes = generate_pdf_report(
            patient=patient_data,
            prediction=prediction,
            agent_summary=req.agent_summary,
            language=req.language,
            patient_name=patient_name,
        )

        # ---------------------------------------------------------------------
        # SAFE FILE NAME
        # ---------------------------------------------------------------------

        safe_name = "".join(
            c
            for c in patient_name
            if c.isalnum()
            or c in (
                " ",
                "_",
                "-",
            )
        ).strip()

        safe_name = (
            safe_name.replace(
                " ",
                "_",
            )
            or "Patient"
        )

        # ---------------------------------------------------------------------
        # RESPONSE
        # ---------------------------------------------------------------------

        return StreamingResponse(
            io.BytesIO(
                pdf_bytes
            ),
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="MediGuard_Report_{safe_name}.pdf"'
                )
            },
        )

    except HTTPException:
        raise

    except Exception as exc:

        logger.exception(
            "PDF generation error"
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to generate health report",
        ) from exc

# ════════════════════════════════════════════════════════════════════════════
# FEATURE 5 — Lab Report OCR Auto-Fill
# ════════════════════════════════════════════════════════════════════════════

@router.post("/ocr/autofill", summary="F5: OCR lab report → auto-fill patient fields")
async def ocr_autofill(
    file: UploadFile = File(...),
    use_llm: bool = True,
):
    try:
        from features.ocr_autofill import extract_from_image, _extract_with_regex

        content = await file.read()

        llm = None
        if use_llm:
            # LLM is an optional enhancement; regex extraction works without it.
            try:
                from agents.llm_factory import get_llm
                llm = get_llm()
            except Exception as exc:
                logger.warning("LLM unavailable for OCR autofill: %s", exc)

        if file.content_type == "application/pdf":
            # PDFs already contain a text layer — skip Tesseract entirely.
            from api.routes.reports import _parse_pdf
            import tempfile, os

            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            try:
                text, _, _ = _parse_pdf(tmp_path)
            finally:
                os.unlink(tmp_path)

            fields = _extract_with_regex(text or "")
            return {
                "fields": fields,
                "raw_text": (text or "")[:2000],
                "field_count": len(fields),
                "source": "pdf_text_layer",
            }

        return extract_from_image(content, llm=llm)
    except Exception as exc:
        logger.exception("OCR autofill error")
        raise HTTPException(500, str(exc))

# ════════════════════════════════════════════════════════════════════════════
# AYURVEDA A1 — Diet Plan
# ════════════════════════════════════════════════════════════════════════════

class DietPlanRequest(BaseModel):
    primary_dosha: str
    diabetes_risk_level: str
    cvd_risk_level: str
    bmi: Optional[float] = None
    language: str = "en"


@router.post("/ayurveda/diet", summary="A1: Personalised Ayurvedic diet plan")
async def get_diet_plan(req: DietPlanRequest):
    from ayurveda.diet_generator import generate_diet_plan
    return generate_diet_plan(
        req.primary_dosha, req.diabetes_risk_level,
        req.cvd_risk_level, req.bmi, req.language,
    )


# ════════════════════════════════════════════════════════════════════════════
# AYURVEDA A2 — Prakriti Quiz
# ════════════════════════════════════════════════════════════════════════════

@router.get("/ayurveda/prakriti/questions", summary="A2: Get Prakriti questionnaire")
async def get_prakriti_questions():
    from ayurveda.prakriti_scorer import load_questions
    return {"questions": load_questions()}


class PrakritiScoreRequest(BaseModel):
    answers: List[Dict[str, Any]]  # [{"question_id": 1, "dosha": "vata"}, ...]


@router.post("/ayurveda/prakriti/score", summary="A2: Score Prakriti questionnaire")
async def score_prakriti(req: PrakritiScoreRequest):
    from ayurveda.prakriti_scorer import score_prakriti
    return score_prakriti(req.answers)


# ════════════════════════════════════════════════════════════════════════════
# AYURVEDA A3 — Herb Recommender
# ════════════════════════════════════════════════════════════════════════════

class HerbRequest(BaseModel):
    diabetes_risk_level: str
    cvd_risk_level: str
    primary_dosha: Optional[str] = None
    current_medications: Optional[List[str]] = None


@router.post("/ayurveda/herbs", summary="A3: Evidence-based herbal remedy recommendations")
async def get_herbs(req: HerbRequest):
    from ayurveda.herb_recommender import recommend_herbs
    return recommend_herbs(
        req.diabetes_risk_level, req.cvd_risk_level,
        req.primary_dosha, req.current_medications,
    )


# ════════════════════════════════════════════════════════════════════════════
# AYURVEDA A4 — Yoga Plan
# ════════════════════════════════════════════════════════════════════════════

class YogaRequest(BaseModel):
    primary_dosha: str
    diabetes_risk_level: str
    cvd_risk_level: str
    age: int
    blood_pressure_systolic: Optional[int] = None
    mobility: str = "normal"
    language: str = "en"


@router.post("/ayurveda/yoga", summary="A4: Personalised yoga & pranayama weekly plan")
async def get_yoga_plan(req: YogaRequest):
    from ayurveda.yoga_prescriber import prescribe_yoga_plan
    return prescribe_yoga_plan(
        req.primary_dosha, req.diabetes_risk_level, req.cvd_risk_level,
        req.age, req.blood_pressure_systolic, req.mobility, req.language,
    )


# ════════════════════════════════════════════════════════════════════════════
# AYURVEDA A5 — Ayurvedic Agent
# ════════════════════════════════════════════════════════════════════════════

class AyurvedaAgentRequest(BaseModel):
    patient_data: Dict[str, Any]
    prediction_result: Optional[Dict[str, Any]] = None
    prakriti_result: Optional[Dict[str, Any]] = None
    language: str = "en"
    messages: Optional[List[Dict[str, Any]]] = None


@router.post("/ayurveda/agent", summary="A5: Run Ayurvedic AI agent (LangGraph node)")
async def run_ayurveda_agent(req: AyurvedaAgentRequest):
    try:
        from ayurveda.ayurveda_agent import ayurveda_agent_node
        state = {
            "patient_data": req.patient_data,
            "prediction_result": req.prediction_result or {},
            "prakriti_result": req.prakriti_result or {},
            "language": req.language,
            "messages": req.messages or [],
        }
        result = await ayurveda_agent_node(state)
        return {"ayurveda_output": result["ayurveda_output"]}
    except Exception as exc:
        logger.exception("Ayurveda agent error"); raise HTTPException(500, str(exc))