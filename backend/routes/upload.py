"""
routes/upload.py – POST /upload-image
Changes made and why:
- Upload response filename now returns stored server filename (UUID.ext), not original name.
- This enables frontend to construct valid /uploads/<filename> evidence URL.
"""
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database import get_db
from models.db_models import UploadSession
from models.schemas import UploadResponse

router   = APIRouter()
settings = get_settings()

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES    = settings.max_upload_mb * 1024 * 1024


@router.post("/upload-image", response_model=UploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # ── Validate mime type ────────────────────────────────────────────────────
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type '{file.content_type}'. Accepted: JPEG, PNG, WEBP.",
        )

    # ── Read & size check ─────────────────────────────────────────────────────
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_upload_mb} MB.",
        )

    # ── Persist to disk ───────────────────────────────────────────────────────
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    session_id = str(uuid.uuid4())
    suffix     = Path(file.filename or "upload.jpg").suffix or ".jpg"
    dest_path  = upload_dir / f"{session_id}{suffix}"

    with open(dest_path, "wb") as f:
        f.write(contents)

    # ── Persist session to DB ─────────────────────────────────────────────────
    session = UploadSession(
        id=session_id,
        original_filename=file.filename or "upload",
        stored_path=str(dest_path),
        size_bytes=len(contents),
    )
    db.add(session)
    # commit is handled by get_db dependency

    return UploadResponse(
        session_id=session_id,
        filename=dest_path.name,
        size_bytes=len(contents),
    )
