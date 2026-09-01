"""
MediGuard AI — Auth Pydantic Schemas
======================================
Matches the contract documented in the frontend's
`src/services/authService.js`. Doctor registration fields accept both
the new camelCase names (medicalLicenseNumber, hospitalAffiliation)
sent by the current frontend and the original snake_case names
(medical_license, hospital_name) still used by existing tests/tools,
so nothing that already worked breaks.
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="patient", pattern="^(patient|doctor)$")
    preferred_language: str = Field(default="en", pattern="^(en|hi)$")

    # UI/avatar gender (distinct from PatientProfile.gender, which is
    # clinical and feeds the ML risk models). Optional so existing
    # clients that don't send it keep working — treated as "neutral".
    gender: Optional[str] = Field(default=None, pattern="^(female|male|neutral)$")

    # Proves this email passed the OTP flow (POST /auth/register/verify-otp).
    # Optional at the schema level so a clear, custom 401 can be raised in
    # the route rather than a generic 422.
    verificationToken: Optional[str] = Field(default=None)

    # Doctor-specific fields — new frontend names (preferred) and legacy
    # snake_case names both accepted; the route reconciles them.
    medicalLicenseNumber: Optional[str] = Field(default=None)
    hospitalAffiliation: Optional[str] = Field(default=None)
    medical_license: Optional[str] = Field(default=None)
    hospital_name: Optional[str] = Field(default=None)
    specialization: Optional[str] = Field(default=None)
    license_upload: Optional[str] = Field(default=None)
    experience_years: Optional[int] = Field(default=0)
    bio: Optional[str] = Field(default=None)

    @property
    def resolved_medical_license(self) -> Optional[str]:
        return self.medicalLicenseNumber or self.medical_license

    @property
    def resolved_hospital_name(self) -> Optional[str]:
        return self.hospitalAffiliation or self.hospital_name


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    # Optional: which portal the login was submitted from. When present,
    # it must match the account's actual role or the login is rejected —
    # stops a patient account from signing in via the doctor portal.
    role: Optional[str] = Field(default=None, pattern="^(patient|doctor|admin)$")


class SendOtpRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=8)


class PasswordResetRequest(BaseModel):
    email: EmailStr
    resetToken: str
    newPassword: str = Field(..., min_length=8, max_length=128)


class RefreshRequest(BaseModel):
    refreshToken: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    avatar: Optional[str] = None  # kept for backward compatibility — same value as profile_photo_url
    specialty: Optional[str] = None
    verification_status: str
    preferred_language: str
    created_at: datetime

    # UI avatar system
    gender: Optional[str] = None
    avatar_key: Optional[str] = None
    profile_photo_url: Optional[str] = None

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    """Body for PATCH /auth/profile. Every field optional — send only
    what changed. Applies to all three roles (patient/doctor/admin);
    role-specific clinical fields (e.g. PatientProfile.gender, DOB,
    blood group) are still updated via the existing
    PUT /patient/profile / PUT /doctor/profile endpoints."""

    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    gender: Optional[str] = Field(default=None, pattern="^(female|male|neutral)$")
    avatar_key: Optional[str] = Field(default=None, max_length=50)
    # Explicit flag, since "avatar_key omitted" (no change) and "avatar_key
    # cleared" (revert to gender default) need to mean different things.
    clear_avatar_key: bool = False


class TokenResponse(BaseModel):
    token: str
    refreshToken: str
    user: UserOut


class PendingRegistrationResponse(BaseModel):
    pending: bool = True
    message: str = "Registration received. An admin will verify your license before you can log in."


class MeResponse(BaseModel):
    user: UserOut


class MessageResponse(BaseModel):
    message: str


class OtpSentResponse(BaseModel):
    message: str
    expiresInSeconds: int


class DoctorProfileOut(BaseModel):
    id: str
    medical_license: str
    hospital_name: str
    specialization: str
    license_upload: Optional[str] = None
    experience_years: int
    bio: Optional[str] = None

    class Config:
        from_attributes = True


class PatientProfileOut(BaseModel):
    id: str
    dob: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_history: Optional[str] = None

    class Config:
        from_attributes = True
