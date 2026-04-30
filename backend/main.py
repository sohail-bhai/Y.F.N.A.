"""
main.py – CivicAI Reporter FastAPI application entry point.

Run with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.middleware.sessions import SessionMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from database import init_db
from ml.model_loader import load_model
from routes import upload, analyze, clarify, complaint

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s – %(message)s",
)
logger   = logging.getLogger("civicai")
settings = get_settings()


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──────────────────────────────────────────────────────────────
    logger.info("CivicAI Reporter starting up …")

    # Initialise database (creates tables if they don't exist)
    await init_db()
    logger.info("Database tables verified.")

    # Load AI model (configured via MODEL_BACKEND in .env)
    app.state.model = load_model()
    logger.info("Model loaded: %s", app.state.model.name)

    # Ensure upload directory exists
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

    yield

    # ── SHUTDOWN ─────────────────────────────────────────────────────────────
    logger.info("CivicAI Reporter shutting down.")


# ── Application factory ───────────────────────────────────────────────────────

app = FastAPI(
    title="CivicAI Reporter API",
    description="AI-powered civic infrastructure issue reporting backend.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.app_secret,
    same_site="lax",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
for router in [upload.router, analyze.router, clarify.router, complaint.router]:
    app.include_router(router, prefix="")

# ── Serve uploaded images as static files (dev convenience) ───────────────────
uploads_path = Path(settings.upload_dir)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Meta"])
async def health():
    return {
        "status": "ok",
        "model": app.state.model.name if hasattr(app.state, "model") else "not loaded",
        "version": "1.0.0",
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    # Avoid repeated 404 log noise from browser favicon requests.
    return Response(status_code=204)
