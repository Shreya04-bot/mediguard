"""
MediGuard AI — Email Service
==============================
Sends transactional emails (currently: OTP codes for registration and
password reset).

Behaviour:
  - If SMTP_HOST is configured (see utils/config.py), sends real email
    via smtplib over TLS.
  - Otherwise (local/dev by default), logs the message instead of
    sending it, so the flow is fully testable without any email
    provider. The OTP is NEVER included in any HTTP response — only
    in the server log — so this stays safe to leave on in a shared
    dev environment.

To go to production: set SMTP_HOST, SMTP_USER, SMTP_PASSWORD,
SMTP_FROM_EMAIL (e.g. via SendGrid, SES SMTP, Postmark, etc.) in the
environment. No code changes needed.
"""

from __future__ import annotations
import logging
import smtplib
from email.mime.text import MIMEText

from utils.config import settings

logger = logging.getLogger(__name__)


class EmailService:

    @staticmethod
    def _dev_mode() -> bool:
        return not settings.smtp_host

    @staticmethod
    def send(to_email: str, subject: str, body: str) -> None:
        if EmailService._dev_mode():
            logger.info(
                "[DEV EMAIL — SMTP not configured, not actually sent]\nTo: %s\nSubject: %s\n%s",
                to_email, subject, body,
            )
            return

        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from_email
        msg["To"] = to_email

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, [to_email], msg.as_string())

    @staticmethod
    def send_otp(to_email: str, otp: str, purpose: str) -> None:
        if purpose == "register":
            subject = "Verify your email — MediGuard AI"
            body = (
                f"Your MediGuard AI verification code is: {otp}\n\n"
                f"This code expires in {settings.otp_expire_seconds // 60} minutes. "
                f"If you didn't request this, you can ignore this email."
            )
        else:
            subject = "Password reset code — MediGuard AI"
            body = (
                f"Your MediGuard AI password reset code is: {otp}\n\n"
                f"This code expires in {settings.otp_expire_seconds // 60} minutes. "
                f"If you didn't request this, you can ignore this email and your "
                f"password will remain unchanged."
            )
        EmailService.send(to_email, subject, body)
