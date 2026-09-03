"""
MediGuard AI — Feature 4: Personalised Health Report PDF Generator

Produces a branded bilingual (Hindi + English) PDF after each assessment.

Includes:
- Dynamic patient information
- Dynamic risk scores
- SHAP explanation in plain language
- Patient-specific lifestyle recommendations
- Location-aware PM-JAY hospital information
- AI clinical assessment
- Medical disclaimer

Uses ReportLab for PDF generation.
"""

from __future__ import annotations

import io
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logger = logging.getLogger(__name__)


# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================

APP_NAME = "MediGuard AI"
APP_VERSION = "1.0"

ORGANIZATION_NAME = "United College of Engineering & Research"
ORGANIZATION_CITY = "Prayagraj"
UNIVERSITY_NAME = "AKTU"
UNIVERSITY_CITY = "Lucknow"


# =============================================================================
# FONT SUPPORT
# =============================================================================

ENGLISH_FONT = "Helvetica"
ENGLISH_BOLD_FONT = "Helvetica-Bold"

HINDI_FONT = "MediGuardDevanagari"
HINDI_BOLD_FONT = "MediGuardDevanagariBold"


def register_pdf_fonts() -> str:
    """
    Register Noto Sans Devanagari for Hindi text.

    Linux / GitHub Codespaces:
        /usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf
        /usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf

    Windows:
        C:\\Windows\\Fonts\\Nirmala.ttf
        C:\\Windows\\Fonts\\NirmalaUI.ttf
    """

    regular_candidates = [
        "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansDevanagari-Regular.ttf",
        "/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf",
        r"C:\Windows\Fonts\Nirmala.ttf",
        r"C:\Windows\Fonts\NirmalaUI.ttf",
    ]

    bold_candidates = [
        "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansDevanagari-Bold.ttf",
        r"C:\Windows\Fonts\NirmalaB.ttf",
        r"C:\Windows\Fonts\NirmalaUI-Bold.ttf",
    ]

    if HINDI_FONT not in pdfmetrics.getRegisteredFontNames():
        for font_path in regular_candidates:
            if not os.path.isfile(font_path):
                continue

            try:
                pdfmetrics.registerFont(
                    TTFont(
                        HINDI_FONT,
                        font_path,
                    )
                )

                logger.info(
                    "MediGuard Hindi font loaded: %s",
                    font_path,
                )
                break

            except Exception as exc:
                logger.warning(
                    "Could not register Hindi font %s: %s",
                    font_path,
                    exc,
                )

    if HINDI_BOLD_FONT not in pdfmetrics.getRegisteredFontNames():
        for font_path in bold_candidates:
            if not os.path.isfile(font_path):
                continue

            try:
                pdfmetrics.registerFont(
                    TTFont(
                        HINDI_BOLD_FONT,
                        font_path,
                    )
                )

                logger.info(
                    "MediGuard Hindi bold font loaded: %s",
                    font_path,
                )
                break

            except Exception as exc:
                logger.warning(
                    "Could not register Hindi bold font %s: %s",
                    font_path,
                    exc,
                )

    if HINDI_FONT not in pdfmetrics.getRegisteredFontNames():
        logger.error(
            "No Devanagari font found. Hindi text may not render correctly."
        )
        return ENGLISH_FONT

    if HINDI_BOLD_FONT not in pdfmetrics.getRegisteredFontNames():
        logger.warning(
            "Hindi bold font unavailable. Regular Hindi font will be used."
        )

    return HINDI_FONT


# =============================================================================
# RISK HELPERS
# =============================================================================

RISK_PLAIN_ENGLISH = {
    "low": (
        "Low Risk",
        "Your current readings are within healthy ranges. "
        "Continue healthy habits.",
    ),
    "moderate": (
        "Moderate Risk",
        "Some risk factors are elevated. "
        "Lifestyle changes are recommended now.",
    ),
    "high": (
        "High Risk",
        "Significant risk factors detected. "
        "Medical consultation is strongly advised.",
    ),
    "critical": (
        "Critical Risk",
        "Multiple risk factors are at dangerous levels. "
        "Seek medical care urgently.",
    ),
}


RISK_PLAIN_HINDI = {
    "low": (
        "कम जोखिम",
        "आपकी रीडिंग सामान्य सीमा में हैं। स्वस्थ आदतें जारी रखें।",
    ),
    "moderate": (
        "मध्यम जोखिम",
        "कुछ जोखिम कारक बढ़े हुए हैं। अभी जीवनशैली में बदलाव की सलाह है।",
    ),
    "high": (
        "उच्च जोखिम",
        "महत्वपूर्ण जोखिम कारक पाए गए। चिकित्सकीय परामर्श की दृढ़ता से सलाह दी जाती है।",
    ),
    "critical": (
        "गंभीर जोखिम",
        "अनेक जोखिम कारक खतरनाक स्तर पर हैं। तुरंत चिकित्सा सहायता लें।",
    ),
}


def get_report_risk_level(score: Any) -> str:
    """
    Convert a combined risk score on a 0–1 scale into an overall level.

    < 0.30  -> Low
    < 0.70  -> Moderate
    < 1.00  -> High
    >= 1.00 -> Critical
    """

    try:
        score = float(score or 0)
    except (TypeError, ValueError):
        score = 0.0

    score = max(0.0, min(score, 1.0))

    if score >= 1.0:
        return "critical"

    if score >= 0.70:
        return "high"

    if score >= 0.30:
        return "moderate"

    return "low"


def get_risk_label(
    level: str,
    language: str = "en",
) -> str:
    level = str(level or "moderate").lower()

    if language == "hi":
        return RISK_PLAIN_HINDI.get(
            level,
            RISK_PLAIN_HINDI["moderate"],
        )[0]

    return RISK_PLAIN_ENGLISH.get(
        level,
        RISK_PLAIN_ENGLISH["moderate"],
    )[0]


# =============================================================================
# SAFE DATA HELPERS
# =============================================================================

def safe_float(value: Any) -> Optional[float]:
    try:
        if value is None or value == "":
            return None

        return float(value)

    except (TypeError, ValueError):
        return None


def safe_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        return bool(value)

    if isinstance(value, str):
        return value.strip().lower() in {
            "true",
            "1",
            "yes",
            "y",
            "smoker",
        }

    return False


def clean_text(value: Any, default: str = "—") -> str:
    if value is None:
        return default

    text = str(value).strip()

    return text if text else default


# =============================================================================
# PATIENT HELPERS
# =============================================================================

def get_patient_name(
    patient: Dict[str, Any],
    explicit_name: Optional[str] = None,
) -> str:
    candidates = [
        explicit_name,
        patient.get("patient_name"),
        patient.get("name"),
        patient.get("full_name"),
        patient.get("username"),
    ]

    for value in candidates:
        if value is not None:
            value = str(value).strip()

            if value:
                return value

    return "Patient"


def get_gender_english(value: Any) -> str:
    gender = str(value or "").strip().lower()

    mapping = {
        "m": "Male",
        "male": "Male",
        "man": "Male",
        "पुरुष": "Male",
        "f": "Female",
        "female": "Female",
        "woman": "Female",
        "महिला": "Female",
        "other": "Other",
        "अन्य": "Other",
    }

    return mapping.get(
        gender,
        str(value).title() if value else "—",
    )


def get_gender_hindi(value: Any) -> str:
    gender = str(value or "").strip().lower()

    mapping = {
        "m": "पुरुष",
        "male": "पुरुष",
        "man": "पुरुष",
        "पुरुष": "पुरुष",
        "f": "महिला",
        "female": "महिला",
        "woman": "महिला",
        "महिला": "महिला",
        "other": "अन्य",
        "अन्य": "अन्य",
    }

    return mapping.get(
        gender,
        "अन्य" if value else "—",
    )


def get_patient_location(
    patient: Dict[str, Any],
) -> str:
    for key in (
        "district",
        "city",
        "location",
        "district_name",
    ):
        value = patient.get(key)

        if value:
            return str(value).strip()

    return ""


# =============================================================================
# SHAP → PLAIN LANGUAGE
# =============================================================================

LABELS_EN = {
    "fasting_glucose": "fasting blood glucose",
    "hba1c": "HbA1c (3-month average blood sugar)",
    "bmi": "body mass index (BMI)",
    "blood_pressure_systolic": "systolic blood pressure",
    "blood_pressure_diastolic": "diastolic blood pressure",
    "smoking": "smoking status",
    "cholesterol_total": "total cholesterol",
    "cholesterol_hdl": "HDL cholesterol",
    "cholesterol_ldl": "LDL cholesterol",
    "triglycerides": "triglycerides",
    "age": "age",
    "family_history_diabetes": "family history of diabetes",
    "family_history_cvd": "family history of heart disease",
    "physical_activity": "physical activity",
}


LABELS_HI = {
    "fasting_glucose": "खाली पेट रक्त शर्करा",
    "hba1c": "HbA1c (3-माह औसत रक्त शर्करा)",
    "bmi": "बॉडी मास इंडेक्स (BMI)",
    "blood_pressure_systolic": "सिस्टोलिक रक्तचाप",
    "blood_pressure_diastolic": "डायस्टोलिक रक्तचाप",
    "smoking": "धूम्रपान",
    "cholesterol_total": "कुल कोलेस्ट्रॉल",
    "cholesterol_hdl": "HDL कोलेस्ट्रॉल",
    "cholesterol_ldl": "LDL कोलेस्ट्रॉल",
    "triglycerides": "ट्राइग्लिसराइड्स",
    "age": "आयु",
    "family_history_diabetes": "मधुमेह का पारिवारिक इतिहास",
    "family_history_cvd": "हृदय रोग का पारिवारिक इतिहास",
    "physical_activity": "शारीरिक गतिविधि",
}


def _shap_to_plain(
    features: List[Dict[str, Any]],
    language: str = "en",
) -> List[str]:

    sentences: List[str] = []

    labels = LABELS_HI if language == "hi" else LABELS_EN

    for feature in features[:6]:

        if not isinstance(feature, dict):
            continue

        feature_name = str(
            feature.get("feature", "")
        ).strip()

        if not feature_name:
            continue

        fname = labels.get(
            feature_name,
            feature_name,
        )

        impact = str(
            feature.get(
                "impact",
                "increases",
            )
        ).lower()

        if language == "hi":

            direction = (
                "बढ़ाता है"
                if impact == "increases"
                else "घटाता है"
            )

            sentences.append(
                f"{fname} आपका जोखिम {direction}।"
            )

        else:

            direction = (
                "increases"
                if impact == "increases"
                else "decreases"
            )

            sentences.append(
                f"Your {fname} {direction} your risk."
            )

    return sentences


# =============================================================================
# PERSONALIZED LIFESTYLE RECOMMENDATIONS
# =============================================================================

def generate_lifestyle_recommendations(
    patient: Dict[str, Any],
    dia_probability: float,
    cvd_probability: float,
    overall_level: str,
) -> List[Dict[str, str]]:

    recommendations: List[Dict[str, str]] = []

    glucose = safe_float(
        patient.get("fasting_glucose")
    )

    hba1c = safe_float(
        patient.get("hba1c")
    )

    bmi = safe_float(
        patient.get("bmi")
    )

    systolic = safe_float(
        patient.get("blood_pressure_systolic")
    )

    diastolic = safe_float(
        patient.get("blood_pressure_diastolic")
    )

    ldl = safe_float(
        patient.get("cholesterol_ldl")
    )

    triglycerides = safe_float(
        patient.get("triglycerides")
    )

    smoking = safe_bool(
        patient.get("smoking")
    )

    physical_activity = str(
        patient.get(
            "physical_activity",
            "",
        )
    ).lower()

    family_diabetes = safe_bool(
        patient.get("family_history_diabetes")
    )

    family_cvd = safe_bool(
        patient.get("family_history_cvd")
    )

    # -------------------------------------------------------------------------
    # Blood glucose / diabetes
    # -------------------------------------------------------------------------

    if (
        dia_probability >= 0.30
        or (glucose is not None and glucose >= 100)
        or (hba1c is not None and hba1c >= 5.7)
    ):
        recommendations.append(
            {
                "en": (
                    "Monitor blood glucose regularly and follow a balanced, "
                    "low-glycaemic diet with whole grains, legumes and vegetables."
                ),
                "hi": (
                    "रक्त शर्करा की नियमित जाँच करें और साबुत अनाज, "
                    "दालों तथा सब्जियों वाला संतुलित कम ग्लाइसेमिक आहार लें।"
                ),
            }
        )

    # -------------------------------------------------------------------------
    # BMI
    # -------------------------------------------------------------------------

    if bmi is not None and bmi >= 25:
        recommendations.append(
            {
                "en": (
                    "Work toward a healthy body weight through balanced "
                    "nutrition and regular physical activity."
                ),
                "hi": (
                    "संतुलित आहार और नियमित शारीरिक गतिविधि के माध्यम से "
                    "स्वस्थ वजन बनाए रखने का प्रयास करें।"
                ),
            }
        )

    # -------------------------------------------------------------------------
    # Blood pressure
    # -------------------------------------------------------------------------

    if (
        (systolic is not None and systolic >= 130)
        or (diastolic is not None and diastolic >= 80)
    ):
        recommendations.append(
            {
                "en": (
                    "Monitor blood pressure regularly and reduce excess "
                    "dietary salt."
                ),
                "hi": (
                    "रक्तचाप की नियमित जाँच करें और भोजन में अतिरिक्त नमक "
                    "की मात्रा कम रखें।"
                ),
            }
        )

    # -------------------------------------------------------------------------
    # Cholesterol
    # -------------------------------------------------------------------------

    if ldl is not None and ldl >= 100:
        recommendations.append(
            {
                "en": (
                    "Follow a heart-healthy diet and discuss cholesterol "
                    "management with a qualified healthcare professional."
                ),
                "hi": (
                    "हृदय के लिए स्वस्थ आहार लें और कोलेस्ट्रॉल प्रबंधन के "
                    "लिए योग्य चिकित्सक से परामर्श करें।"
                ),
            }
        )

    if triglycerides is not None and triglycerides >= 150:
        recommendations.append(
            {
                "en": (
                    "Limit excess sugar and refined carbohydrates and "
                    "monitor triglyceride levels."
                ),
                "hi": (
                    "अधिक चीनी और रिफाइंड कार्बोहाइड्रेट सीमित करें तथा "
                    "ट्राइग्लिसराइड स्तर की निगरानी करें।"
                ),
            }
        )

    # -------------------------------------------------------------------------
    # Smoking
    # -------------------------------------------------------------------------

    if smoking:
        recommendations.append(
            {
                "en": (
                    "Consider quitting smoking to reduce cardiovascular "
                    "and overall health risks."
                ),
                "hi": (
                    "हृदय और समग्र स्वास्थ्य जोखिम कम करने के लिए "
                    "धूम्रपान छोड़ने का प्रयास करें।"
                ),
            }
        )

    # -------------------------------------------------------------------------
    # Physical activity
    # -------------------------------------------------------------------------

    if physical_activity in {
        "",
        "low",
        "sedentary",
        "none",
        "inactive",
    }:
        recommendations.append(
            {
                "en": (
                    "Aim for regular physical activity, such as walking, "
                    "cycling or swimming, as appropriate for your health condition."
                ),
                "hi": (
                    "अपनी स्वास्थ्य स्थिति के अनुसार नियमित शारीरिक गतिविधि "
                    "जैसे चलना, साइकिल चलाना या तैराकी करने का प्रयास करें।"
                ),
            }
        )

    # -------------------------------------------------------------------------
    # Family history
    # -------------------------------------------------------------------------

    if family_diabetes and dia_probability >= 0.20:
        recommendations.append(
            {
                "en": (
                    "Because of your diabetes risk and family history, "
                    "maintain regular glucose monitoring and preventive check-ups."
                ),
                "hi": (
                    "मधुमेह के जोखिम और पारिवारिक इतिहास को देखते हुए "
                    "नियमित रक्त शर्करा जाँच और स्वास्थ्य परीक्षण कराएँ।"
                ),
            }
        )

    if family_cvd and cvd_probability >= 0.20:
        recommendations.append(
            {
                "en": (
                    "Because of your cardiovascular risk and family history, "
                    "maintain regular blood pressure and cholesterol monitoring."
                ),
                "hi": (
                    "हृदय रोग के जोखिम और पारिवारिक इतिहास को देखते हुए "
                    "नियमित रक्तचाप और कोलेस्ट्रॉल की जाँच कराएँ।"
                ),
            }
        )

    # -------------------------------------------------------------------------
    # General recommendation
    # -------------------------------------------------------------------------

    if overall_level == "low":
        recommendations.append(
            {
                "en": (
                    "Continue healthy lifestyle practices and routine "
                    "preventive health monitoring."
                ),
                "hi": (
                    "स्वस्थ जीवनशैली और नियमित निवारक स्वास्थ्य निगरानी जारी रखें।"
                ),
            }
        )

    elif overall_level in {"high", "critical"}:
        recommendations.append(
            {
                "en": (
                    "Discuss your results with a qualified healthcare "
                    "professional and follow their recommended care plan."
                ),
                "hi": (
                    "अपने परिणामों के बारे में योग्य चिकित्सक से परामर्श करें "
                    "और उनके द्वारा सुझाई गई उपचार योजना का पालन करें।"
                ),
            }
        )

    # Remove duplicate English recommendations
    unique: List[Dict[str, str]] = []

    seen = set()

    for recommendation in recommendations:
        key = recommendation["en"]

        if key not in seen:
            unique.append(recommendation)
            seen.add(key)

    return unique[:8]


# =============================================================================
# PM-JAY HOSPITAL DATA
# =============================================================================

PMJAY_HOSPITALS = [
    {
        "name": "King George's Medical University",
        "city": "Lucknow",
        "phone": "0522-2257450",
    },
    {
        "name": "Ram Manohar Lohia Institute",
        "city": "Lucknow",
        "phone": "0522-4918500",
    },
    {
        "name": "GSVM Medical College",
        "city": "Kanpur",
        "phone": "0512-2531101",
    },
    {
        "name": "SN Medical College",
        "city": "Agra",
        "phone": "0562-2522600",
    },
    {
        "name": "BHU Institute of Medical Sciences",
        "city": "Varanasi",
        "phone": "0542-2367568",
    },
    {
        "name": "MLN Medical College",
        "city": "Prayagraj",
        "phone": "0532-2256760",
    },
    {
        "name": "Government Medical College",
        "city": "Gorakhpur",
        "phone": "0551-2200021",
    },
    {
        "name": "Rohilkhand Medical College",
        "city": "Bareilly",
        "phone": "0581-2303222",
    },
]


def get_nearby_hospitals(
    patient: Dict[str, Any],
) -> List[Dict[str, str]]:

    location = get_patient_location(
        patient
    ).lower()

    if not location:
        return PMJAY_HOSPITALS[:6]

    matching = [
        hospital
        for hospital in PMJAY_HOSPITALS
        if hospital["city"].lower() == location
    ]

    if matching:
        return matching[:6]

    partial_matching = [
        hospital
        for hospital in PMJAY_HOSPITALS
        if location in hospital["city"].lower()
        or hospital["city"].lower() in location
    ]

    if partial_matching:
        return partial_matching[:6]

    return PMJAY_HOSPITALS[:6]


# =============================================================================
# DISEASE FOCUS
# =============================================================================

def get_disease_focus(
    dia_probability: float,
    cvd_probability: float,
) -> tuple[str, str]:

    if dia_probability >= cvd_probability:
        return (
            "Diabetes",
            "मधुमेह",
        )

    return (
        "Cardiovascular Disease",
        "हृदय रोग",
    )


# =============================================================================
# PDF GENERATOR
# =============================================================================

def generate_pdf_report(
    patient: Dict[str, Any],
    prediction: Dict[str, Any],
    agent_summary: Optional[str] = None,
    language: str = "en",
    patient_name: Optional[str] = None,
) -> bytes:

    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import (
            ParagraphStyle,
            getSampleStyleSheet,
        )
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            HRFlowable,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )

    except ImportError as exc:
        raise RuntimeError(
            "reportlab is required: pip install reportlab"
        ) from exc

    patient = dict(patient or {})
    prediction = dict(prediction or {})

    # -------------------------------------------------------------------------
    # FONTS
    # -------------------------------------------------------------------------

    hindi_font = register_pdf_fonts()

    hindi_bold_font = (
        HINDI_BOLD_FONT
        if HINDI_BOLD_FONT in pdfmetrics.getRegisteredFontNames()
        else hindi_font
    )

    logger.info(
        "Generating PDF with English=%s Hindi=%s HindiBold=%s",
        ENGLISH_FONT,
        hindi_font,
        hindi_bold_font,
    )

    # -------------------------------------------------------------------------
    # DOCUMENT
    # -------------------------------------------------------------------------

    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"{APP_NAME} Health Report",
        author=APP_NAME,
    )

    styles = getSampleStyleSheet()

    # -------------------------------------------------------------------------
    # COLORS
    # -------------------------------------------------------------------------

    BLUE = colors.HexColor("#1a56db")
    GREEN = colors.HexColor("#0f9d58")
    RED = colors.HexColor("#db4437")
    AMBER = colors.HexColor("#f4b400")
    GREY = colors.HexColor("#5f6368")

    RISK_COLORS = {
        "low": GREEN,
        "moderate": AMBER,
        "high": RED,
        "critical": colors.purple,
    }

    # -------------------------------------------------------------------------
    # STYLE HELPERS
    # -------------------------------------------------------------------------

    def english_style(
        name: str,
        **kwargs: Any,
    ) -> ParagraphStyle:

        kwargs.setdefault(
            "fontName",
            ENGLISH_FONT,
        )

        return ParagraphStyle(
            name,
            parent=styles["Normal"],
            **kwargs,
        )

    def hindi_style(
        name: str,
        **kwargs: Any,
    ) -> ParagraphStyle:

        kwargs.setdefault(
            "fontName",
            hindi_font,
        )

        return ParagraphStyle(
            name,
            parent=styles["Normal"],
            **kwargs,
        )

    # -------------------------------------------------------------------------
    # ENGLISH STYLES
    # -------------------------------------------------------------------------

    heading1_en = english_style(
        "Heading1EN",
        fontSize=20,
        leading=24,
        textColor=BLUE,
        spaceAfter=4,
        alignment=TA_CENTER,
    )

    heading2_en = english_style(
        "Heading2EN",
        fontSize=13,
        leading=17,
        textColor=BLUE,
        spaceBefore=10,
        spaceAfter=4,
    )

    body_en = english_style(
        "BodyEN",
        fontSize=9,
        leading=13,
        spaceAfter=4,
    )

    small_en = english_style(
        "SmallEN",
        fontSize=8,
        leading=11,
        textColor=GREY,
        spaceAfter=3,
    )

    table_header_en = english_style(
        "TableHeaderEN",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )

    table_body_en = english_style(
        "TableBodyEN",
        fontSize=8,
        leading=10,
    )

    table_body_bold_en = english_style(
        "TableBodyBoldEN",
        fontSize=8,
        leading=10,
        fontName=ENGLISH_BOLD_FONT,
    )

    # -------------------------------------------------------------------------
    # HINDI STYLES
    # -------------------------------------------------------------------------

    heading2_hi = hindi_style(
        "Heading2HI",
        fontSize=12,
        leading=17,
        textColor=BLUE,
        spaceBefore=2,
        spaceAfter=5,
    )

    body_hi = hindi_style(
        "BodyHI",
        fontSize=9,
        leading=15,
        spaceAfter=5,
    )

    small_hi = hindi_style(
        "SmallHI",
        fontSize=8,
        leading=13,
        textColor=GREY,
        spaceAfter=3,
    )

    table_header_hi = hindi_style(
        "TableHeaderHI",
        fontSize=8,
        leading=11,
        textColor=colors.white,
    )

    table_body_hi = hindi_style(
        "TableBodyHI",
        fontSize=8,
        leading=12,
    )

    table_body_bold_hi = hindi_style(
        "TableBodyBoldHI",
        fontSize=8,
        leading=12,
        fontName=hindi_bold_font,
    )

    disclaimer_en = english_style(
        "DisclaimerEN",
        fontSize=7,
        leading=10,
        textColor=GREY,
        spaceAfter=3,
    )

    disclaimer_hi = hindi_style(
        "DisclaimerHI",
        fontSize=7,
        leading=11,
        textColor=GREY,
        spaceAfter=3,
    )

    footer_en = english_style(
        "FooterEN",
        fontSize=7,
        leading=10,
        textColor=GREY,
        alignment=TA_CENTER,
    )

    # -------------------------------------------------------------------------
    # PREDICTION DATA
    # -------------------------------------------------------------------------

    dia_risk = prediction.get(
        "diabetes_risk",
        {},
    )

    cvd_risk = prediction.get(
        "cardiovascular_risk",
        {},
    )

    if not isinstance(dia_risk, dict):
        dia_risk = {}

    if not isinstance(cvd_risk, dict):
        cvd_risk = {}

    dia_probability = safe_float(
        dia_risk.get("probability")
    )

    cvd_probability = safe_float(
        cvd_risk.get("probability")
    )

    if dia_probability is None:
        dia_probability = 0.0

    if cvd_probability is None:
        cvd_probability = 0.0

    dia_probability = max(
        0.0,
        min(dia_probability, 1.0),
    )

    cvd_probability = max(
        0.0,
        min(cvd_probability, 1.0),
    )

    dia_level = str(
        dia_risk.get(
            "risk_level",
            "",
        )
    ).lower()

    cvd_level = str(
        cvd_risk.get(
            "risk_level",
            "",
        )
    ).lower()

    if dia_level not in RISK_PLAIN_ENGLISH:
        dia_level = get_report_risk_level(
            dia_probability
        )

    if cvd_level not in RISK_PLAIN_ENGLISH:
        cvd_level = get_report_risk_level(
            cvd_probability
        )

    combined_score = safe_float(
        prediction.get(
            "combined_risk_score"
        )
    )

    if combined_score is None:
        combined_score = (
            dia_probability + cvd_probability
        ) / 2

    combined_score = max(
        0.0,
        min(combined_score, 1.0),
    )

    overall_level = get_report_risk_level(
        combined_score
    )

    overall_risk_label_en = (
        RISK_PLAIN_ENGLISH[
            overall_level
        ][0]
    )

    overall_risk_label_hi = (
        RISK_PLAIN_HINDI[
            overall_level
        ][0]
    )

    disease_focus_en, disease_focus_hi = get_disease_focus(
        dia_probability,
        cvd_probability,
    )

    # -------------------------------------------------------------------------
    # PATIENT DATA
    # -------------------------------------------------------------------------

    patient_name_value = get_patient_name(
        patient,
        patient_name,
    )

    age_value = clean_text(
        patient.get("age")
    )

    gender_value_en = get_gender_english(
        patient.get("gender")
    )

    gender_value_hi = get_gender_hindi(
        patient.get("gender")
    )

    report_id = clean_text(
        prediction.get(
            "prediction_id"
        )
    )

    if report_id != "—" and len(report_id) > 12:
        report_id = report_id[:12] + "..."

    model_version = clean_text(
        prediction.get(
            "model_version",
            APP_VERSION,
        )
    )

    generated_at = datetime.now()

    generated_date = generated_at.strftime(
        "%d %b %Y"
    )

    generated_datetime = generated_at.strftime(
        "%d %b %Y %H:%M"
    )

    # -------------------------------------------------------------------------
    # STORY
    # -------------------------------------------------------------------------

    story: List[Any] = []

    # =========================================================================
    # HEADER
    # =========================================================================

    story.append(
        Paragraph(
            APP_NAME,
            heading1_en,
        )
    )

    story.append(
        Paragraph(
            "Personalised Health Risk Report",
            english_style(
                "ReportTitleEN",
                fontSize=10,
                leading=14,
                alignment=TA_CENTER,
                textColor=GREY,
            ),
        )
    )

    story.append(
        Paragraph(
            "व्यक्तिगत स्वास्थ्य जोखिम रिपोर्ट",
            hindi_style(
                "ReportTitleHI",
                fontSize=10,
                leading=16,
                alignment=TA_CENTER,
                textColor=GREY,
            ),
        )
    )

    story.append(
        Spacer(
            1,
            0.3 * cm,
        )
    )

    story.append(
        HRFlowable(
            width="100%",
            thickness=2,
            color=BLUE,
        )
    )

    story.append(
        Spacer(
            1,
            0.2 * cm,
        )
    )

    # =========================================================================
    # PATIENT METADATA
    # =========================================================================

    metadata = [
        [
            Paragraph(
                "Patient",
                table_body_bold_en,
            ),
            Paragraph(
                patient_name_value,
                table_body_en,
            ),
            Paragraph(
                "Date",
                table_body_bold_en,
            ),
            Paragraph(
                generated_date,
                table_body_en,
            ),
        ],
        [
            Paragraph(
                "रोगी",
                table_body_bold_hi,
            ),
            Paragraph(
                patient_name_value,
                table_body_hi,
            ),
            Paragraph(
                "दिनांक",
                table_body_bold_hi,
            ),
            Paragraph(
                generated_date,
                table_body_hi,
            ),
        ],
        [
            Paragraph(
                "Age",
                table_body_bold_en,
            ),
            Paragraph(
                age_value,
                table_body_en,
            ),
            Paragraph(
                "Gender",
                table_body_bold_en,
            ),
            Paragraph(
                gender_value_en,
                table_body_en,
            ),
        ],
        [
            Paragraph(
                "आयु",
                table_body_bold_hi,
            ),
            Paragraph(
                age_value,
                table_body_hi,
            ),
            Paragraph(
                "लिंग",
                table_body_bold_hi,
            ),
            Paragraph(
                gender_value_hi,
                table_body_hi,
            ),
        ],
        [
            Paragraph(
                "Report ID",
                table_body_bold_en,
            ),
            Paragraph(
                report_id,
                table_body_en,
            ),
            Paragraph(
                "Model",
                table_body_bold_en,
            ),
            Paragraph(
                model_version,
                table_body_en,
            ),
        ],
    ]

    metadata_table = Table(
        metadata,
        colWidths=[
            3.5 * cm,
            5 * cm,
            3.5 * cm,
            5 * cm,
        ],
    )

    metadata_table.setStyle(
        TableStyle(
            [
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (0, -1),
                    GREY,
                ),
                (
                    "TEXTCOLOR",
                    (2, 0),
                    (2, -1),
                    GREY,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    3,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    3,
                ),
            ]
        )
    )

    story.append(metadata_table)

    story.append(
        Spacer(
            1,
            0.35 * cm,
        )
    )

    # =========================================================================
    # RISK SUMMARY
    # =========================================================================

    story.append(
        Paragraph(
            "Risk Summary",
            heading2_en,
        )
    )

    story.append(
        Paragraph(
            "जोखिम सारांश",
            heading2_hi,
        )
    )

    story.append(
        HRFlowable(
            width="100%",
            thickness=0.5,
            color=colors.lightgrey,
        )
    )

    story.append(
        Spacer(
            1,
            0.2 * cm,
        )
    )

    risk_rows = [
        [
            Paragraph(
                "Disease",
                table_header_en,
            ),
            Paragraph(
                "Probability",
                table_header_en,
            ),
            Paragraph(
                "Risk Level",
                table_header_en,
            ),
        ],
        [
            Paragraph(
                "Diabetes",
                table_body_en,
            ),
            Paragraph(
                f"{dia_probability * 100:.1f}%",
                table_body_en,
            ),
            Paragraph(
                RISK_PLAIN_ENGLISH[dia_level][0],
                table_body_bold_en,
            ),
        ],
        [
            Paragraph(
                "Cardiovascular Disease",
                table_body_en,
            ),
            Paragraph(
                f"{cvd_probability * 100:.1f}%",
                table_body_en,
            ),
            Paragraph(
                RISK_PLAIN_ENGLISH[cvd_level][0],
                table_body_bold_en,
            ),
        ],
        [
            Paragraph(
                "Combined Score",
                table_body_en,
            ),
            Paragraph(
                f"{combined_score * 100:.1f}%",
                table_body_bold_en,
            ),
            Paragraph(
                f"Overall: {overall_risk_label_en}",
                table_body_bold_en,
            ),
        ],
    ]

    risk_table = Table(
        risk_rows,
        colWidths=[
            6 * cm,
            4 * cm,
            7 * cm,
        ],
    )

    risk_table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    BLUE,
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.white,
                        colors.HexColor("#f8f9fa"),
                    ],
                ),
                (
                    "TEXTCOLOR",
                    (2, 1),
                    (2, 1),
                    RISK_COLORS.get(
                        dia_level,
                        GREY,
                    ),
                ),
                (
                    "TEXTCOLOR",
                    (2, 2),
                    (2, 2),
                    RISK_COLORS.get(
                        cvd_level,
                        GREY,
                    ),
                ),
                (
                    "TEXTCOLOR",
                    (2, 3),
                    (2, 3),
                    RISK_COLORS.get(
                        overall_level,
                        GREY,
                    ),
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.lightgrey,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
            ]
        )
    )

    story.append(risk_table)

    story.append(
        Spacer(
            1,
            0.2 * cm,
        )
    )

    # =========================================================================
    # HINDI RISK SUMMARY
    # =========================================================================

    hindi_risk_table = Table(
        [
            [
                Paragraph(
                    "रोग",
                    table_header_hi,
                ),
                Paragraph(
                    "संभावना",
                    table_header_hi,
                ),
                Paragraph(
                    "जोखिम स्तर",
                    table_header_hi,
                ),
            ],
            [
                Paragraph(
                    "मधुमेह",
                    table_body_hi,
                ),
                Paragraph(
                    f"{dia_probability * 100:.1f}%",
                    table_body_hi,
                ),
                Paragraph(
                    RISK_PLAIN_HINDI[dia_level][0],
                    table_body_bold_hi,
                ),
            ],
            [
                Paragraph(
                    "हृदय रोग",
                    table_body_hi,
                ),
                Paragraph(
                    f"{cvd_probability * 100:.1f}%",
                    table_body_hi,
                ),
                Paragraph(
                    RISK_PLAIN_HINDI[cvd_level][0],
                    table_body_bold_hi,
                ),
            ],
            [
                Paragraph(
                    "संयुक्त स्कोर",
                    table_body_hi,
                ),
                Paragraph(
                    f"{combined_score * 100:.1f}%",
                    table_body_bold_hi,
                ),
                Paragraph(
                    f"समग्र: {overall_risk_label_hi}",
                    table_body_bold_hi,
                ),
            ],
        ],
        colWidths=[
            6 * cm,
            4 * cm,
            7 * cm,
        ],
    )

    hindi_risk_table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    BLUE,
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.white,
                        colors.HexColor("#f8f9fa"),
                    ],
                ),
                (
                    "TEXTCOLOR",
                    (2, 1),
                    (2, 1),
                    RISK_COLORS.get(
                        dia_level,
                        GREY,
                    ),
                ),
                (
                    "TEXTCOLOR",
                    (2, 2),
                    (2, 2),
                    RISK_COLORS.get(
                        cvd_level,
                        GREY,
                    ),
                ),
                (
                    "TEXTCOLOR",
                    (2, 3),
                    (2, 3),
                    RISK_COLORS.get(
                        overall_level,
                        GREY,
                    ),
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.lightgrey,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
            ]
        )
    )

    story.append(hindi_risk_table)

    story.append(
        Spacer(
            1,
            0.3 * cm,
        )
    )

    # =========================================================================
    # RISK INTERPRETATION
    # =========================================================================

    story.append(
        Paragraph(
            "Risk Interpretation",
            heading2_en,
        )
    )

    story.append(
        Paragraph(
            "जोखिम की व्याख्या",
            heading2_hi,
        )
    )

    story.append(
        HRFlowable(
            width="100%",
            thickness=0.5,
            color=colors.lightgrey,
        )
    )

    story.append(
        Spacer(
            1,
            0.15 * cm,
        )
    )

    story.append(
        Paragraph(
            f"Diabetes: {RISK_PLAIN_ENGLISH[dia_level][1]}",
            body_en,
        )
    )

    story.append(
        Paragraph(
            f"मधुमेह: {RISK_PLAIN_HINDI[dia_level][1]}",
            body_hi,
        )
    )

    story.append(
        Paragraph(
            f"Cardiovascular Disease: {RISK_PLAIN_ENGLISH[cvd_level][1]}",
            body_en,
        )
    )

    story.append(
        Paragraph(
            f"हृदय रोग: {RISK_PLAIN_HINDI[cvd_level][1]}",
            body_hi,
        )
    )

    story.append(
        Spacer(
            1,
            0.25 * cm,
        )
    )

    # =========================================================================
    # SHAP FACTORS
    # =========================================================================

    shap_feats = dia_risk.get(
        "shap_features",
        [],
    )

    if isinstance(shap_feats, list) and shap_feats:

        story.append(
            Paragraph(
                "Key Risk Factors",
                heading2_en,
            )
        )

        story.append(
            Paragraph(
                "मुख्य जोखिम कारक",
                heading2_hi,
            )
        )

        story.append(
            HRFlowable(
                width="100%",
                thickness=0.5,
                color=colors.lightgrey,
            )
        )

        story.append(
            Spacer(
                1,
                0.15 * cm,
            )
        )

        story.append(
            Paragraph(
                "The following factors had the most influence on your prediction:",
                body_en,
            )
        )

        for line in _shap_to_plain(
            shap_feats,
            "en",
        ):
            story.append(
                Paragraph(
                    line,
                    body_en,
                )
            )

        story.append(
            Paragraph(
                "इन कारकों का आपकी भविष्यवाणी पर सबसे अधिक प्रभाव पड़ा:",
                body_hi,
            )
        )

        for line in _shap_to_plain(
            shap_feats,
            "hi",
        ):
            story.append(
                Paragraph(
                    line,
                    body_hi,
                )
            )

        story.append(
            Spacer(
                1,
                0.25 * cm,
            )
        )

    # =========================================================================
    # PERSONALIZED LIFESTYLE RECOMMENDATIONS
    # =========================================================================

    story.append(
        Paragraph(
            "Lifestyle Recommendations",
            heading2_en,
        )
    )

    story.append(
        Paragraph(
            "जीवनशैली सुझाव",
            heading2_hi,
        )
    )

    story.append(
        HRFlowable(
            width="100%",
            thickness=0.5,
            color=colors.lightgrey,
        )
    )

    story.append(
        Spacer(
            1,
            0.15 * cm,
        )
    )

    recommendations = generate_lifestyle_recommendations(
        patient=patient,
        dia_probability=dia_probability,
        cvd_probability=cvd_probability,
        overall_level=overall_level,
    )

    for index, recommendation in enumerate(
        recommendations,
        start=1,
    ):

        story.append(
            Paragraph(
                f"{index}. {recommendation['en']}",
                body_en,
            )
        )

        story.append(
            Paragraph(
                f"{index}. {recommendation['hi']}",
                body_hi,
            )
        )

    story.append(
        Spacer(
            1,
            0.25 * cm,
        )
    )

    # =========================================================================
    # AI CLINICAL ASSESSMENT
    # =========================================================================

    story.append(
        Paragraph(
            "AI Clinical Assessment",
            heading2_en,
        )
    )

    story.append(
        Paragraph(
            "AI नैदानिक मूल्यांकन",
            heading2_hi,
        )
    )

    story.append(
        HRFlowable(
            width="100%",
            thickness=0.5,
            color=colors.lightgrey,
        )
    )

    story.append(
        Spacer(
            1,
            0.15 * cm,
        )
    )

    assessment_text_en = (
        f"Assessment focus: {disease_focus_en}. "
        f"Overall risk level: {overall_risk_label_en}. "
    )

    if overall_level == "low":

        assessment_text_en += (
            "Your current overall risk score is relatively low. "
            "Continue healthy lifestyle practices and routine monitoring."
        )

    elif overall_level == "moderate":

        assessment_text_en += (
            "Some risk factors are elevated. "
            "Lifestyle changes and regular monitoring are recommended."
        )

    elif overall_level == "high":

        assessment_text_en += (
            "The overall risk score is elevated. "
            "Please discuss these findings with a qualified healthcare professional."
        )

    else:

        assessment_text_en += (
            "The overall risk score is at a critical level. "
            "Seek medical attention promptly and discuss the findings "
            "with a qualified healthcare professional."
        )

    assessment_text_en += (
        " This is decision support only. "
        "Always confirm findings with a qualified clinician."
    )

    story.append(
        Paragraph(
            assessment_text_en,
            body_en,
        )
    )

    assessment_text_hi = (
        f"मूल्यांकन: {disease_focus_hi}। "
        f"समग्र जोखिम स्तर: {overall_risk_label_hi}। "
    )

    if overall_level == "low":

        assessment_text_hi += (
            "आपका वर्तमान समग्र जोखिम स्तर अपेक्षाकृत कम है। "
            "स्वस्थ जीवनशैली और नियमित निगरानी जारी रखें।"
        )

    elif overall_level == "moderate":

        assessment_text_hi += (
            "कुछ जोखिम कारक बढ़े हुए हैं। "
            "जीवनशैली में बदलाव और नियमित निगरानी की सलाह दी जाती है।"
        )

    elif overall_level == "high":

        assessment_text_hi += (
            "समग्र जोखिम स्तर बढ़ा हुआ है। "
            "इन परिणामों के बारे में योग्य चिकित्सक से परामर्श करें।"
        )

    else:

        assessment_text_hi += (
            "समग्र जोखिम स्तर गंभीर है। "
            "तुरंत चिकित्सा सहायता लें और योग्य चिकित्सक से परामर्श करें।"
        )

    assessment_text_hi += (
        " यह रिपोर्ट केवल निर्णय समर्थन के लिए है। "
        "निष्कर्षों की पुष्टि योग्य चिकित्सक से करें।"
    )

    story.append(
        Paragraph(
            assessment_text_hi,
            body_hi,
        )
    )

    # -------------------------------------------------------------------------
    # Optional AI agent summary
    # -------------------------------------------------------------------------

    if agent_summary:

        clean_agent_summary = str(
            agent_summary
        ).strip()

        if clean_agent_summary:

            story.append(
                Spacer(
                    1,
                    0.1 * cm,
                )
            )

            story.append(
                Paragraph(
                    "AI Assistant Summary",
                    heading2_en,
                )
            )

            story.append(
                Paragraph(
                    "AI सहायक सारांश",
                    heading2_hi,
                )
            )

            story.append(
                Paragraph(
                    clean_agent_summary,
                    body_en,
                )
            )

    story.append(
        Spacer(
            1,
            0.25 * cm,
        )
    )

    # =========================================================================
    # PM-JAY HOSPITALS
    # =========================================================================

    story.append(
        Paragraph(
            "Nearby Ayushman Bharat (PM-JAY) Hospitals",
            heading2_en,
        )
    )

    story.append(
        Paragraph(
            "आयुष्मान भारत (PM-JAY) अस्पताल",
            heading2_hi,
        )
    )

    story.append(
        HRFlowable(
            width="100%",
            thickness=0.5,
            color=colors.lightgrey,
        )
    )

    story.append(
        Spacer(
            1,
            0.15 * cm,
        )
    )

    location = get_patient_location(
        patient
    )

    if location:

        story.append(
            Paragraph(
                f"Hospital information for: {location}",
                body_en,
            )
        )

        story.append(
            Paragraph(
                f"स्थान के लिए अस्पताल की जानकारी: {location}",
                body_hi,
            )
        )

    else:

        story.append(
            Paragraph(
                "Hospital information available from the configured PM-JAY list.",
                body_en,
            )
        )

        story.append(
            Paragraph(
                "अस्पताल की जानकारी उपलब्ध PM-JAY सूची से ली गई है।",
                body_hi,
            )
        )

    hospitals = get_nearby_hospitals(
        patient
    )

    hospital_rows = [
        [
            Paragraph(
                "Hospital Name",
                table_header_en,
            ),
            Paragraph(
                "City",
                table_header_en,
            ),
            Paragraph(
                "Phone",
                table_header_en,
            ),
        ]
    ]

    for hospital in hospitals:

        hospital_rows.append(
            [
                Paragraph(
                    hospital["name"],
                    table_body_en,
                ),
                Paragraph(
                    hospital["city"],
                    table_body_en,
                ),
                Paragraph(
                    hospital["phone"],
                    table_body_en,
                ),
            ]
        )

    hospital_table = Table(
        hospital_rows,
        colWidths=[
            9 * cm,
            4 * cm,
            4 * cm,
        ],
        repeatRows=1,
    )

    hospital_table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    GREEN,
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.white,
                        colors.HexColor("#f0fff4"),
                    ],
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.4,
                    colors.lightgrey,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    4,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
            ]
        )
    )

    story.append(hospital_table)

    story.append(
        Spacer(
            1,
            0.25 * cm,
        )
    )

    story.append(
        Paragraph(
            "अस्पताल में जाने से पहले उपलब्ध सेवाओं और PM-JAY कवरेज की पुष्टि करें।",
            small_hi,
        )
    )

    # =========================================================================
    # DISCLAIMER
    # =========================================================================

    story.append(
        HRFlowable(
            width="100%",
            thickness=1,
            color=BLUE,
        )
    )

    story.append(
        Spacer(
            1,
            0.15 * cm,
        )
    )

    story.append(
        Paragraph(
            "DISCLAIMER",
            disclaimer_en,
        )
    )

    story.append(
        Paragraph(
            f"This report is generated by {APP_NAME} for decision "
            "support only. It is NOT a medical diagnosis.",
            disclaimer_en,
        )
    )

    story.append(
        Paragraph(
            "Always consult a qualified healthcare professional.",
            disclaimer_en,
        )
    )

    story.append(
        Paragraph(
            "अस्वीकरण",
            disclaimer_hi,
        )
    )

    story.append(
        Paragraph(
            "यह रिपोर्ट केवल निर्णय समर्थन के लिए है। "
            "यह चिकित्सीय निदान नहीं है।",
            disclaimer_hi,
        )
    )

    story.append(
        Paragraph(
            "किसी भी चिकित्सकीय निर्णय के लिए योग्य चिकित्सक से परामर्श करें।",
            disclaimer_hi,
        )
    )

    story.append(
        Spacer(
            1,
            0.1 * cm,
        )
    )

    # =========================================================================
    # FOOTER
    # =========================================================================

    footer_text = (
        f"Generated by {APP_NAME} v{APP_VERSION} | "
        f"{generated_datetime} IST | "
        f"{ORGANIZATION_NAME}, {ORGANIZATION_CITY} | "
        f"{UNIVERSITY_NAME}, {UNIVERSITY_CITY}"
    )

    story.append(
        Paragraph(
            footer_text,
            footer_en,
        )
    )

    # =========================================================================
    # BUILD
    # =========================================================================

    doc.build(story)

    return buf.getvalue()