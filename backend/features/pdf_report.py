"""
MediGuard AI — Feature 4: Personalised Health Report PDF Generator
Produces a branded, bilingual (Hindi + English) PDF after each assessment.
Includes: risk scores, SHAP explanation in plain language, lifestyle
recommendations, and nearest PMJAY empanelled hospital information.

Uses ReportLab for PDF generation (no external LaTeX required).
"""

from __future__ import annotations

import io
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# PMJAY empanelled hospitals (sample — in production, load from NHA API)
PMJAY_HOSPITALS = [
    {"name": "King George's Medical University",      "city": "Lucknow",    "phone": "0522-2257450"},
    {"name": "Ram Manohar Lohia Institute",           "city": "Lucknow",    "phone": "0522-4918500"},
    {"name": "GSVM Medical College",                  "city": "Kanpur",     "phone": "0512-2531101"},
    {"name": "SN Medical College",                    "city": "Agra",       "phone": "0562-2522600"},
    {"name": "BHU Institute of Medical Sciences",     "city": "Varanasi",   "phone": "0542-2367568"},
    {"name": "MLN Medical College",                   "city": "Prayagraj",  "phone": "0532-2256760"},
    {"name": "Government Medical College",            "city": "Gorakhpur",  "phone": "0551-2200021"},
    {"name": "Rohilkhand Medical College",            "city": "Bareilly",   "phone": "0581-2303222"},
]

RISK_PLAIN_ENGLISH = {
    "low":      ("Low Risk",      "Your current readings are within healthy ranges. Continue healthy habits."),
    "moderate": ("Moderate Risk", "Some risk factors are elevated. Lifestyle changes are recommended now."),
    "high":     ("High Risk",     "Significant risk factors detected. Medical consultation is strongly advised."),
    "critical": ("Critical Risk", "Multiple risk factors are at dangerous levels. Seek medical care urgently."),
}

RISK_PLAIN_HINDI = {
    "low":      ("कम जोखिम",       "आपकी रीडिंग सामान्य सीमा में हैं। स्वस्थ आदतें जारी रखें।"),
    "moderate": ("मध्यम जोखिम",    "कुछ जोखिम कारक बढ़े हुए हैं। अभी जीवनशैली में बदलाव की सलाह है।"),
    "high":     ("उच्च जोखिम",     "महत्वपूर्ण जोखिम कारक पाए गए। चिकित्सकीय परामर्श की दृढ़ता से सलाह दी जाती है।"),
    "critical": ("गंभीर जोखिम",    "अनेक जोखिम कारक खतरनाक स्तर पर हैं। तुरंत चिकित्सा सहायता लें।"),
}

LIFESTYLE_RECS_EN = [
    "Eat a low glycaemic index diet: whole grains, legumes, vegetables, fruits.",
    "Exercise at least 150 minutes/week — brisk walking, cycling, or swimming.",
    "Reduce salt intake to less than 5g per day to manage blood pressure.",
    "Quit smoking — CVD risk halves within 1-2 years of cessation.",
    "Limit alcohol to less than 2 units per day.",
    "Monitor blood glucose and blood pressure regularly at home.",
    "Attend annual health check-ups under Ayushman Bharat (PM-JAY).",
    "Practice stress management: yoga, meditation, or deep breathing daily.",
]

LIFESTYLE_RECS_HI = [
    "कम ग्लाइसेमिक इंडेक्स वाला भोजन करें: साबुत अनाज, दालें, सब्जियाँ, फल।",
    "सप्ताह में कम से कम 150 मिनट व्यायाम करें — तेज चलना, साइकिल चलाना।",
    "रक्तचाप नियंत्रण के लिए नमक 5 ग्राम प्रतिदिन से कम रखें।",
    "धूम्रपान छोड़ें — बंद करने के 1-2 साल में हृदय रोग का खतरा आधा हो जाता है।",
    "शराब प्रतिदिन 2 यूनिट से कम लें।",
    "घर पर नियमित रक्त शर्करा और रक्तचाप की जाँच करें।",
    "आयुष्मान भारत (PM-JAY) के तहत वार्षिक स्वास्थ्य जाँच कराएँ।",
    "तनाव प्रबंधन करें: योग, ध्यान या गहरी साँस का अभ्यास करें।",
]


def _shap_to_plain(features: List[Dict], language: str = "en") -> List[str]:
    """Convert SHAP feature list to human-readable sentences."""
    sentences = []
    LABELS_EN = {
        "fasting_glucose":         "fasting blood glucose",
        "hba1c":                   "HbA1c (3-month average blood sugar)",
        "bmi":                     "body mass index (BMI)",
        "blood_pressure_systolic": "systolic blood pressure",
        "smoking":                 "smoking status",
        "cholesterol_ldl":         "LDL (bad) cholesterol",
        "triglycerides":           "triglycerides",
        "age":                     "age",
        "family_history_diabetes": "family history of diabetes",
        "family_history_cvd":      "family history of heart disease",
    }
    LABELS_HI = {
        "fasting_glucose":         "खाली पेट रक्त शर्करा",
        "hba1c":                   "HbA1c (3-माह औसत रक्त शर्करा)",
        "bmi":                     "बॉडी मास इंडेक्स (BMI)",
        "blood_pressure_systolic": "सिस्टोलिक रक्तचाप",
        "smoking":                 "धूम्रपान",
        "cholesterol_ldl":         "LDL (खराब) कोलेस्ट्रॉल",
        "triglycerides":           "ट्राइग्लिसराइड्स",
        "age":                     "आयु",
        "family_history_diabetes": "मधुमेह का पारिवारिक इतिहास",
        "family_history_cvd":      "हृदय रोग का पारिवारिक इतिहास",
    }
    labels = LABELS_HI if language == "hi" else LABELS_EN

    for f in features[:6]:
        fname = labels.get(f.get("feature", ""), f.get("feature", ""))
        impact = f.get("impact", "increases")
        if language == "hi":
            direction = "बढ़ाता है" if impact == "increases" else "घटाता है"
            sentences.append(f"• {fname} आपका जोखिम {direction}।")
        else:
            direction = "increases" if impact == "increases" else "decreases"
            sentences.append(f"• Your {fname} {direction} your risk.")
    return sentences


def generate_pdf_report(
    patient: Dict[str, Any],
    prediction: Dict[str, Any],
    agent_summary: Optional[str] = None,
    language: str = "en",
    patient_name: str = "Patient",
) -> bytes:
    """
    Generate a complete health report PDF.
    Returns raw PDF bytes.
    """
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable, KeepTogether,
        )
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        raise RuntimeError("reportlab is required: pip install reportlab")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )

    styles = getSampleStyleSheet()
    BLUE  = colors.HexColor("#1a56db")
    GREEN = colors.HexColor("#0f9d58")
    RED   = colors.HexColor("#db4437")
    AMBER = colors.HexColor("#f4b400")
    GREY  = colors.HexColor("#5f6368")

    RISK_COLORS_RL = {
        "low": GREEN, "moderate": AMBER, "high": RED, "critical": colors.purple,
    }

    def style(name, **kw):
        s = ParagraphStyle(name, parent=styles["Normal"], **kw)
        return s

    heading1 = style("h1", fontSize=20, textColor=BLUE, spaceAfter=6,
                     fontName="Helvetica-Bold", alignment=TA_CENTER)
    heading2 = style("h2", fontSize=13, textColor=BLUE, spaceAfter=4,
                     fontName="Helvetica-Bold", spaceBefore=12)
    body      = style("body", fontSize=9, leading=14, spaceAfter=4)
    small     = style("small", fontSize=8, textColor=GREY, leading=12)
    risk_label_style = style("risk", fontSize=11, fontName="Helvetica-Bold")

    dia_risk  = prediction.get("diabetes_risk", {})
    cvd_risk  = prediction.get("cardiovascular_risk", {})
    dia_level = dia_risk.get("risk_level", "moderate")
    cvd_level = cvd_risk.get("risk_level", "moderate")

    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    story.append(Paragraph("🛡 MediGuard AI", heading1))
    story.append(Paragraph("Personalised Health Risk Report / व्यक्तिगत स्वास्थ्य जोखिम रिपोर्ट", style("sub", fontSize=10, alignment=TA_CENTER, textColor=GREY)))
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="100%", thickness=2, color=BLUE))
    story.append(Spacer(1, 0.2*cm))

    meta = [
        ["Patient / रोगी:", patient_name,
         "Date / दिनांक:", datetime.now().strftime("%d %b %Y")],
        ["Age / आयु:", str(patient.get("age", "—")),
         "Gender / लिंग:", str(patient.get("gender", "—")).title()],
        ["Report ID:", prediction.get("prediction_id", "—")[:12] + "...",
         "Model v:", prediction.get("model_version", "1.0.0")],
    ]
    t = Table(meta, colWidths=[3.5*cm, 5*cm, 3.5*cm, 5*cm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("TEXTCOLOR", (0,0), (0,-1), GREY),
        ("TEXTCOLOR", (2,0), (2,-1), GREY),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.4*cm))

    # ── Risk Summary ─────────────────────────────────────────────────────────
    story.append(Paragraph("Risk Summary / जोखिम सारांश", heading2))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 0.2*cm))

    risk_rows = [
        ["Disease / रोग", "Probability / संभावना", "Risk Level / जोखिम स्तर"],
        ["Diabetes / मधुमेह",
         f"{dia_risk.get('probability', 0)*100:.1f}%",
         RISK_PLAIN_ENGLISH[dia_level][0] + f" ({dia_level.title()})"],
        ["Cardiovascular / हृदय रोग",
         f"{cvd_risk.get('probability', 0)*100:.1f}%",
         RISK_PLAIN_ENGLISH[cvd_level][0] + f" ({cvd_level.title()})"],
        ["Combined Score / संयुक्त स्कोर",
         f"{prediction.get('combined_risk_score', 0)*100:.1f}%", ""],
    ]
    rt = Table(risk_rows, colWidths=[6*cm, 4*cm, 7*cm])
    rt.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), BLUE),
        ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
        ("FONTNAME",   (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",   (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f8f9fa")]),
        ("TEXTCOLOR",  (2,1), (2,1), RISK_COLORS_RL.get(dia_level, GREY)),
        ("TEXTCOLOR",  (2,2), (2,2), RISK_COLORS_RL.get(cvd_level, GREY)),
        ("FONTNAME",   (2,1), (2,2), "Helvetica-Bold"),
        ("GRID", (0,0), (-1,-1), 0.5, colors.lightgrey),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(rt)
    story.append(Spacer(1, 0.3*cm))

    # Plain-language interpretation (bilingual)
    for level, label_map, plain_map in [(dia_level, "Diabetes", RISK_PLAIN_ENGLISH), (cvd_level, "CVD", RISK_PLAIN_ENGLISH)]:
        msg_en = plain_map[level][1]
        msg_hi = RISK_PLAIN_HINDI[level][1]
        story.append(Paragraph(f"<b>{label_map}:</b> {msg_en}", body))
        story.append(Paragraph(f"<i>{msg_hi}</i>", small))
    story.append(Spacer(1, 0.3*cm))

    # ── What's Driving Your Risk (SHAP) ─────────────────────────────────────
    shap_feats = dia_risk.get("shap_features", [])
    if shap_feats:
        story.append(Paragraph("Key Risk Factors / मुख्य जोखिम कारक", heading2))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph("The following factors had the most influence on your prediction:", body))
        for line in _shap_to_plain(shap_feats, "en"):
            story.append(Paragraph(line, body))
        story.append(Spacer(1, 0.1*cm))
        story.append(Paragraph("इन कारकों का आपकी भविष्यवाणी पर सबसे अधिक प्रभाव पड़ा:", small))
        for line in _shap_to_plain(shap_feats, "hi"):
            story.append(Paragraph(line, small))
        story.append(Spacer(1, 0.3*cm))

    # ── Lifestyle Recommendations ─────────────────────────────────────────────
    story.append(Paragraph("Lifestyle Recommendations / जीवनशैली सुझाव", heading2))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 0.2*cm))
    for en, hi in zip(LIFESTYLE_RECS_EN, LIFESTYLE_RECS_HI):
        story.append(Paragraph(f"• {en}", body))
        story.append(Paragraph(f"  <i>{hi}</i>", small))
    story.append(Spacer(1, 0.3*cm))

    # ── AI Agent Summary (if provided) ────────────────────────────────────────
    if agent_summary:
        story.append(Paragraph("AI Clinical Assessment / AI नैदानिक मूल्यांकन", heading2))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph(agent_summary[:1200], body))
        story.append(Spacer(1, 0.3*cm))

    # ── PMJAY Hospitals ───────────────────────────────────────────────────────
    story.append(Paragraph("Nearby Ayushman Bharat (PM-JAY) Hospitals / आयुष्मान भारत अस्पताल", heading2))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph("These government hospitals provide free treatment under PM-JAY / ये सरकारी अस्पताल PM-JAY के तहत मुफ्त इलाज देते हैं:", small))
    story.append(Spacer(1, 0.15*cm))

    hosp_rows = [["Hospital Name", "City", "Phone"]] + [
        [h["name"], h["city"], h["phone"]] for h in PMJAY_HOSPITALS[:6]
    ]
    ht = Table(hosp_rows, colWidths=[9*cm, 4*cm, 4*cm])
    ht.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), GREEN),
        ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
        ("FONTNAME",   (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",   (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f0fff4")]),
        ("GRID", (0,0), (-1,-1), 0.4, colors.lightgrey),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    story.append(ht)
    story.append(Spacer(1, 0.4*cm))

    # ── Disclaimer ────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        "⚠ DISCLAIMER / अस्वीकरण: This report is generated by MediGuard AI for decision "
        "support only. It is NOT a medical diagnosis. Always consult a qualified healthcare "
        "professional. / यह रिपोर्ट केवल निर्णय समर्थन के लिए है। यह चिकित्सीय निदान नहीं है।",
        style("disc", fontSize=7, textColor=GREY, spaceBefore=4),
    ))
    story.append(Paragraph(
        f"Generated by MediGuard AI v1.0 | {datetime.now().strftime('%d %b %Y %H:%M')} IST | "
        "United College of Engineering & Research, Prayagraj | AKTU, Lucknow",
        style("footer", fontSize=7, textColor=GREY, alignment=TA_CENTER),
    ))

    doc.build(story)
    return buf.getvalue()
