"""
MediGuard AI — Voice Interface API Route
POST /api/v1/voice/transcribe — Speech-to-text (Hindi/English)
POST /api/v1/voice/tts        — Text-to-speech
"""

import logging

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
import io

from models.schemas import VoiceTranscriptionResponse, TTSRequest, Language

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/transcribe", response_model=VoiceTranscriptionResponse, summary="Transcribe voice input")
async def transcribe(
    file: UploadFile = File(...),
    language: str = "en",
):
    """
    Accept audio file and return transcript.
    Supports Hindi (hi) and English (en).
    Uses SpeechRecognition + Google Web Speech API.
    """
    audio_bytes = await file.read()
    try:
        import speech_recognition as sr
        recognizer = sr.Recognizer()

        # Convert to AudioData
        with sr.AudioFile(io.BytesIO(audio_bytes)) as source:
            audio_data = recognizer.record(source)

        lang_code = "hi-IN" if language == "hi" else "en-IN"
        transcript = recognizer.recognize_google(audio_data, language=lang_code)
        confidence = 0.90  # Google API doesn't return confidence — use estimate

        return VoiceTranscriptionResponse(
            transcript=transcript,
            language=Language(language),
            confidence=confidence,
        )
    except Exception as exc:
        logger.warning("Transcription error: %s", exc)
        raise HTTPException(status_code=422, detail=f"Transcription failed: {exc}") from exc


@router.post("/tts", summary="Text-to-speech synthesis")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech audio.
    Uses pyttsx3 for offline synthesis.
    """
    import os
    import tempfile

    tmp_path = None
    try:
        import pyttsx3
        engine = pyttsx3.init()

        # Set voice language. Match on the voice's declared language codes
        # first (more reliable across platforms), falling back to a name
        # substring match. If the requested language's voice truly isn't
        # installed on this OS, we no longer fail silently — the caller
        # gets an explicit `X-Voice-Fallback` header so the frontend can
        # tell the user they're hearing English instead of Hindi.
        voices = engine.getProperty("voices")
        matched_voice = False
        if request.language == "hi":
            for voice in voices:
                langs = [str(l).lower() for l in getattr(voice, "languages", []) or []]
                if any("hi" in l for l in langs) or "hindi" in voice.name.lower():
                    engine.setProperty("voice", voice.id)
                    matched_voice = True
                    break

        engine.setProperty("rate", 150)
        engine.setProperty("volume", 0.9)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        engine.save_to_file(request.text, tmp_path)
        engine.runAndWait()

        with open(tmp_path, "rb") as f:
            audio_data = f.read()

        headers = {"Content-Disposition": "inline; filename=tts_output.wav"}
        if request.language == "hi" and not matched_voice:
            headers["X-Voice-Fallback"] = "true"
            logger.warning(
                "No Hindi voice installed on this host — TTS audio for "
                "language='hi' was synthesized with the default (English) "
                "voice. Install a Hindi voice pack (e.g. espeak's bundled "
                "'hi' voice, verify with `espeak --voices=hi`) to fix this."
            )

        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/wav",
            headers=headers,
        )
    except Exception as exc:
        logger.warning("TTS error: %s", exc)
        raise HTTPException(status_code=422, detail=f"TTS failed: {exc}") from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
