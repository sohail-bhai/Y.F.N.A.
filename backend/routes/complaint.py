"""
Changes made and why:
- Removed SMTP background email sending from submit route.
- Complaint submit still persists to DB with status/submitted_at unchanged.

routes/complaint.py
────────────────────
POST /generate-complaint  – generate complaint text from detection + user inputs
POST /submit-complaint    – persist complaint (email send intentionally removed from route)
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import get_settings
from database import get_db
from models.db_models import UploadSession, Complaint
from models.schemas import (
    GenerateComplaintRequest,
    GenerateComplaintResponse,
    SubmitComplaintRequest,
    SubmitComplaintResponse,
)
from services.complaint_service import generate_complaint_text

router   = APIRouter()
settings = get_settings()


# ── Generate ──────────────────────────────────────────────────────────────────

@router.post("/generate-complaint", response_model=GenerateComplaintResponse)
async def generate_complaint(
    body: GenerateComplaintRequest,
    db: AsyncSession = Depends(get_db),
):
    # Validate session exists
    result  = await db.execute(select(UploadSession).where(UploadSession.id == body.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Upload session not found.")

    text = generate_complaint_text(
        issue_type=body.issue_type,
        location=body.location,
        severity=body.severity,
        additional_notes=body.additional_notes,
        latitude=body.latitude,
        longitude=body.longitude,
    )

    # Upsert draft complaint row
    comp_result = await db.execute(
        select(Complaint).where(Complaint.session_id == body.session_id)
    )
    complaint = comp_result.scalar_one_or_none()

    if complaint:
        complaint.complaint_text = text
        complaint.issue_type     = body.issue_type
        complaint.location       = body.location
        complaint.severity       = body.severity
    else:
        complaint = Complaint(
            session_id=body.session_id,
            issue_type=body.issue_type,
            location=body.location,
            severity=body.severity,
            complaint_text=text,
            status="draft",
        )
        db.add(complaint)

    return GenerateComplaintResponse(complaint_text=text)


# ── Submit ────────────────────────────────────────────────────────────────────

@router.post("/submit-complaint", response_model=SubmitComplaintResponse)
async def submit_complaint(
    body: SubmitComplaintRequest,
    db: AsyncSession = Depends(get_db),
):
    # Load session + complaint
    sess_result = await db.execute(select(UploadSession).where(UploadSession.id == body.session_id))
    session     = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Upload session not found.")

    comp_result = await db.execute(select(Complaint).where(Complaint.session_id == body.session_id))
    complaint   = comp_result.scalar_one_or_none()

    now = datetime.utcnow()

    if complaint:
        complaint.complaint_text = body.complaint_text
        complaint.contact_email  = body.contact_email
        complaint.status         = "submitted"
        complaint.submitted_at   = now
        submission_id            = complaint.id
    else:
        complaint = Complaint(
            session_id=body.session_id,
            issue_type="Unknown",
            location="",
            complaint_text=body.complaint_text,
            contact_email=body.contact_email,
            status="submitted",
            submitted_at=now,
        )
        db.add(complaint)
        await db.flush()
        submission_id = complaint.id

    return SubmitComplaintResponse(
        submission_id=submission_id,
        submitted_at=now.isoformat(),
    )
