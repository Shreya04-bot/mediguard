"""
MediGuard AI — Health Calculation Helpers
==========================================
Single source of truth for deriving age (from DOB), BMI (from height/weight),
and normalized gender values. Used by patient registration/onboarding,
profile endpoints, doctor patient-detail views, and the AI prediction
frontend pre-fill — so every part of the app computes these the same way.

Canonical gender values stored in the DB (User.gender / PatientProfile.gender):
    "female" | "male" | "other" | "neutral"
("neutral" == "prefer not to say" — kept as the existing DB value instead of
introducing a new string, since the avatar system already treats it as the
"no strong preference" bucket.)
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

CANONICAL_GENDERS = {"female", "male", "other", "neutral"}


def normalize_gender(value: Optional[str]) -> Optional[str]:
    """Map any incoming gender-ish string to the single canonical value used
    everywhere in the app. Unknown/empty values become None (caller decides
    the default, usually "neutral")."""
    if not value:
        return None
    v = value.strip().lower()
    aliases = {
        "f": "female", "girl": "female", "woman": "female",
        "m": "male", "boy": "male", "man": "male",
        "o": "other",
        "prefer_not_to_say": "neutral", "prefer not to say": "neutral",
        "unspecified": "neutral", "unknown": "neutral",
    }
    v = aliases.get(v, v)
    return v if v in CANONICAL_GENDERS else None


def gender_to_ml(value: Optional[str]) -> str:
    """Clinical encoding expected by the ML pipeline (ai_gateway.VitalsIn /
    ml.model): only "male" | "female" | "other" are accepted, so "neutral"
    (prefer not to say) maps to "other" rather than being sent unencoded."""
    g = normalize_gender(value)
    if g in ("male", "female"):
        return g
    return "other"


def calculate_age(dob: Optional[str], as_of: Optional[date] = None) -> Optional[int]:
    """DOB is stored as 'YYYY-MM-DD'. Returns whole years, or None if DOB is
    missing/unparseable. Never stored — always derived on read so it can't
    drift out of sync with DOB."""
    if not dob:
        return None
    try:
        born = datetime.strptime(dob.strip(), "%Y-%m-%d").date()
    except (ValueError, AttributeError):
        return None
    today = as_of or date.today()
    if born > today:
        return None
    age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    return age if 0 <= age <= 130 else None


def validate_dob(dob: Optional[str]) -> Optional[str]:
    """Raises ValueError with a user-facing message if DOB is present but
    invalid (bad format, in the future, or implausibly old). Returns the
    cleaned value (or None) on success."""
    if not dob:
        return None
    dob = dob.strip()
    try:
        born = datetime.strptime(dob, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError("Date of birth must be a valid date in YYYY-MM-DD format.")
    today = date.today()
    if born > today:
        raise ValueError("Date of birth cannot be in the future.")
    if today.year - born.year > 120:
        raise ValueError("Date of birth is implausibly far in the past.")
    return dob


def calculate_bmi(height_cm: Optional[float], weight_kg: Optional[float]) -> Optional[float]:
    """Standard BMI = kg / m^2, rounded to 1 decimal. None if either input
    is missing or out of a physiologically plausible range."""
    if height_cm is None or weight_kg is None:
        return None
    if not (50 <= height_cm <= 250) or not (2 <= weight_kg <= 400):
        return None
    height_m = height_cm / 100
    bmi = weight_kg / (height_m ** 2)
    return round(bmi, 1)


def bmi_category(bmi: Optional[float]) -> Optional[str]:
    if bmi is None:
        return None
    if bmi < 18.5:
        return "Underweight"
    if bmi < 25:
        return "Normal"
    if bmi < 30:
        return "Overweight"
    return "Obese"