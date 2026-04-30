# CivicAI Reporter

> AI-powered civic infrastructure issue reporting system.  
> Upload a photo → AI detects the issue → complaint is drafted and filed automatically.

---

## Project Structure

```
civicai-reporter/
├── frontend/                     # React + Vite + Tailwind + Framer Motion
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   ├── ResultPage.jsx
│   │   │   ├── ComplaintPreviewPage.jsx
│   │   │   └── SuccessPage.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── PageWrapper.jsx
│   │   │   └── ConfidenceBar.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── backend/                      # FastAPI + PostgreSQL + Pluggable AI
    ├── main.py                   # App entry point
    ├── config.py                 # Settings (pydantic-settings)
    ├── database.py               # Async SQLAlchemy engine + Base
    ├── requirements.txt
    ├── .env.example
    ├── ml/
    │   └── model_loader.py       # ← Plug in your own model here
    ├── models/
    │   ├── db_models.py          # ORM tables
    │   └── schemas.py            # Pydantic request/response schemas
    ├── routes/
    │   ├── upload.py             # POST /upload-image
    │   ├── analyze.py            # POST /analyze-image
    │   ├── clarify.py            # POST /clarify
    │   └── complaint.py          # POST /generate-complaint, /submit-complaint
    ├── services/
    │   ├── complaint_service.py  # Template-based complaint generation
    │   └── email_service.py      # SMTP sender with image attachment
    └── utils/
        ├── image_utils.py        # PIL preprocessing helpers
        └── alembic_env.py        # Alembic migration env (copy to alembic/)
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| Python | ≥ 3.11 |
| PostgreSQL | ≥ 14 |

---

## Quick Start

### 1 — Clone & enter the project

```bash
git clone <repo-url>
cd civicai-reporter
```

### 2 — Database setup

```sql
-- In psql or pgAdmin:
CREATE DATABASE civicai;
```

### 3 — Backend setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, SMTP credentials, etc.

# Start the server (tables created automatically on first run)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: http://localhost:8000/api/docs

### 4 — Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App available at: http://localhost:5173

---

## Plugging in Your Own AI Model

This is the core extensibility feature. Open `backend/ml/model_loader.py`.

### Option A — Local PyTorch model

```bash
# .env
MODEL_BACKEND=local_torch
MODEL_PATH=/path/to/your/model.pt
```

Your model must output a tensor of shape `[N_CLASSES]` (softmax probabilities).  
The class order must match `ISSUE_CLASSES` in `model_loader.py` (customise as needed).

### Option B — YOLO (Ultralytics)

```bash
pip install ultralytics

# .env
MODEL_BACKEND=yolo
MODEL_PATH=/path/to/your/best.pt
```

Supports YOLOv8, YOLOv9, YOLOv10 `.pt` weights.

### Option C — External REST API

```bash
# .env
MODEL_BACKEND=api
MODEL_API_URL=https://your-inference-server.com/predict
MODEL_API_KEY=optional-key
```

Your endpoint must accept `multipart/form-data` with a `file` field  
and return `{ "label": str, "confidence": float, "bounding_boxes": [...] }`.

### Option D — Write your own backend

```python
# In ml/model_loader.py or a new file:
from ml.model_loader import CivicBaseModel, PredictResult, register_model

class MyCustomModel(CivicBaseModel):
    @property
    def name(self) -> str:
        return "MyModel-v1"

    def predict(self, image) -> PredictResult:
        # your inference logic here
        return PredictResult(label="Pothole", confidence=0.91)

register_model("my_model", MyCustomModel)
```

```bash
# .env
MODEL_BACKEND=my_model
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async PostgreSQL connection string |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port (STARTTLS) |
| `SMTP_USER` | — | SMTP login email |
| `SMTP_PASSWORD` | — | SMTP password / app password |
| `COMPLAINT_RECIPIENT` | — | Authority email to send complaints to |
| `MODEL_BACKEND` | `mock` | `mock` \| `local_torch` \| `yolo` \| `api` |
| `MODEL_PATH` | — | Filesystem path to model weights |
| `MODEL_API_URL` | — | External inference endpoint URL |
| `CONFIDENCE_THRESHOLD` | `0.60` | Below this → trigger clarification flow |
| `UPLOAD_DIR` | `uploads` | Directory to store uploaded images |
| `MAX_UPLOAD_MB` | `20` | Maximum upload size in megabytes |

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload-image` | Upload image, get session_id |
| `POST` | `/analyze-image` | Run AI inference on session |
| `POST` | `/clarify` | Submit human clarification answers |
| `POST` | `/generate-complaint` | Generate complaint text |
| `POST` | `/submit-complaint` | Persist + email the complaint |
| `GET`  | `/health` | Health check + model name |

Full interactive docs: http://localhost:8000/api/docs

---

## Database Migrations (Production)

```bash
cd backend
alembic init alembic
cp utils/alembic_env.py alembic/env.py
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Uvicorn |
| Database | PostgreSQL 14+, SQLAlchemy 2 (async) |
| AI/ML | Pluggable: Mock / PyTorch / YOLO / REST API |
| Email | aiosmtplib (async SMTP) |
| Migrations | Alembic |

---

## Final-Year Project Notes

- **Mock model** (`MODEL_BACKEND=mock`) works out of the box with no GPU / model weights required — ideal for demos and UI development.
- To train your own CNN: use `ISSUE_CLASSES` in `model_loader.py` as your label set, train a standard image classifier, save as TorchScript (`.pt`), and set `MODEL_BACKEND=local_torch`.
- The `CivicBaseModel` abstract class is the only contract between the backend and any AI model — clean separation of concerns.

---

*CivicAI Reporter — Final-Year Engineering Project*
