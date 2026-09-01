"""
MediGuard AI — Feature 5: Lab Report OCR Auto-Fill (REFACTORED)
================================================================
OLD: Regex + LLM (no validation of extracted values).
NEW: Tesseract OCR + regex + LLM + WHO/ADA clinical reference range
     validation. Out-of-range values flagged against WHO guidelines.

DATA SOURCE FOR REFERENCE RANGES:
  WHO Diabetes: https://www.who.int/publications/i/item/9789241547239
  ADA Standards of Medical Care 2024: diabetes.org/clinicalresources
  ACC/AHA Cholesterol Guidelines 2019
  JNC 8 Hypertension Guidelines

IMPROVEMENT:
  Old code used ad-hoc clinical bounds (CLINICAL_BOUNDS dict with no citation).
  New code uses WHO/ADA/ACC validated reference ranges with severity levels:
  normal / borderline / abnormal / critical.
"""

from __future__ import annotations

import io
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ── WHO/ADA/ACC Reference Ranges (evidence-based) ────────────────────────────
# Source: WHO 2006 Diabetes Diagnosis, ADA 2024, ACC/AHA 2019, JNC-8 2014
CLINICAL_REFERENCE = {
    "fasting_glucose": {
        "unit": "mg/dL",
        "ranges": [
            {"label": "normal",     "min": 70,   "max": 99,   "source": "ADA 2024"},
            {"label": "prediabetes","min": 100,  "max": 125,  "source": "ADA 2024 / WHO"},
            {"label": "diabetes",   "min": 126,  "max": 999,  "source": "ADA 2024"},
            {"label": "critical_low","min": 0,   "max": 54,   "source": "ADA hypoglycaemia alert"},
        ],
        "physiological_min": 50, "physiological_max": 500,
    },
    "hba1c": {
        "unit": "%",
        "ranges": [
            {"label": "normal",     "min": 4.0, "max": 5.6,  "source": "ADA 2024"},
            {"label": "prediabetes","min": 5.7, "max": 6.4,  "source": "ADA 2024"},
            {"label": "diabetes",   "min": 6.5, "max": 20.0, "source": "ADA 2024"},
        ],
        "physiological_min": 3.5, "physiological_max": 15.0,
    },
    "cholesterol_total": {
        "unit": "mg/dL",
        "ranges": [
            {"label": "desirable",   "min": 0,   "max": 199, "source": "ACC/AHA 2019"},
            {"label": "borderline",  "min": 200, "max": 239, "source": "ACC/AHA 2019"},
            {"label": "high",        "min": 240, "max": 999, "source": "ACC/AHA 2019"},
        ],
        "physiological_min": 90, "physiological_max": 600,
    },
    "cholesterol_hdl": {
        "unit": "mg/dL",
        "ranges": [
            {"label": "low_risk",   "min": 60,  "max": 999, "source": "ACC/AHA 2019"},
            {"label": "acceptable", "min": 40,  "max": 59,  "source": "ACC/AHA 2019"},
            {"label": "low_hdl",    "min": 0,   "max": 39,  "source": "ACC/AHA 2019"},
        ],
        "physiological_min": 15, "physiological_max": 120,
    },
    "cholesterol_ldl": {
        "unit": "mg/dL",
        "ranges": [
            {"label": "optimal",    "min": 0,   "max": 99,  "source": "ACC/AHA 2019"},
            {"label": "near_opt",   "min": 100, "max": 129, "source": "ACC/AHA 2019"},
            {"label": "borderline", "min": 130, "max": 159, "source": "ACC/AHA 2019"},
            {"label": "high",       "min": 160, "max": 189, "source": "ACC/AHA 2019"},
            {"label": "very_high",  "min": 190, "max": 999, "source": "ACC/AHA 2019"},
        ],
        "physiological_min": 20, "physiological_max": 400,
    },
    "triglycerides": {
        "unit": "mg/dL",
        "ranges": [
            {"label": "normal",     "min": 0,   "max": 149, "source": "ACC/AHA 2019"},
            {"label": "borderline", "min": 150, "max": 199, "source": "ACC/AHA 2019"},
            {"label": "high",       "min": 200, "max": 499, "source": "ACC/AHA 2019"},
            {"label": "very_high",  "min": 500, "max": 9999,"source": "ACC/AHA 2019"},
        ],
        "physiological_min": 30, "physiological_max": 2000,
    },
    "blood_pressure_systolic": {
        "unit": "mmHg",
        "ranges": [
            {"label": "normal",     "min": 0,   "max": 119, "source": "JNC-8 / AHA 2017"},
            {"label": "elevated",   "min": 120, "max": 129, "source": "AHA 2017"},
            {"label": "stage1_htn", "min": 130, "max": 139, "source": "AHA 2017"},
            {"label": "stage2_htn", "min": 140, "max": 179, "source": "JNC-8"},
            {"label": "crisis",     "min": 180, "max": 999, "source": "JNC-8"},
        ],
        "physiological_min": 60, "physiological_max": 250,
    },
    "blood_pressure_diastolic": {
        "unit": "mmHg",
        "ranges": [
            {"label": "normal",     "min": 0,  "max": 79,  "source": "JNC-8"},
            {"label": "stage1_htn", "min": 80, "max": 89,  "source": "JNC-8"},
            {"label": "stage2_htn", "min": 90, "max": 119, "source": "JNC-8"},
            {"label": "crisis",     "min": 120,"max": 999, "source": "JNC-8"},
        ],
        "physiological_min": 40, "physiological_max": 160,
    },
    "bmi": {
        "unit": "kg/m²",
        "ranges": [
            {"label": "underweight", "min": 0,    "max": 18.4, "source": "WHO 2000"},
            {"label": "normal",      "min": 18.5, "max": 22.9, "source": "WHO Asian cutoffs"},
            {"label": "overweight",  "min": 23.0, "max": 24.9, "source": "WHO Asian cutoffs"},
            {"label": "obese_1",     "min": 25.0, "max": 29.9, "source": "WHO Asian cutoffs"},
            {"label": "obese_2",     "min": 30.0, "max": 999,  "source": "WHO 2000"},
        ],
        "physiological_min": 10, "physiological_max": 80,
    },
}

# ── OCR Extraction Patterns (unchanged from original) ────────────────────────
LAB_PATTERNS: Dict[str, list] = {
    "fasting_glucose": [
        r"fasting\s*(?:blood\s*)?(?:sugar|glucose)\s*[:\-=]\s*(\d{2,3}(?:\.\d)?)",
        r"fbg\s*[:\-=]\s*(\d{2,3}(?:\.\d)?)",
        r"f\.?\s*blood\s*glucose\s*[:\-=]\s*(\d{2,3}(?:\.\d)?)",
        r"(?:fbg|fbs)\s*[:\-=]\s*(\d{2,3}(?:\.\d)?)",
    ],
    "hba1c": [
        r"hba1c\s*[:\-=]\s*(\d{1,2}(?:\.\d)?)\s*%?",
        r"glycated\s*ha?emoglobin\s*[:\-=]\s*(\d{1,2}(?:\.\d)?)",
        r"a1c\s*[:\-=]\s*(\d{1,2}(?:\.\d)?)",
    ],
    "cholesterol_total": [
        r"total\s*cholesterol\s*[:\-=]\s*(\d{3,4}(?:\.\d)?)",
        r"cholesterol\s*[:\-=]\s*(\d{3,4}(?:\.\d)?)",
    ],
    "cholesterol_hdl": [
        r"hdl\s*(?:cholesterol|chol)?\s*[:\-=]\s*(\d{2,3}(?:\.\d)?)",
    ],
    "cholesterol_ldl": [
        r"ldl\s*(?:cholesterol|chol)?\s*[:\-=]\s*(\d{2,3}(?:\.\d)?)",
    ],
    "triglycerides": [
        r"triglycerides?\s*[:\-=]\s*(\d{2,4}(?:\.\d)?)",
        r"tg\s*[:\-=]\s*(\d{2,4}(?:\.\d)?)",
    ],
    "blood_pressure_systolic": [
        r"(?:bp|blood\s*pressure)\s*[:\-=]\s*(\d{2,3})\s*/\s*\d{2,3}",
        r"systolic\s*(?:bp|pressure)?\s*[:\-=]\s*(\d{2,3})",
        r"(\d{2,3})\s*/\s*\d{2,3}\s*mmhg",
    ],
    "blood_pressure_diastolic": [
        r"(?:bp|blood\s*pressure)\s*[:\-=]\s*\d{2,3}\s*/\s*(\d{2,3})",
        r"diastolic\s*(?:bp|pressure)?\s*[:\-=]\s*(\d{2,3})",
    ],
    "bmi": [
        r"bmi\s*[:\-=]\s*(\d{2,3}(?:\.\d{1,2})?)",
        r"body\s*mass\s*index\s*[:\-=]\s*(\d{2,3}(?:\.\d{1,2})?)",
    ],
}


def _classify_value(field: str, value: float) -> Dict[str, str]:
    """
    Classify extracted value against WHO/ADA/ACC clinical ranges.
    Returns {"label": ..., "guideline": ..., "source": ...}
    """
    ref = CLINICAL_REFERENCE.get(field)
    if not ref:
        return {"label": "unknown", "guideline": "No reference available", "source": "N/A"}
    for r in ref["ranges"]:
        if r["min"] <= value <= r["max"]:
            return {"label": r["label"], "guideline": r["source"], "source": r["source"]}
    return {"label": "out_of_range", "guideline": "Outside reference ranges", "source": "WHO/ADA/ACC"}


def _validate_physiology(field: str, value: float) -> bool:
    """Check physiological plausibility per WHO bounds."""
    ref = CLINICAL_REFERENCE.get(field, {})
    lo = ref.get("physiological_min", float("-inf"))
    hi = ref.get("physiological_max", float("inf"))
    return lo <= value <= hi


def _extract_with_regex(text: str) -> Dict[str, Any]:
    results = {}
    text_lower = text.lower()
    for field, patterns in LAB_PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, text_lower)
            if match:
                try:
                    val = float(match.group(1))
                    if _validate_physiology(field, val):
                        results[field] = {
                            "value": val,
                            "confidence": 0.85,
                            "method": "regex_ocr",
                            "clinical_status": _classify_value(field, val),
                        }
                    break
                except (ValueError, IndexError):
                    continue
    return results


def extract_from_image(image_bytes: bytes, llm=None) -> Dict[str, Any]:
    """
    Full OCR extraction pipeline with WHO/ADA reference validation.
    1. Tesseract OCR
    2. Regex extraction
    3. LLM fallback
    4. WHO/ADA clinical range classification
    """
    ocr_text = ""
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        ocr_text = pytesseract.image_to_string(img, lang="eng+hin")
        logger.info("OCR extracted %d chars", len(ocr_text))
    except ImportError:
        logger.warning("pytesseract not installed — OCR unavailable")
        return {"error": "pytesseract not installed", "fields": {}}
    except Exception as e:
        logger.error("OCR failed: %s", e)
        return {"error": str(e), "fields": {}}

    fields = _extract_with_regex(ocr_text)

    # LLM fallback for any missing fields
    missing = [f for f in LAB_PATTERNS if f not in fields]
    if missing and llm and ocr_text:
        try:
            from langchain_core.messages import SystemMessage, HumanMessage
            import json as _json
            prompt = (
                f"Extract these lab values from the OCR text: {missing}.\n"
                f"Respond ONLY as JSON: {{\"field\": value_as_number}}.\n"
                f"OCR text:\n{ocr_text[:1500]}"
            )
            from utils.llm_timeout import invoke_with_timeout
            resp = invoke_with_timeout(llm, [SystemMessage(content="You are a medical lab report parser. Extract numeric values only."),
                               HumanMessage(content=prompt)])
            parsed = _json.loads(resp.content.strip().strip("`").lstrip("json"))
            for field, val in parsed.items():
                if field in missing and isinstance(val, (int, float)):
                    fval = float(val)
                    if _validate_physiology(field, fval):
                        fields[field] = {
                            "value": fval, "confidence": 0.65,
                            "method": "llm_fallback",
                            "clinical_status": _classify_value(field, fval),
                        }
        except Exception as e:
            logger.warning("LLM fallback parsing failed: %s", e)

    # Identify critical flags
    critical_flags = [
        f"{fld}: {data['value']} {CLINICAL_REFERENCE.get(fld,{}).get('unit','')} "
        f"[{data['clinical_status']['label']}]"
        for fld, data in fields.items()
        if data.get("clinical_status", {}).get("label", "") in
           ("crisis", "very_high", "critical_low", "diabetes", "stage2_htn")
    ]

    return {
        "fields": fields,
        "ocr_text_preview": ocr_text[:300] if ocr_text else "",
        "critical_flags": critical_flags,
        "total_extracted": len(fields),
        "reference_sources": "WHO 2006 / ADA 2024 / ACC-AHA 2019 / JNC-8 2014",
    }
