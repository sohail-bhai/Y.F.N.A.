"""
models/db_models.py – ORM table definitions.
"""
import uuid
from datetime import datetime

from sqlalchemy import String, Float, Integer, Text, DateTime, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _uuid():
    return str(uuid.uuid4())


# ─── Upload Session ───────────────────────────────────────────────────────────

class UploadSession(Base):
    __tablename__ = "upload_sessions"

    id: Mapped[str]            = mapped_column(String(36), primary_key=True, default=_uuid)
    original_filename: Mapped[str] = mapped_column(String(255))
    stored_path: Mapped[str]   = mapped_column(String(512))
    size_bytes: Mapped[int]    = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    predictions: Mapped[list["PredictionLog"]] = relationship(back_populates="session")
    complaint: Mapped["Complaint | None"]      = relationship(back_populates="session", uselist=False)


# ─── Prediction Log ───────────────────────────────────────────────────────────

class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id: Mapped[str]             = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str]     = mapped_column(ForeignKey("upload_sessions.id"), index=True)
    model_name: Mapped[str]     = mapped_column(String(100))
    label: Mapped[str]          = mapped_column(String(100))
    confidence: Mapped[float]   = mapped_column(Float)
    bounding_boxes: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    inference_ms: Mapped[int | None]    = mapped_column(Integer, nullable=True)
    below_threshold: Mapped[bool]       = mapped_column(default=False)
    created_at: Mapped[datetime]        = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["UploadSession"] = relationship(back_populates="predictions")


# ─── Complaint ────────────────────────────────────────────────────────────────

class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[str]               = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str]       = mapped_column(ForeignKey("upload_sessions.id"), unique=True, index=True)
    issue_type: Mapped[str]       = mapped_column(String(100))
    location: Mapped[str]         = mapped_column(String(255))
    severity: Mapped[str]         = mapped_column(String(50), default="moderate")
    complaint_text: Mapped[str]   = mapped_column(Text)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str]           = mapped_column(
        SAEnum("draft", "submitted", "acknowledged", name="complaint_status"),
        default="draft",
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime]          = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["UploadSession"] = relationship(back_populates="complaint")


# ─── User Feedback ────────────────────────────────────────────────────────────

class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id: Mapped[str]            = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str]    = mapped_column(ForeignKey("upload_sessions.id"), index=True)
    question_id: Mapped[str]   = mapped_column(String(100))
    answer: Mapped[str]        = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
