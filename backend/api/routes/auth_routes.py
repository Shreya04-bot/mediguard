"""
MediGuard AI — Authentication Routes
=======================================
JWT-based auth backed by SQLite DB. Password hashing with bcrypt.
Full contract: see frontend `src/services/authService.js` for the
exact request/response shapes this implements.

Flow summary:
  Registration:  POST /register/send-otp -> POST /register/verify-otp
                 -> POST /register (with verificationToken)
  Password reset: POST /password-reset/send-otp -> .../verify-otp
                 -> POST /password-reset/reset
  Session:       POST /login -> POST /refresh -> POST /logout
"""

from __future__ import annotations
import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, UploadFile, File
from sqlalchemy.orm import Session

from auth.db import get_db, User
from auth.dependencies import get_current_user, get_current_jti
from auth.serializers import build_user_out
from auth.schemas import (
    RegisterRequest, LoginRequest, TokenResponse, PendingRegistrationResponse,
    SendOtpRequest, VerifyOtpRequest, PasswordResetRequest, RefreshRequest,
    MeResponse, MessageResponse, OtpSentResponse, UpdateProfileRequest,
    InviteValidateResponse, AcceptInviteRequest,
)
from auth.security import hash_password, verify_password
from models.patient import PatientProfile
from models.doctor_profile import DoctorProfile
from services.audit_service import AuditService
from services.otp_service import OtpService
from services.session_service import SessionService
from services.invite_service import InviteService
from utils.config import settings
from utils.health_calculations import normalize_gender

logger = logging.getLogger(__name__)
router = APIRouter()


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


# ---------------------------------------------------------------------------
# Registration OTP flow
# ---------------------------------------------------------------------------

@router.post("/register/send-otp", response_model=OtpSentResponse, summary="Send email verification code before registration")
async def send_registration_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    if db.query(User).filter(User.email == email_clean).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": "email already registered"})

    expires_in = OtpService.generate_and_send(db, email_clean, purpose="register")
    return {"message": "Verification code sent", "expiresInSeconds": expires_in}


@router.post("/register/verify-otp", summary="Verify registration email code")
async def verify_registration_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    token = OtpService.verify(db, email_clean, payload.otp, purpose="register")
    return {"verificationToken": token, "expiresInSeconds": 900}


@router.post(
    "/register",
    summary="Register patient or doctor account",
    response_model=None,
)
async def register(payload: RegisterRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": "email already registered"})

    role = payload.role.lower()
    if role not in ["patient", "doctor"]:
        role = "patient"

    if not payload.verificationToken:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Email verification required or expired", "code": "OTP_VERIFICATION_REQUIRED"},
        )
    OtpService.consume_verification_token(db, email_clean, payload.verificationToken, purpose="register")

    medical_license = payload.resolved_medical_license
    hospital_name = payload.resolved_hospital_name

    if role == "doctor" and not medical_license:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "medicalLicenseNumber is required for doctor accounts"},
        )
    if role == "doctor" and not hospital_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "hospitalAffiliation is required for doctor accounts"},
        )

    # Doctors require admin verification; Patients are auto-approved
    v_status = "pending" if role == "doctor" else "approved"

    normalized_gender = normalize_gender(payload.gender)

    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        name=payload.name.strip(),
        email=email_clean,
        hashed_password=hash_password(payload.password),
        role=role,
        verification_status=v_status,
        preferred_language=payload.preferred_language,
        gender=normalized_gender,  # null is fine — frontend/backend both treat null as "neutral"
    )
    db.add(user)
    db.commit()

    if role == "doctor":
        doc_profile = DoctorProfile(
            user_id=user_id,
            medical_license=medical_license,
            hospital_name=hospital_name,
            specialization=payload.specialization or "General Practice",
            license_upload=payload.license_upload,
            experience_years=payload.experience_years or 0,
            bio=payload.bio,
        )
        db.add(doc_profile)
    else:
        # Gender chosen at account-creation time is the same canonical
        # value used for the clinical/ML profile — carried over here so a
        # patient who picked "female" on the signup screen doesn't have to
        # pick it again during health onboarding. Height/weight/DOB/etc.
        # are collected in the onboarding step right after this
        # (PUT /patient/profile) since they don't block account creation.
        pat_profile = PatientProfile(user_id=user_id, gender=normalized_gender)
        db.add(pat_profile)

    db.commit()
    db.refresh(user)

    AuditService.log(
        db=db, action="user_registered", resource=f"user:{user.id}", user_id=user.id,
        details={"email": user.email, "role": user.role, "verification_status": user.verification_status},
        ip_address=_client_ip(request),
    )
    logger.info("New %s registered: %s (status: %s)", role, user.email, v_status)

    if role == "doctor":
        response.status_code = status.HTTP_202_ACCEPTED
        return PendingRegistrationResponse(
            message="Registration received. An admin will verify your license before you can log in."
        )

    access_token, refresh_token = SessionService.issue(db, user, request.headers.get("user-agent"), _client_ip(request))
    response.status_code = status.HTTP_201_CREATED
    return TokenResponse(token=access_token, refreshToken=refresh_token, user=build_user_out(user, db))


# ---------------------------------------------------------------------------
# Admin invite acceptance (invite created by POST /admin/invite — see
# services/invite_service.py). Public — the token itself is the auth.
# ---------------------------------------------------------------------------

@router.get(
    "/invite/{token}",
    response_model=InviteValidateResponse,
    summary="Check whether an admin invite token is still valid",
)
async def validate_invite(token: str, db: Session = Depends(get_db)):
    invitation = InviteService.validate_invitation(db, token)
    if not invitation:
        return InviteValidateResponse(valid=False)
    return InviteValidateResponse(valid=True, email=invitation.email, role=invitation.role)


@router.post(
    "/invite/accept",
    response_model=TokenResponse,
    summary="Complete registration from a valid admin invite and sign in",
)
async def accept_invite(payload: AcceptInviteRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        user = InviteService.accept_invitation(db, payload.token, payload.name, payload.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": str(e)})

    AuditService.log(
        db=db, action="invite_accepted", resource=f"user:{user.id}", user_id=user.id,
        details={"email": user.email, "role": user.role},
        ip_address=_client_ip(request),
    )
    logger.info("Admin account created via invite: %s", user.email)

    access_token, refresh_token = SessionService.issue(db, user, request.headers.get("user-agent"), _client_ip(request))
    response.status_code = status.HTTP_201_CREATED
    return TokenResponse(token=access_token, refreshToken=refresh_token, user=build_user_out(user, db))


# ---------------------------------------------------------------------------
# Login / session
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse, summary="Sign in with email and password")
async def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"error": "Invalid email or password"})
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"error": "Account disabled."})

    if payload.role and payload.role.lower() != user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "This account's role does not match the requested portal"},
        )

    if user.role == "doctor" and user.verification_status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "This account is pending admin verification", "code": "DOCTOR_PENDING_APPROVAL"},
        )
    if user.role == "doctor" and user.verification_status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "This doctor account was not approved. Contact support.", "code": "DOCTOR_REJECTED"},
        )

    AuditService.log(
        db=db, action="user_login", resource=f"user:{user.id}", user_id=user.id,
        details={"role": user.role}, ip_address=_client_ip(request),
    )

    access_token, refresh_token = SessionService.issue(db, user, request.headers.get("user-agent"), _client_ip(request))
    return TokenResponse(token=access_token, refreshToken=refresh_token, user=build_user_out(user, db))


@router.post("/refresh", response_model=TokenResponse, summary="Exchange a refresh token for a new access token")
async def refresh(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"error": "Refresh token invalid or expired", "code": "REFRESH_TOKEN_INVALID"},
    )
    user_id = SessionService.find_user_id_for_refresh_token(db, payload.refreshToken)
    if not user_id:
        raise invalid
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise invalid

    result = SessionService.rotate(db, payload.refreshToken, user, request.headers.get("user-agent"), _client_ip(request))
    if result is None:
        raise invalid
    access_token, new_refresh_token = result
    return TokenResponse(token=access_token, refreshToken=new_refresh_token, user=build_user_out(user, db))


@router.post("/logout", response_model=MessageResponse, summary="Invalidate the current session")
async def logout(
    current_user: User = Depends(get_current_user),
    jti: str | None = Depends(get_current_jti),
    db: Session = Depends(get_db),
):
    SessionService.revoke_by_jti(db, jti)
    AuditService.log(db=db, action="user_logout", resource=f"user:{current_user.id}", user_id=current_user.id, details={})
    return {"message": "Logged out"}


@router.get("/me", response_model=MeResponse, summary="Get current authenticated user info")
async def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"user": build_user_out(current_user, db)}


# ---------------------------------------------------------------------------
# Profile — name / gender / avatar (shared across all three roles)
#
# Role-specific clinical fields (PatientProfile.dob/gender/blood_group,
# DoctorProfile.specialization/bio/etc.) are untouched and keep using
# PUT /patient/profile and PUT /doctor/profile.
# ---------------------------------------------------------------------------

@router.patch("/profile", response_model=MeResponse, summary="Update name, UI gender, and/or selected avatar")
async def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.name is not None:
        current_user.name = payload.name.strip()
    if payload.gender is not None:
        current_user.gender = payload.gender
    if payload.clear_avatar_key:
        current_user.avatar_key = None
    elif payload.avatar_key is not None:
        current_user.avatar_key = payload.avatar_key

    db.commit()
    db.refresh(current_user)

    AuditService.log(
        db=db, action="profile_updated", resource=f"user:{current_user.id}", user_id=current_user.id,
        details={"gender": current_user.gender, "avatar_key": current_user.avatar_key},
    )
    return {"user": build_user_out(current_user, db)}


ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/profile/photo", response_model=MeResponse, summary="Upload a profile photo (highest display priority)")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(status_code=400, detail={"error": f"Unsupported file type: {file.content_type}"})

    content = await file.read()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail={"error": "File too large"})

    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    save_path = os.path.join(settings.upload_dir, filename)
    with open(save_path, "wb") as f:
        f.write(content)

    # Served by the /uploads static mount registered in main.py.
    current_user.avatar_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(current_user)

    AuditService.log(
        db=db, action="profile_photo_uploaded", resource=f"user:{current_user.id}", user_id=current_user.id,
        details={},
    )
    return {"user": build_user_out(current_user, db)}


@router.delete("/profile/photo", response_model=MeResponse, summary="Remove the uploaded profile photo")
async def delete_profile_photo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.avatar_url = None
    db.commit()
    db.refresh(current_user)
    return {"user": build_user_out(current_user, db)}


# ---------------------------------------------------------------------------
# Password reset OTP flow
# ---------------------------------------------------------------------------

@router.post("/password-reset/send-otp", response_model=OtpSentResponse, summary="Send password reset code")
async def send_password_reset_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    if not db.query(User).filter(User.email == email_clean).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "No account found for this email"})

    expires_in = OtpService.generate_and_send(db, email_clean, purpose="password_reset")
    return {"message": "Verification code sent", "expiresInSeconds": expires_in}


@router.post("/password-reset/verify-otp", summary="Verify password reset code")
async def verify_password_reset_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    token = OtpService.verify(db, email_clean, payload.otp, purpose="password_reset")
    return {"resetToken": token, "expiresInSeconds": 900}


@router.post("/password-reset/reset", response_model=MessageResponse, summary="Reset password using a verified token")
async def reset_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    OtpService.consume_verification_token(db, email_clean, payload.resetToken, purpose="password_reset")

    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Reset token invalid or expired", "code": "RESET_TOKEN_INVALID"},
        )

    user.hashed_password = hash_password(payload.newPassword)
    db.commit()

    # A password change invalidates every existing session — a stolen
    # access/refresh token pair should not survive a reset.
    SessionService.revoke_all_for_user(db, user.id)

    AuditService.log(db=db, action="password_reset", resource=f"user:{user.id}", user_id=user.id, details={})
    return {"message": "Password updated"}