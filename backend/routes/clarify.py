"""
routes/clarify.py – POST /clarify
Human-in-the-loop: refine prediction using user-provided answers.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.db_models import UploadSession, PredictionLog, UserFeedback
from models.schemas import ClarifyRequest, ClarifyResponse

router = APIRouter()

# Mapping from user-provided issue label answers to canonical labels
_LABEL_MAP = {
    "Pothole / Road damage":   "Pothole",
    "Broken streetlight":      "Broken Streetlight",
    "Water leakage":           "Water Leakage",
    "Garbage accumulation":    "Garbage Accumulation",
    "Damaged footpath":        "Damaged Footpath",
    "Other":                   "General Infrastructure Issue",
}

_SEVERITY_CONFIDENCE_BOOST = {
    "Minor (cosmetic)":      0.0,
    "Moderate (inconvenient)": 0.05,
    "Severe (dangerous)":    0.10,
}


@router.post("/clarify", response_model=ClarifyResponse)
async def clarify(
    body: ClarifyRequest,
    db: AsyncSession = Depends(get_db),
):
    # ── Validate session ──────────────────────────────────────────────────────
    result  = await db.execute(select(UploadSession).where(UploadSession.id == body.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Upload session not found.")

    # ── Retrieve last prediction ──────────────────────────────────────────────
    pred_result = await db.execute(
        select(PredictionLog)
        .where(PredictionLog.session_id == body.session_id)
        .order_by(PredictionLog.created_at.desc())
        .limit(1)
    )
    pred = pred_result.scalar_one_or_none()

    # ── Derive refined label & confidence from user answers ───────────────────
    raw_label = body.answers.get("issue_type", "")
    label     = _LABEL_MAP.get(raw_label, pred.label if pred else "General Infrastructure Issue")

    base_conf = pred.confidence if pred else 0.50
    boost     = _SEVERITY_CONFIDENCE_BOOST.get(body.answers.get("severity", ""), 0.0)
    # Human correction always increases confidence
    refined_conf = min(round(base_conf + 0.15 + boost, 4), 0.95)

    # ── Persist feedback ──────────────────────────────────────────────────────
    for q_id, answer in body.answers.items():
        db.add(UserFeedback(session_id=body.session_id, question_id=q_id, answer=answer))

    # ── Update prediction log ─────────────────────────────────────────────────
    if pred:
        pred.label          = label
        pred.confidence     = refined_conf
        pred.below_threshold = False

    return ClarifyResponse(label=label, confidence=refined_conf)
