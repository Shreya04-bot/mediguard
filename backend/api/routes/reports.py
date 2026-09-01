"""
MediGuard AI — Report Upload API Route
=======================================
POST /api/v1/reports/upload — Parse PDF/image medical reports with OCR.
Saves report analysis to DB if authenticated.
"""

import logging
import os
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Request
from sqlalchemy.orm import Session

from models.schemas import ReportAnalysisResult
from utils.config import settings
from auth.db import get_db, User
from auth.dependencies import oauth2_scheme, decode_access_token
from services.patient_service import PatientService
from utils.rate_limit import check_rate_limit

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}


@router.post("/upload", response_model=ReportAnalysisResult, summary="Upload medical report PDF/image")
async def upload_report(
    request: Request,
    file: UploadFile = File(...),
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Accept a medical report (PDF or image).
    Extracts text and flags abnormal values.
    """
    # SECURITY_REPORT.md finding #12: file upload (disk + OCR/parse cost)
    # previously had no rate limit at all.
    rate_key = None
    if token:
        try:
            rate_key = decode_access_token(token).get("sub")
        except Exception:
            rate_key = None
    if not rate_key:
        rate_key = request.client.host if request.client else "anonymous"
    check_rate_limit("reports_upload", rate_key, max_requests=10, window_seconds=60)

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    content = await file.read()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")

    # Save to upload dir
    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    save_path = os.path.join(settings.upload_dir, f"{uuid.uuid4()}.{ext}")
    with open(save_path, "wb") as f:
        f.write(content)

    extracted_text, extracted_values, flags = "", {}, []

    if file.content_type == "application/pdf":
        extracted_text, extracted_values, flags = _parse_pdf(save_path)
    else:
        extracted_text, extracted_values, flags = _parse_image(save_path)

    summary_str = extracted_text[:500] if extracted_text else "No text extracted."

    # Save report to DB if user is authenticated
    if token:
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    PatientService.save_report(
                        db=db,
                        user_id=user.id,
                        report_name=file.filename or "Medical Report",
                        file_type="pdf" if file.content_type == "application/pdf" else "image",
                        file_path=save_path,
                        extracted_data=extracted_values,
                        summary=summary_str,
                        flags=flags,
                    )
        except Exception as e:
            logger.warning("Could not save report to DB: %s", e)

    return ReportAnalysisResult(
        report_type="pdf" if file.content_type == "application/pdf" else "image",
        extracted_values=extracted_values,
        summary=summary_str,
        flags=flags,
    )


def _parse_pdf(path: str):
    try:
        from pypdf import PdfReader
        reader = PdfReader(path)
        text = "".join(p.extract_text() or "" for p in reader.pages)
        text_res, values, flags = _extract_lab_values(text)
        return text, values, flags
    except Exception as exc:
        logger.warning("PDF parse error: %s", exc)
        return "", {}, ["PDF parsing failed"]


def _parse_image(path: str):
    """Use pytesseract OCR for image reports."""
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(path)
        text = pytesseract.image_to_string(img)
        text_res, values, flags = _extract_lab_values(text)
        return text, values, flags
    except Exception as exc:
        logger.warning("Image OCR error: %s", exc)
        return "", {}, ["OCR processing failed — install pytesseract"]


def _extract_lab_values(text: str):
    """Simple regex-based extraction of common lab values."""
    import re
    patterns = {
        "fasting_glucose": r"fasting\s*(?:blood\s*)?glucose[:\s]+(\d+\.?\d*)",
        "hba1c": r"hba1c[:\s]+(\d+\.?\d*)",
        "cholesterol": r"total\s*cholesterol[:\s]+(\d+\.?\d*)",
        "triglycerides": r"triglycerides?[:\s]+(\d+\.?\d*)",
        "blood_pressure": r"bp[:\s]+(\d+/\d+)",
        "hdl": r"hdl[:\s]+(\d+\.?\d*)",
        "ldl": r"ldl[:\s]+(\d+\.?\d*)",
    }
    values = {}
    text_lower = text.lower()
    for key, pattern in patterns.items():
        m = re.search(pattern, text_lower)
        if m:
            values[key] = m.group(1)

    flags = []
    glucose = float(values.get("fasting_glucose", 0) or 0)
    hba1c = float(values.get("hba1c", 0) or 0)
    if glucose >= 126:
        flags.append(f"High fasting glucose: {glucose} mg/dL (≥126 — diabetes threshold)")
    if hba1c >= 6.5:
        flags.append(f"High HbA1c: {hba1c}% (≥6.5 — diabetes threshold)")

    return text, values, flags
