"""
MediGuard AI — Ayurveda A5: Ayurvedic LangGraph Agent
5th agent in the pipeline. Queries a Chroma vector store embedded
with Charaka Samhita excerpts, CCRAS clinical studies, and Ministry
of AYUSH guidelines.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

AYURVEDA_SYSTEM_PROMPT = """You are MediGuard AI's Ayurvedic Intelligence Agent.
You specialise in evidence-based Ayurvedic medicine for chronic disease management,
drawing from Charaka Samhita, Sushruta Samhita, CCRAS clinical studies, and
Ministry of AYUSH (India) guidelines.

Your role:
1. Provide traditional Ayurvedic recommendations alongside modern treatment
2. Be scientifically grounded — cite evidence level (Strong / Moderate / Preliminary)
3. ALWAYS note contraindications with modern medicines
4. Recommend consulting a registered BAMS practitioner for personalised treatment
5. Respond in both Hindi and English (bilingual output)
6. Frame Ayurveda as complementary, NOT a replacement for modern medicine

Context from knowledge base:
{context}

Patient Prakriti: {prakriti}
Respond in {language}."""


# ── Built-in Ayurvedic Knowledge Base ───────────────────────────────────────
AYURVEDA_DOCS = [
    Document(
        page_content=(
            "Charaka Samhita — Prameha (Diabetes) Management:\n"
            "Madhumeha (honey-like urine disease) is classified as one of 20 types of Prameha. "
            "Karela (Momordica charantia), Methi (Trigonella foenum-graecum), and Gurmar "
            "(Gymnema sylvestre) are primary Dravyas. Panchakarma — specifically Virechana "
            "(therapeutic purgation) — is recommended to restore Agni (digestive fire). "
            "Dinacharya: wake before sunrise, tongue scraping, oil pulling, and exercise before eating. "
            "CCRAS evidence: Karela extract reduces FBG by 15-20% over 12 weeks (Grade A)."
        ),
        metadata={"source": "Charaka_Samhita_Prameha", "type": "ayurveda_classical"},
    ),
    Document(
        page_content=(
            "Ministry of AYUSH — Standard Treatment Guidelines for Type 2 Diabetes (2021):\n"
            "First-line Ayurvedic protocol: Nishamalaki (Amla + Turmeric) 500mg twice daily. "
            "Vijayasar (Pterocarpus marsupium) — bark water from Vijayasar wooden glass. "
            "Triphala Churna 5g at bedtime with warm water. "
            "Yoga: Kapalbhati 10 min + Anulom-Vilom 10 min + Surya Namaskar 12 rounds daily. "
            "Diet: Avoid Guru (heavy), Snigdha (oily), Madhura (sweet) foods. "
            "Prefer Tikta (bitter) and Kashaya (astringent) tastes. "
            "ICMR-CCRAS collaborative study: Yoga + Ayurvedic herbs reduces HbA1c by 0.7% in 6 months."
        ),
        metadata={"source": "AYUSH_DM_STG_2021", "type": "ayush_guideline"},
    ),
    Document(
        page_content=(
            "CCRAS Clinical Study — Cardiovascular Disease (Hridaya Roga):\n"
            "Arjuna (Terminalia arjuna) bark decoction: 3g twice daily reduces systolic BP by 8-10 mmHg "
            "and LDL by 12% over 3 months (CCRAS RCT 2018). "
            "Pushkarmool (Inula racemosa) — shows anti-anginal and hypotensive effects. "
            "Guggulu formulations: Triphala Guggulu reduces total cholesterol by 18% (moderate evidence). "
            "Pranayama — Anulom-Vilom reduces resting heart rate and systolic BP within 4 weeks. "
            "Yoga Nidra reduces sympathetic nervous system activity, beneficial in stress-linked hypertension."
        ),
        metadata={"source": "CCRAS_CVD_Study_2018", "type": "clinical_study"},
    ),
    Document(
        page_content=(
            "Ritucharya and Dinacharya for Metabolic Health (AYUSH guidelines):\n"
            "Dinacharya (daily routine): Wake at Brahma Muhurta (4:30–5:30 AM). "
            "Tongue scraping removes Ama (toxins). Oil pulling with sesame oil for 15 min. "
            "Abhyanga (self-massage) with sesame oil reduces Vata and improves circulation. "
            "Ritucharya (seasonal routine): Avoid heavy, sweet, cold foods in Shishira/Hemanta (winter). "
            "Kapha season (spring): increase exercise, reduce dairy and sweets. "
            "Pitta season (summer): increase cooling foods, reduce spicy food, stay hydrated. "
            "Research: patients following Dinacharya showed 22% reduction in stress markers (NIMHANS, 2020)."
        ),
        metadata={"source": "AYUSH_Dinacharya_Ritucharya", "type": "ayush_guideline"},
    ),
    Document(
        page_content=(
            "Panchakarma Protocols for Chronic Disease (Ayurvedic detox):\n"
            "Virechana (purgation therapy): primary treatment for Pitta disorders, metabolic disease. "
            "Basti (medicated enema): primary for Vata disorders, neuropathy, arthritis. "
            "Abhyanga + Swedana: improves insulin sensitivity, peripheral circulation in T2DM. "
            "CONTRAINDICATIONS: Panchakarma is NOT safe without expert supervision. "
            "Not suitable for severe cardiac conditions, acute infections, or pregnancy without specialist. "
            "Refer to accredited Panchakarma centres under Ministry of AYUSH."
        ),
        metadata={"source": "Panchakarma_Protocols", "type": "clinical_guidance"},
    ),
]


_ayurveda_retriever = None


def get_ayurveda_retriever():
    global _ayurveda_retriever
    if _ayurveda_retriever:
        return _ayurveda_retriever

    try:
        from langchain_community.vectorstores import Chroma
        from langchain_community.embeddings import HuggingFaceEmbeddings
        from utils.config import settings

        persist_dir = os.path.join(os.path.dirname(__file__), "..", "data", "chroma_ayurveda")
        os.makedirs(persist_dir, exist_ok=True)

        embeddings = HuggingFaceEmbeddings(
            model_name=settings.embedding_model,
            model_kwargs={"device": "cpu"},
        )

        if os.path.exists(os.path.join(persist_dir, "chroma.sqlite3")):
            vs = Chroma(
                persist_directory=persist_dir,
                embedding_function=embeddings,
                collection_name="ayurveda_kb",
            )
        else:
            vs = Chroma.from_documents(
                documents=AYURVEDA_DOCS,
                embedding=embeddings,
                persist_directory=persist_dir,
                collection_name="ayurveda_kb",
            )
            vs.persist()

        _ayurveda_retriever = vs.as_retriever(search_kwargs={"k": 3})
        logger.info("Ayurveda Chroma retriever initialised")
        return _ayurveda_retriever
    except Exception as exc:
        logger.warning("Chroma unavailable, using direct docs: %s", exc)
        return None


async def ayurveda_agent_node(
    state: Dict[str, Any],
    config=None,
) -> Dict[str, Any]:
    """
    LangGraph node — Ayurvedic Agent.

    Expected state:
        patient_data
        prediction_result
        prakriti_result
        language
        messages
    """

    from agents.llm_factory import get_llm
    from utils.llm_timeout import ainvoke_with_timeout

    # =========================================================
    # GET LLM
    # =========================================================

    llm = get_llm()

    # =========================================================
    # READ STATE
    # =========================================================

    lang = state.get("language", "en")

    patient = state.get(
        "patient_data",
        {},
    )

    pred = state.get(
        "prediction_result",
        {},
    )

    prakriti = state.get(
        "prakriti_result",
        {},
    )

    state_messages = state.get(
        "messages",
        [],
    )

    # =========================================================
    # GET USER QUESTION
    # =========================================================

    user_question = ""

    if state_messages:

        last_message = state_messages[-1]

        if isinstance(last_message, dict):

            user_question = last_message.get(
                "content",
                "",
            )

        else:

            user_question = getattr(
                last_message,
                "content",
                "",
            )

    user_question = str(
        user_question
    ).strip()

    logger.info(
        "[AyurvedaAgent] User question: %s",
        user_question,
    )

    # =========================================================
    # PRAKRITI
    # =========================================================

    primary_dosha = (
        prakriti.get(
            "primary_dosha",
            "kapha",
        )
        if prakriti
        else "kapha"
    )

    # =========================================================
    # RETRIEVE KNOWLEDGE
    # =========================================================

    retriever = get_ayurveda_retriever()

    context = ""

    if retriever:

        try:

            query = (
                f"{user_question} "
                f"Prakriti {primary_dosha} "
                f"diabetes cardiovascular "
                f"Ayurveda herbs yoga diet wellness"
            )

            # New LangChain API
            docs = await retriever.ainvoke(
                query
            )

            context = "\n\n".join(
                doc.page_content
                for doc in docs
            )

        except Exception as exc:

            logger.warning(
                "[AyurvedaAgent] Retrieval failed: %s",
                exc,
            )

            context = "\n\n".join(
                doc.page_content
                for doc in AYURVEDA_DOCS[:3]
            )

    else:

        context = "\n\n".join(
            doc.page_content
            for doc in AYURVEDA_DOCS[:3]
        )

    # =========================================================
    # ML RISK
    # =========================================================

    dia_prob = 0

    if "diabetes" in pred:

        dia_prob = pred.get(
            "diabetes",
            {},
        ).get(
            "probability",
            0,
        )

    elif "diabetes_risk" in pred:

        dia_prob = pred.get(
            "diabetes_risk",
            {},
        ).get(
            "probability",
            0,
        )

    cvd_prob = 0

    if "cardiovascular" in pred:

        cvd_prob = pred.get(
            "cardiovascular",
            {},
        ).get(
            "probability",
            0,
        )

    elif "cardiovascular_risk" in pred:

        cvd_prob = pred.get(
            "cardiovascular_risk",
            {},
        ).get(
            "probability",
            0,
        )

    # =========================================================
    # USER PROMPT
    # =========================================================

    user_prompt = f"""
Patient profile:
- Name: {patient.get("name", "Patient")}
- Age: {patient.get("age", "Not provided")}
- Gender: {patient.get("gender", "Not provided")}
- BMI: {patient.get("bmi", "Not provided")}
- Prakriti: {primary_dosha.title()}

ML Risk:
- Diabetes: {dia_prob * 100:.1f}%
- Cardiovascular: {cvd_prob * 100:.1f}%

Patient's question:
{user_question}

Instructions:

Answer the patient's specific question directly.

Use the provided Ayurvedic knowledge context when relevant.

Provide practical and easy-to-understand guidance.

When discussing herbs, supplements, Panchakarma, or other interventions:
- mention evidence level
- mention relevant contraindications
- mention possible interactions with modern medicines
- do not present Ayurveda as a replacement for prescribed medical treatment

If the question is not related to Ayurveda or wellness,
politely explain that you can primarily help with Ayurvedic
wellness, diet, yoga, herbs, Dosha and complementary guidance.

When appropriate, recommend consultation with a qualified
BAMS practitioner and/or medical doctor.

Knowledge context:
{context[:5000]}
"""

    # =========================================================
    # LANGUAGE
    # =========================================================

    response_language = (
        "Hindi and English"
        if lang == "hi"
        else "English"
    )

    # =========================================================
    # MESSAGES
    # =========================================================

    messages = [
        SystemMessage(
            content=AYURVEDA_SYSTEM_PROMPT.format(
                context=context[:5000],
                prakriti=primary_dosha.title(),
                language=response_language,
            )
        ),
        HumanMessage(
            content=user_prompt
        ),
    ]

    logger.info(
        "[AyurvedaAgent] Sending request to LLM..."
    )

    # =========================================================
    # CALL LLM
    # =========================================================

    response = await ainvoke_with_timeout(
        llm,
        messages,
        timeout=60,
        config=config,
    )

    # =========================================================
    # DEBUG RAW RESPONSE
    # =========================================================

    logger.info(
        "[AyurvedaAgent] Response type: %s",
        type(response).__name__,
    )

    logger.info(
        "[AyurvedaAgent] Raw response: %r",
        response,
    )

    # =========================================================
    # EXTRACT CONTENT
    # =========================================================

    output = ""

    content = getattr(
        response,
        "content",
        None,
    )

    if isinstance(content, str):

        output = content.strip()

    elif isinstance(content, list):

        parts = []

        for item in content:

            if isinstance(item, str):

                parts.append(item)

            elif isinstance(item, dict):

                text = item.get("text")

                if text:

                    parts.append(
                        str(text)
                    )

        output = "\n".join(
            parts
        ).strip()

    # =========================================================
    # FALLBACKS
    # =========================================================

    if not output:

        text = getattr(
            response,
            "text",
            None,
        )

        if text:

            output = str(
                text
            ).strip()

    # =========================================================
    # EMPTY RESPONSE PROTECTION
    # =========================================================

    if not output:

        logger.error(
            "[AyurvedaAgent] EMPTY LLM RESPONSE: %r",
            response,
        )

        output = (
            "I couldn't generate the Ayurveda response "
            "right now. Please try your question again."
        )

    logger.info(
        "[AyurvedaAgent] Final output: %d chars",
        len(output),
    )

    # =========================================================
    # RETURN
    # =========================================================

    return {
        "ayurveda_output": output,

        "messages": [
            AIMessage(
                content=output,
                name="AyurvedaAgent",
            )
        ],
    }