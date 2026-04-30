"""
routes/analyze.py – POST /analyze-image
"""
import inspect
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, Request
from starlette.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import get_settings
from database import get_db
from models.db_models import UploadSession, PredictionLog
from models.schemas import AnalyzeRequest, AnalyzeResponse, BoundingBox

router   = APIRouter()
settings = get_settings()


@router.post("/analyze-image", response_model=AnalyzeResponse)
async def analyze_image(
    body: AnalyzeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    # ── Load upload session ───────────────────────────────────────────────────
    result  = await db.execute(select(UploadSession).where(UploadSession.id == body.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Upload session not found.")

    img_path = Path(session.stored_path)
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded image file not found on server.")

    # ── Run inference via pluggable model ─────────────────────────────────────
    # The model is loaded once at startup and stored in app state
    model = request.app.state.model

    from PIL import Image
    with Image.open(img_path) as img:
        img_rgb = img.convert("RGB")
        if inspect.iscoroutinefunction(model.predict):
            prediction = await model.predict(img_rgb)
        else:
            prediction = await run_in_threadpool(model.predict, img_rgb)

    below_threshold = prediction.confidence < settings.confidence_threshold

    # ── Persist prediction log ────────────────────────────────────────────────
    log = PredictionLog(
        session_id=body.session_id,
        model_name=prediction.model_name,
        label=prediction.label,
        confidence=prediction.confidence,
        bounding_boxes=[
            {"x1": b.x1, "y1": b.y1, "x2": b.x2, "y2": b.y2, "label": b.label, "score": b.score}
            for b in prediction.bounding_boxes
        ],
        inference_ms=prediction.inference_ms,
        below_threshold=below_threshold,
    )
    db.add(log)

    return AnalyzeResponse(
        label=prediction.label,
        confidence=round(prediction.confidence, 4),
        bounding_boxes=[
            BoundingBox(x1=b.x1, y1=b.y1, x2=b.x2, y2=b.y2, label=b.label, score=b.score)
            for b in prediction.bounding_boxes
        ],
        model_name=prediction.model_name,
        inference_ms=prediction.inference_ms,
        below_threshold=below_threshold,
        session_id=body.session_id,
    )
