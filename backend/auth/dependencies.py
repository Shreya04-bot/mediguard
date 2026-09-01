"""
MediGuard AI — Auth Dependencies & Role Middleware
===================================================
JWT decoding and Role-Based Access Control (RBAC) dependency factories.
"""

from __future__ import annotations
from typing import Callable, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from auth.db import get_db, User
from auth.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate bearer token and retrieve active user."""
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_error
    try:
        payload = decode_access_token(token)
        user_id: Optional[str] = payload.get("sub")
        jti: Optional[str] = payload.get("jti")
        if user_id is None:
            raise credentials_error
    except JWTError:
        raise credentials_error

    from services.session_service import SessionService
    if SessionService.is_jti_revoked(db, jti):
        raise credentials_error

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_error
    return user


def get_current_jti(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[str]:
    """Returns the jti claim of the current bearer token, if any (used by /auth/logout)."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        return payload.get("jti")
    except JWTError:
        return None


def require_role(*roles: str) -> Callable[[User], User]:
    """Dependency generator that restricts endpoint access to specified roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Requires one of roles {list(roles)}",
            )
        return current_user
    return role_checker


def require_verified_doctor(current_user: User = Depends(get_current_user)) -> User:
    """Ensures user is a doctor AND has been approved by an administrator."""
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Doctor role required.",
        )
    if current_user.verification_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Your doctor account is pending administrator verification.",
        )
    return current_user
