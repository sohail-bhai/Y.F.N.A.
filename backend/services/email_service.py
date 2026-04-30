"""
services/email_service.py
─────────────────────────
Async SMTP email sender using aiosmtplib.
Attaches the uploaded evidence image to the complaint email.
"""
from __future__ import annotations

import asyncio
import logging
import mimetypes
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path

import aiosmtplib

from config import get_settings

logger   = logging.getLogger(__name__)
settings = get_settings()


async def send_complaint_email(
    complaint_text: str,
    issue_type: str,
    location: str,
    image_path: str | None = None,
    contact_email: str | None = None,
) -> bool:
    """
    Send the complaint to the configured civic authority email.
    Optionally CC the reporter and attach the evidence image.

    Returns True on success, False on failure (errors are logged, not raised).
    """
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP credentials not configured – email sending skipped.")
        return False

    subject = f"[CivicAI Report] {issue_type} – {location or 'Location attached'}"

    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"]    = settings.email_from
    msg["To"]      = settings.complaint_recipient
    if contact_email:
        msg["Cc"] = contact_email

    # Plain-text body
    msg.attach(MIMEText(complaint_text, "plain", "utf-8"))

    # Attach image evidence
    if image_path:
        _attach_image(msg, image_path)

    try:
        async with aiosmtplib.SMTP(
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            use_tls=False,
        ) as smtp:
            await smtp.ehlo()
            await smtp.starttls()
            await smtp.login(settings.smtp_user, settings.smtp_password)
            recipients = [settings.complaint_recipient]
            if contact_email:
                recipients.append(contact_email)
            await smtp.sendmail(settings.smtp_user, recipients, msg.as_string())

        logger.info("Complaint email sent to %s", settings.complaint_recipient)
        return True

    except Exception as exc:
        logger.error("Failed to send complaint email: %s", exc)
        return False


def _attach_image(msg: MIMEMultipart, image_path: str) -> None:
    """Attach an image file to the email message."""
    path = Path(image_path)
    if not path.exists():
        logger.warning("Image attachment not found at %s – skipping.", image_path)
        return

    mime_type, _ = mimetypes.guess_type(str(path))
    main, sub    = (mime_type or "image/jpeg").split("/", 1)

    with open(path, "rb") as f:
        part = MIMEBase(main, sub)
        part.set_payload(f.read())

    encoders.encode_base64(part)
    part.add_header("Content-Disposition", "attachment", filename=path.name)
    msg.attach(part)
