"""MediGuard clinical multi-agent orchestrator — real LangGraph StateGraph.

Five nodes, run as a compiled `langgraph.graph.StateGraph`:
    SymptomAgent -> ReportAgent -> RAGAgent -> AyurvedaAgent -> CoordinatorAgent

An emergency-priority patient takes a conditional shortcut straight from
ReportAgent to CoordinatorAgent, skipping RAG/Ayurveda retrieval latency.

Every I/O-touching node (ML model, Chroma retriever, LLM provider) is wrapped
so a missing/unreachable dependency degrades that node's output instead of
raising — this graph must never crash the whole pipeline just because, say,
Groq is unreachable or Chroma isn't installed in this environment. That
fragility is the reason the LangGraph path was ripped out and hand-rolled in
the first place; this rewrite fixes the branding mismatch without
reintroducing the crash.

The public contract is unchanged from the previous hand-rolled orchestrator:
`get_agent_graph().ainvoke(initial_state)` returns a state dict containing
prediction_result, symptom_output, report_output, rag_output, and
coordinator_output, so api/routes/agents.py and the frontend don't need to
change.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from ml.model import get_model

logger = logging.getLogger(__name__)

RISK_ORDER = {"low": 0, "moderate": 1, "high": 2, "critical": 3}

# Minimal, self-contained fallback guideline text for RAGAgent. Kept
# independent of rag/retriever.py as defense-in-depth: if that module's
# imports fail for any reason (langchain_core missing, etc.), this
# fallback still lets the RAGAgent node produce something rather than
# crash the whole graph. rag/retriever.py itself also has its own
# fallback (TF-IDF embeddings when the HuggingFace model can't be
# downloaded — see RAG_SETUP.md), so this is a second, independent
# safety net, not the only one.
#
# IMPORTANT: this is general clinical knowledge, not text retrieved from
# any specific indexed document in backend/data/guidelines/ (which now
# contains 3 real, sourced files — see RAG_SETUP.md). Source labels below
# are deliberately self-identifying as fallback content, not made to look
# like a real citation, so a degraded response is never mistaken for a
# retrieved one — see rag_agent_node()'s `rag_degraded` flag below.
_FALLBACK_GUIDELINES = [
    {
        "source": "FALLBACK (RAG unavailable) — general clinical knowledge, not a retrieved document",
        "text": (
            "General clinical knowledge, not from an indexed guideline: for type 2 "
            "diabetes, first-line treatment is typically Metformin plus lifestyle "
            "modification, with a common target of HbA1c <7% and fasting glucose "
            "80-130 mg/dL."
        ),
    },
    {
        "source": "FALLBACK (RAG unavailable) — general clinical knowledge, not a retrieved document",
        "text": (
            "General clinical knowledge, not from an indexed guideline: Stage 2 "
            "hypertension (>=140/90 mmHg) typically warrants pharmacotherapy plus "
            "lifestyle change, with a lower target (e.g. <130/80 mmHg) often used "
            "for patients with diabetes or elevated cardiovascular risk."
        ),
    },
    {
        "source": "FALLBACK (RAG unavailable) — general clinical knowledge, not a retrieved document",
        "text": (
            "General clinical knowledge, not from an indexed guideline: cardiovascular "
            "risk reduction commonly involves statin therapy for markedly elevated LDL "
            "or high estimated 10-year risk, and smoking cessation; diabetes plus "
            "hypertension together substantially increase cardiovascular risk versus "
            "either condition alone."
        ),
    },
]


class MediGuardState(TypedDict, total=False):
    patient_data: Dict[str, Any]
    prediction_result: Dict[str, Any]
    report_text: str
    language: str
    prakriti_result: Dict[str, Any]
    messages: List[Any]
    symptom_text: str
    extracted_symptoms: List[str]
    symptom_duration: str
    symptom_severity: str
    emergency_detected: bool
    emergency_flags: List[str]
    symptom_output: str
    report_output: str
    rag_output: str
    rag_references: List[str]
    rag_degraded: bool
    ayurveda_output: str
    coordinator_output: Dict[str, Any]


# ---------------------------------------------------------------------------
# Pure helpers shared by multiple nodes
# ---------------------------------------------------------------------------

def _risk_priority(diabetes: str, cardiovascular: str, hypertension: str = "low") -> str:
    top = max(RISK_ORDER.get(diabetes, 1), RISK_ORDER.get(cardiovascular, 1), RISK_ORDER.get(hypertension, 1))
    if top >= 3:
        return "emergency"
    if top == 2:
        return "urgent"
    return "routine"


def _report_findings(report_text: str) -> str:
    if not report_text.strip():
        return "No report text was provided."
    findings: List[str] = []
    patterns = {
        "fasting glucose": r"(?:glucose|fbg)[^\d]*(\d+(?:\.\d+)?)",
        "hba1c": r"(?:hba1c|a1c)[^\d]*(\d+(?:\.\d+)?)",
        "ldl": r"ldl[^\d]*(\d+(?:\.\d+)?)",
        "blood pressure": r"(\d{2,3})\s*/\s*(\d{2,3})",
    }
    text = report_text.lower()
    for label, pattern in patterns.items():
        match = re.search(pattern, text)
        if match:
            findings.append(f"{label}: {'/'.join(match.groups())}")
    return "Key extracted report markers: " + ", ".join(findings) if findings else "Report reviewed; no structured lab markers were detected."


def _symptom_findings(patient: Dict[str, Any], extracted: Optional[Dict[str, Any]] = None) -> str:
    """Builds a safe, explicitly non-diagnostic findings summary. Never
    states or implies a diagnosis (e.g. never "you have diabetes") — only
    describes what was reported/measured and, where relevant, that the
    prediction system can offer a risk *estimate* given sufficient input."""
    parts = []

    if extracted and extracted.get("symptoms"):
        symptom_text = ", ".join(extracted["symptoms"])
        duration_text = f" (reported duration: {extracted['duration']})" if extracted.get("duration") else ""
        severity_text = f" (reported severity: {extracted['severity']})" if extracted.get("severity") else ""
        parts.append(
            f"Reported symptoms: {symptom_text}{duration_text}{severity_text}. "
            "These symptoms can be associated with several conditions. This system "
            "does not diagnose from symptoms alone — a risk estimate is available "
            "if the required clinical inputs (blood pressure, glucose, cholesterol, "
            "etc.) are provided, and any concerning symptoms should be discussed "
            "with a qualified clinician."
        )
    elif extracted is not None:
        parts.append(
            "No specific clinical symptoms were confidently identified in the text provided. "
            "If you're experiencing symptoms, please describe them more specifically, or "
            "consult a qualified clinician."
        )

    symptoms = patient.get("symptoms") or []
    risk_markers = []
    if patient.get("bmi", 0) >= 30:
        risk_markers.append("obesity-range BMI")
    if patient.get("fasting_glucose", 0) >= 126 or patient.get("hba1c", 0) >= 6.5:
        risk_markers.append("diabetes-range glycemic marker")
    if patient.get("blood_pressure_systolic", 0) >= 140 or patient.get("blood_pressure_diastolic", 0) >= 90:
        risk_markers.append("hypertensive blood pressure")
    if patient.get("smoking"):
        risk_markers.append("active smoking")
    if patient.get("family_history_diabetes") or patient.get("family_history_cvd"):
        risk_markers.append("positive family history")
    if symptoms or risk_markers or extracted is None:
        symptom_text2 = ", ".join(symptoms) if symptoms else "no symptoms reported"
        marker_text = ", ".join(risk_markers) if risk_markers else "no major structured red flags"
        parts.append(f"Structured intake — symptoms: {symptom_text2}. Structured risk markers: {marker_text}.")

    return " ".join(parts) if parts else "No symptom information provided."


def _guideline_recommendations(patient: Dict[str, Any], prediction: Dict[str, Any]) -> List[str]:
    steps = [
        "Review results with a qualified clinician; this system is decision support only.",
        "Repeat or confirm abnormal glucose, HbA1c, lipid, and blood pressure measurements before diagnosis.",
    ]
    if prediction["diabetes"]["risk_level"] in {"high", "critical"}:
        steps.append("Prioritise diabetes evaluation, nutrition counselling, physical activity planning, and medication review.")
    if prediction["cardiovascular"]["risk_level"] in {"high", "critical"}:
        steps.append("Prioritise cardiovascular evaluation, BP control, lipid management, and smoking cessation support.")
    if (prediction.get("hypertension") or {}).get("risk_level") in {"high", "critical"}:
        steps.append("Prioritise blood pressure evaluation and management per standard hypertension treatment guidance (see RAG references).")
    if patient.get("blood_pressure_systolic", 0) >= 180 or patient.get("blood_pressure_diastolic", 0) >= 120:
        steps.append("Very high blood pressure is present; urgent clinical assessment is recommended.")
    return steps


def _neutral_prediction_fallback() -> Dict[str, Any]:
    """Used only if the ML model itself is unavailable (e.g. no model trained
    yet). Keeps the graph shape intact instead of raising."""
    block = {"probability": 0.5, "risk_level": "moderate", "confidence": 0.0, "shap_features": []}
    return {
        "diabetes": dict(block),
        "cardiovascular": dict(block),
        "hypertension": dict(block),
        "combined_risk_score": 0.5,
        "model_version": "unavailable",
    }


# ---------------------------------------------------------------------------
# LangGraph nodes
# ---------------------------------------------------------------------------

async def symptom_agent_node(state: MediGuardState) -> Dict[str, Any]:
    """SymptomAgent — the real entry point for BOTH intake styles:
      1. Free-text natural-language symptom description (state["symptom_text"])
         -> real structured extraction via features/vernacular_nlp.py
            (LLM-based when available, disclosed rule-based/dictionary
            fallback otherwise — never silently fabricated).
      2. Structured clinical intake (state["patient_data"]) -> ensures a
         real ML risk prediction exists (this was the only path before).

    Either or both may be present. If only symptom_text is given (no full
    clinical intake), this node does NOT force a prediction from
    incomplete/default data — it explains that a risk estimate needs the
    clinical inputs, per the safety requirement that this agent never
    diagnoses from symptoms alone.

    Emergency red flags (from rule-based detection, which never depends on
    LLM availability) short-circuit into state so downstream routing can
    prioritise the case appropriately.
    """
    patient = state.get("patient_data") or {}
    symptom_text = state.get("symptom_text") or ""  # `or ""` also guards against an explicit None (not just a missing key)

    extracted: Optional[Dict[str, Any]] = None
    if symptom_text.strip():
        try:
            from agents.llm_factory import get_llm
            llm = get_llm()
        except Exception:
            llm = None  # No LLM configured/reachable — extraction falls back to rule-based, not silently skipped.
        from features.vernacular_nlp import extract_symptom_context
        extracted = extract_symptom_context(symptom_text, llm=llm)

    # Only run a real ML prediction if we have enough for it to be
    # meaningful: either a prediction was already supplied, or patient_data
    # actually looks like structured clinical intake (has at least the core
    # numeric fields _encode_patient() requires), not just free-text symptoms.
    prediction = state.get("prediction_result") or {}
    has_structured_intake = all(
        k in patient for k in ("age", "bmi", "blood_pressure_systolic", "fasting_glucose")
    )
    if not ("diabetes" in prediction and "cardiovascular" in prediction):
        if has_structured_intake:
            try:
                prediction = get_model().predict(patient)
            except Exception as exc:
                logger.error("SymptomAgent: ML model unavailable (%s); using neutral fallback risk.", exc)
                prediction = _neutral_prediction_fallback()
        else:
            # Symptom-only query, no clinical inputs to predict from — do
            # NOT fabricate a prediction. Downstream nodes (RAG, coordinator)
            # must handle an empty prediction_result gracefully.
            prediction = {}

    emergency_flags = (extracted or {}).get("emergency_flags", [])
    result: Dict[str, Any] = {
        "prediction_result": prediction,
        "symptom_output": _symptom_findings(patient, extracted),
        "emergency_detected": bool(emergency_flags),
        "emergency_flags": emergency_flags,
    }
    if extracted:
        result["extracted_symptoms"] = extracted.get("symptoms", [])
        result["symptom_duration"] = extracted.get("duration") or ""
        result["symptom_severity"] = extracted.get("severity") or ""
    return result


async def report_agent_node(state: MediGuardState) -> Dict[str, Any]:
    """ReportAgent — extracts structured lab markers from free-text report."""
    return {"report_output": _report_findings(state.get("report_text") or "")}


async def rag_agent_node(state: MediGuardState) -> Dict[str, Any]:
    """RAGAgent — retrieves real indexed guideline passages relevant to the
    patient's risk profile from the Chroma vector store (backend/rag/retriever.py).
    Degrades to a small built-in, explicitly self-labeled fallback summary
    (general clinical knowledge, NOT presented as a retrieved document — see
    `rag_degraded`) if Chroma / the embedding model isn't available, rather
    than crashing the graph or silently pretending the fallback is real
    retrieval."""
    prediction = state.get("prediction_result") or {}
    extracted_symptoms = state.get("extracted_symptoms") or []
    if prediction:
        dia_level = (prediction.get("diabetes") or {}).get("risk_level", "moderate")
        cvd_level = (prediction.get("cardiovascular") or {}).get("risk_level", "moderate")
        htn_level = (prediction.get("hypertension") or {}).get("risk_level", "moderate")
        query = (
            f"Type 2 diabetes risk level {dia_level}, cardiovascular risk level {cvd_level}, "
            f"hypertension risk level {htn_level}, treatment guideline and lifestyle recommendation"
        )
    elif extracted_symptoms:
        # No quantitative prediction available (symptom-only query) — build
        # the retrieval query from the actual extracted symptoms instead of
        # defaulting every condition to "moderate", which would dilute
        # relevance toward whichever guideline happens to mention "moderate"
        # risk most, regardless of what the patient actually described.
        query = f"Symptoms: {', '.join(extracted_symptoms)}. Relevant clinical guideline and management recommendation."
    else:
        query = "General clinical guideline and lifestyle recommendation for diabetes, cardiovascular disease, and hypertension."

    references: List[str] = []
    passages: List[str] = []
    degraded = False
    try:
        from rag.retriever import get_retriever
        retriever = get_retriever()
        docs = await retriever.ainvoke(query)
        for doc in docs[:4]:
            passages.append(doc.page_content.strip())
            references.append(doc.metadata.get("source", "guideline"))
        if not docs:
            degraded = True
    except Exception as exc:
        logger.warning(
            "RAGAgent: Chroma retriever unavailable (%s); using built-in fallback summaries "
            "(explicitly labeled as fallback, not real retrieval).", exc
        )
        degraded = True
        for doc in _FALLBACK_GUIDELINES:
            passages.append(doc["text"])
            references.append(doc["source"])

    patient = state.get("patient_data") or {}
    recommendations = _guideline_recommendations(patient, prediction) if prediction else []
    summary = " ".join(recommendations) if recommendations else "No guideline synthesis available."
    if passages:
        summary += " Relevant guidance: " + " | ".join(p[:220] for p in passages[:2])
    if degraded:
        summary = "[Note: guideline retrieval degraded to general clinical knowledge, not a specific indexed document — see RAG_SETUP.md] " + summary

    return {
        "rag_output": summary,
        "rag_references": references or ["No guideline source available — RAG corpus not configured. See RAG_SETUP.md."],
        "rag_degraded": degraded,
    }


async def ayurveda_node(state: MediGuardState) -> Dict[str, Any]:
    """5th agent — Ayurvedic Intelligence Agent (ayurveda/ayurveda_agent.py).
    Wrapped so an unavailable LLM provider (no API key, no network route,
    Ollama not running locally, etc.) degrades this node's output instead of
    crashing the whole graph."""
    try:
        from ayurveda.ayurveda_agent import ayurveda_agent_node as _ayurveda_agent_node
        result = await _ayurveda_agent_node(state)
        return {"ayurveda_output": result.get("ayurveda_output", "")}
    except Exception as exc:
        logger.warning("AyurvedaAgent: unavailable (%s); skipping Ayurvedic guidance for this run.", exc)
        return {"ayurveda_output": ""}


async def coordinator_agent_node(state: MediGuardState) -> Dict[str, Any]:
    """CoordinatorAgent — fuses all upstream agent outputs into a final triage decision."""
    patient = state.get("patient_data") or {}
    prediction = state.get("prediction_result") or {}
    emergency_detected = state.get("emergency_detected", False)
    emergency_flags = state.get("emergency_flags", [])

    has_prediction = "diabetes" in prediction and "cardiovascular" in prediction
    if has_prediction:
        dia_level = prediction["diabetes"]["risk_level"]
        cvd_level = prediction["cardiovascular"]["risk_level"]
        htn_level = (prediction.get("hypertension") or {}).get("risk_level", "low")
        final_level = max(
            (dia_level, cvd_level, htn_level),
            key=lambda level: RISK_ORDER.get(level, 1),
        )
        triage = _risk_priority(dia_level, cvd_level, htn_level)
    else:
        # Symptom-only query with no clinical inputs to predict from — no
        # fabricated risk level. Emergency detection (rule-based, always
        # available) still drives triage even without a prediction.
        dia_level = cvd_level = htn_level = final_level = "unknown"
        triage = "emergency" if emergency_detected else "routine"

    if emergency_detected:
        triage = "emergency"  # Emergency red flags always override computed triage, prediction or not.

    symptom_output = state.get("symptom_output") or ""
    report_output = state.get("report_output") or ""
    rag_output = state.get("rag_output") or ""
    rag_references = state.get("rag_references") or []
    ayurveda_output = state.get("ayurveda_output") or ""

    recommendations = _guideline_recommendations(patient, prediction) if has_prediction else [
        "Review results with a qualified clinician; this system is decision support only.",
        "A quantitative risk estimate requires clinical inputs (blood pressure, glucose, "
        "cholesterol, etc.) — these were not provided with this query.",
    ]
    if emergency_detected:
        flags_text = ", ".join(emergency_flags)
        recommendations.insert(0, (
            f"⚠️ Potential emergency symptom(s) detected ({flags_text}). This system is not "
            "equipped to handle emergencies — please seek immediate in-person medical "
            "attention or contact emergency services now."
        ))

    if has_prediction:
        htn_prob = (prediction.get("hypertension") or {}).get("probability")
        summary = (
            f"Diabetes risk is {dia_level} ({prediction['diabetes']['probability']:.1%}), "
            f"cardiovascular risk is {cvd_level} ({prediction['cardiovascular']['probability']:.1%})"
            + (f", and hypertension risk is {htn_level} ({htn_prob:.1%})" if htn_prob is not None else "")
            + f". Overall triage priority is {triage}."
        )
    else:
        summary = (
            "No quantitative risk prediction is available for this query "
            f"(clinical inputs not provided). Overall triage priority is {triage}."
        )
    if emergency_detected:
        summary = "EMERGENCY SYMPTOMS DETECTED — seek immediate medical attention. " + summary

    agent_outputs = [
        {
            "agent_name": "SymptomAgent",
            "findings": symptom_output,
            "recommendations": recommendations[:2],
            "guideline_references": ["ICMR diabetes screening principles", "ACC/AHA cardiovascular risk principles"],
            "confidence": 0.86,
        },
        {
            "agent_name": "ReportAgent",
            "findings": report_output,
            "recommendations": ["Validate extracted report values before clinical action."],
            "guideline_references": ["Laboratory confirmation workflow"],
            "confidence": 0.78,
        },
    ]
    if rag_output:
        agent_outputs.append({
            "agent_name": "RAGAgent",
            "findings": rag_output,
            "recommendations": recommendations,
            "guideline_references": rag_references,
            "confidence": 0.84,
        })
    if ayurveda_output:
        agent_outputs.append({
            "agent_name": "AyurvedaAgent",
            "findings": ayurveda_output[:600],
            "recommendations": ["See full Ayurvedic guidance via /api/v1/features/ayurveda/agent."],
            "guideline_references": ["Charaka Samhita", "Ministry of AYUSH STG"],
            "confidence": 0.7,
        })

    return {
        "coordinator_output": {
            "final_risk_level": final_level,
            "summary": summary,
            "triage_priority": triage,
            "next_steps": recommendations,
            "agent_outputs": agent_outputs,
        }
    }


# ---------------------------------------------------------------------------
# Conditional routing
# ---------------------------------------------------------------------------

def _route_after_report(state: MediGuardState) -> str:
    """Emergency-priority patients skip guideline retrieval and Ayurvedic
    synthesis (RAG + LLM latency) and go straight to the coordinator so a
    critical case isn't delayed. Everyone else goes through the full
    RAG -> Ayurveda path."""
    if state.get("emergency_detected"):
        return "coordinator"  # Rule-based emergency red flags always short-circuit, prediction or not.
    prediction = state.get("prediction_result") or {}
    if not prediction:
        return "rag"  # Symptom-only, non-emergency query — still worth a guideline-grounded answer.
    dia_level = (prediction.get("diabetes") or {}).get("risk_level", "moderate")
    cvd_level = (prediction.get("cardiovascular") or {}).get("risk_level", "moderate")
    htn_level = (prediction.get("hypertension") or {}).get("risk_level", "moderate")
    if _risk_priority(dia_level, cvd_level, htn_level) == "emergency":
        return "coordinator"
    return "rag"


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------

def _build_graph():
    graph = StateGraph(MediGuardState)
    graph.add_node("symptom", symptom_agent_node)
    graph.add_node("report", report_agent_node)
    graph.add_node("rag", rag_agent_node)
    graph.add_node("ayurveda", ayurveda_node)
    graph.add_node("coordinator", coordinator_agent_node)

    graph.add_edge(START, "symptom")
    graph.add_edge("symptom", "report")
    graph.add_conditional_edges(
        "report",
        _route_after_report,
        {"rag": "rag", "coordinator": "coordinator"},
    )
    graph.add_edge("rag", "ayurveda")
    graph.add_edge("ayurveda", "coordinator")
    graph.add_edge("coordinator", END)
    return graph.compile()


_compiled_graph = None


def get_agent_graph():
    """Return the compiled LangGraph pipeline (singleton). The returned object
    is a `langgraph.graph.state.CompiledStateGraph`, which exposes the same
    `.ainvoke(state) -> state` contract the previous hand-rolled orchestrator did."""
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = _build_graph()
    return _compiled_graph
