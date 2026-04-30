"""
Changes made and why:
- Confirmed UploadResponse includes filename field used by frontend to build static image URL.

models/schemas.py – Pydantic v2 request & response schemas.
"""
from __future__ import annotations
from typing import Any
from pydantic import BaseModel, EmailStr, Field, field_validator


# ─── Upload ───────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    session_id: str
    filename: str
    size_bytes: int


# ─── Analysis ────────────────────────────────────────────────────────────────

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    label: str
    score: float


class AnalyzeRequest(BaseModel):
    session_id: str


class AnalyzeResponse(BaseModel):
    label: str
    confidence: float
    bounding_boxes: list[BoundingBox] = Field(default_factory=list)
    model_name: str
    inference_ms: int
    below_threshold: bool
    session_id: str


# ─── Clarification ───────────────────────────────────────────────────────────

class ClarifyRequest(BaseModel):
    session_id: str
    answers: dict[str, str]   # { "issue_type": "Pothole / Road damage", ... }


class ClarifyResponse(BaseModel):
    label: str
    confidence: float


# ─── Complaint generation ─────────────────────────────────────────────────────

class GenerateComplaintRequest(BaseModel):
    session_id: str
    issue_type: str
    location: str
    severity: str = "moderate"
    additional_notes: str = ""
    latitude: float | None = None    # Optional GPS latitude
    longitude: float | None = None   # Optional GPS longitude


class GenerateComplaintResponse(BaseModel):
    complaint_text: str


# ─── Submission ──────────────────────────────────────────────────────────────

class SubmitComplaintRequest(BaseModel):
    session_id: str
    complaint_text: str
    contact_email: EmailStr | None = None

    @field_validator("complaint_text")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("complaint_text cannot be empty")
        return v


class SubmitComplaintResponse(BaseModel):
    submission_id: str
    submitted_at: str
