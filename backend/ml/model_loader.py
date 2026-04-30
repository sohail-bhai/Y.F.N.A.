"""
ml/model_loader.py
──────────────────
Pluggable AI model architecture for CivicAI Reporter.

To add your own model:
  1. Subclass BaseModel
  2. Implement predict(image: PIL.Image) → PredictResult
  3. Register it in _REGISTRY below (or set MODEL_BACKEND in .env)

Standard return format (PredictResult):
    label          – str   – detected issue class
    confidence     – float – 0.0–1.0
    bounding_boxes – list  – [{x1,y1,x2,y2,label,score}, ...]
"""
from __future__ import annotations

import time
import random
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from PIL import Image

from config import get_settings

settings = get_settings()


# ─── Standard return type ─────────────────────────────────────────────────────

@dataclass
class BBoxResult:
    x1: float
    y1: float
    x2: float
    y2: float
    label: str
    score: float


@dataclass
class PredictResult:
    label: str
    confidence: float
    bounding_boxes: list[BBoxResult] = field(default_factory=list)
    model_name: str = "unknown"
    inference_ms: int = 0


# ─── Abstract base ────────────────────────────────────────────────────────────

class CivicBaseModel(ABC):
    """
    Every custom model must subclass this and implement predict().
    No other backend code needs to change.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable model identifier."""
        ...

    @abstractmethod
    def predict(self, image: Image.Image) -> PredictResult:
        """
        Run inference on a PIL Image.

        Args:
            image: PIL.Image in RGB mode.

        Returns:
            PredictResult with label, confidence, and optional bounding_boxes.
        """
        ...


# ─── Mock model (development / demo) ─────────────────────────────────────────

ISSUE_CLASSES = [
    "Pothole",
    "Broken Streetlight",
    "Water Leakage",
    "Garbage Accumulation",
    "Damaged Footpath",
    "Collapsed Drain Cover",
    "Cracked Road Surface",
    "Fallen Tree / Branch",
]


class MockModel(CivicBaseModel):
    """
    Returns deterministic-ish random predictions.
    Useful for frontend development without a real model.
    """

    @property
    def name(self) -> str:
        return "MockCNN-v1"

    def predict(self, image: Image.Image) -> PredictResult:
        t0 = time.perf_counter()

        # Use image pixel stats to seed randomness (repeatable for same image)
        import numpy as np
        arr  = np.array(image.resize((64, 64)).convert("L"))
        seed = int(arr.mean() * 1000) % 10000
        rng  = random.Random(seed)

        label      = rng.choice(ISSUE_CLASSES)
        confidence = round(rng.uniform(0.42, 0.97), 4)

        # Simulate a bounding box (normalised 0–1 coords)
        x1 = round(rng.uniform(0.1, 0.3), 3)
        y1 = round(rng.uniform(0.1, 0.3), 3)
        x2 = round(rng.uniform(0.6, 0.85), 3)
        y2 = round(rng.uniform(0.55, 0.8), 3)

        elapsed_ms = int((time.perf_counter() - t0) * 1000) + rng.randint(20, 120)

        return PredictResult(
            label=label,
            confidence=confidence,
            bounding_boxes=[BBoxResult(x1=x1, y1=y1, x2=x2, y2=y2, label=label, score=confidence)],
            model_name=self.name,
            inference_ms=elapsed_ms,
        )


# ─── Local PyTorch model ──────────────────────────────────────────────────────

class LocalTorchModel(CivicBaseModel):
    """
    Load any TorchScript / torch.save checkpoint.
    Set MODEL_PATH to your .pt file in .env.

    Expected model output: tensor of shape [N_CLASSES] (softmax probabilities)
    """

    def __init__(self, model_path: str):
        import torch
        import torchvision.transforms as T  # pyright: ignore[reportMissingImports]

        self._model_path = model_path
        self._device     = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._model      = torch.load(model_path, map_location=self._device)
        self._model.eval()

        self._transform = T.Compose([
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    @property
    def name(self) -> str:
        return f"TorchModel({self._model_path.split('/')[-1]})"

    def predict(self, image: Image.Image) -> PredictResult:
        import torch

        t0    = time.perf_counter()
        inp   = self._transform(image.convert("RGB")).unsqueeze(0).to(self._device)

        with torch.no_grad():
            out  = self._model(inp)
            prob = torch.softmax(out, dim=1)[0]
            idx  = int(prob.argmax())
            conf = float(prob[idx])

        label = ISSUE_CLASSES[idx] if idx < len(ISSUE_CLASSES) else f"Class_{idx}"
        return PredictResult(
            label=label,
            confidence=conf,
            model_name=self.name,
            inference_ms=int((time.perf_counter() - t0) * 1000),
        )


# ─── YOLO model (Ultralytics) ─────────────────────────────────────────────────

class YOLOModel(CivicBaseModel):
    """
    Wraps any Ultralytics YOLOv8/v9/v10 .pt model.
    Set MODEL_PATH to your .pt file.
    """

    def __init__(self, model_path: str):
        from ultralytics import YOLO  # pyright: ignore[reportMissingImports]
        import torch
        
        # PyTorch 2.6+ blocks model loading by default. Disable weights_only for trusted .pt files.
        # This is safe since we control the model file.
        original_load = torch.load
        def patched_load(f, *args, **kwargs):
            if 'weights_only' not in kwargs:
                kwargs['weights_only'] = False
            return original_load(f, *args, **kwargs)
        
        try:
            torch.load = patched_load
            self._yolo = YOLO(model_path)
            self._model_path = model_path
        finally:
            torch.load = original_load

    @property
    def name(self) -> str:
        return f"YOLO({self._model_path.split('/')[-1]})"

    def predict(self, image: Image.Image) -> PredictResult:
        t0      = time.perf_counter()
        results = self._yolo.predict(source=image, verbose=False)
        elapsed = int((time.perf_counter() - t0) * 1000)

        boxes: list[BBoxResult] = []
        best_conf = 0.0
        best_label = "Unknown"

        for r in results:
            for box in r.boxes:
                cls  = int(box.cls[0])
                conf = float(box.conf[0])
                xyxyn = box.xyxyn[0].tolist()  # normalised [x1,y1,x2,y2]
                lbl  = r.names.get(cls, f"class_{cls}")
                boxes.append(BBoxResult(x1=xyxyn[0], y1=xyxyn[1], x2=xyxyn[2], y2=xyxyn[3],
                                        label=lbl, score=conf))
                if conf > best_conf:
                    best_conf  = conf
                    best_label = lbl

        if not boxes:
            best_label = "No detection"
            best_conf  = 0.0

        return PredictResult(
            label=best_label,
            confidence=best_conf,
            bounding_boxes=boxes,
            model_name=self.name,
            inference_ms=elapsed,
        )


# ─── External API model ───────────────────────────────────────────────────────

class APIModel(CivicBaseModel):
    """
    Calls an external REST inference endpoint.

    Expects the endpoint to accept:
        POST <MODEL_API_URL>
        Content-Type: multipart/form-data
        Body: file=<image bytes>
        (optional) Authorization: Bearer <MODEL_API_KEY>

    And return JSON:
        { "label": str, "confidence": float,
          "bounding_boxes": [{x1,y1,x2,y2,label,score}] }
    """

    def __init__(self, api_url: str, api_key: str = ""):
        self._url = api_url
        self._key = api_key

    @property
    def name(self) -> str:
        return f"APIModel({self._url})"

    async def predict(self, image: Image.Image) -> PredictResult:
        import io
        import httpx  # pyright: ignore[reportMissingImports]

        t0  = time.perf_counter()
        buf = io.BytesIO()
        image.save(buf, format="JPEG")
        buf.seek(0)

        headers = {"Authorization": f"Bearer {self._key}"} if self._key else {}
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                self._url,
                files={"file": ("image.jpg", buf, "image/jpeg")},
                headers=headers,
            )
        resp.raise_for_status()
        data = resp.json()

        elapsed = int((time.perf_counter() - t0) * 1000)
        boxes   = [BBoxResult(**b) for b in data.get("bounding_boxes", [])]

        return PredictResult(
            label=data["label"],
            confidence=float(data["confidence"]),
            bounding_boxes=boxes,
            model_name=self.name,
            inference_ms=elapsed,
        )


# ─── Registry & factory ───────────────────────────────────────────────────────

_REGISTRY: dict[str, type[CivicBaseModel]] = {
    "mock":        MockModel,
    "local_torch": LocalTorchModel,
    "yolo":        YOLOModel,
    "api":         APIModel,
}


def register_model(name: str, cls: type[CivicBaseModel]) -> None:
    """Register a custom model class under a name for use in settings."""
    _REGISTRY[name] = cls


def load_model() -> CivicBaseModel:
    """
    Instantiate the correct model based on MODEL_BACKEND in settings.
    Called once at application startup.
    """
    backend = settings.model_backend.lower()

    if backend == "mock":
        return MockModel()
    if backend in ("local_torch", "local_tf"):
        if not settings.model_path:
            raise ValueError("MODEL_PATH must be set for local model backends.")
        if not Path(settings.model_path).exists():
            raise ValueError(
                f"MODEL_PATH does not exist: {settings.model_path}. "
                "Use a path available on the deployed server."
            )
        return LocalTorchModel(settings.model_path)
    if backend == "yolo":
        if not settings.model_path:
            raise ValueError("MODEL_PATH must be set for YOLO backend.")
        if not Path(settings.model_path).exists():
            raise ValueError(
                f"MODEL_PATH does not exist: {settings.model_path}. "
                "For Railway, commit the .pt file into the repo or download it at startup."
            )
        try:
            return YOLOModel(settings.model_path)
        except Exception as exc:
            logger.error(
                f"Failed to load YOLO model ({type(exc).__name__}): {exc}. "
                "This could be due to missing system libraries, PyTorch security restrictions, "
                "or corrupted model file. Falling back to MockModel. "
                "Backend will still be accessible but inference will be disabled.",
                exc_info=True
            )
            logger.warning(
                "To fix: (1) Ensure Docker is used in deployment, (2) Model file is valid, "
                "(3) Try converting .pt file with torch.serialization settings."
            )
            return MockModel()
    if backend == "api":
        if not settings.model_api_url:
            raise ValueError("MODEL_API_URL must be set for API backend.")
        return APIModel(settings.model_api_url, settings.model_api_key)

    custom_cls = _REGISTRY.get(backend)
    if custom_cls:
        try:
            return custom_cls()
        except TypeError as exc:
            raise ValueError(
                f"Custom backend '{backend}' requires constructor arguments. "
                "Use a no-arg constructor or handle instantiation in load_model()."
            ) from exc

    raise ValueError(
        f"Unknown MODEL_BACKEND '{backend}'. "
        f"Valid options: {list(_REGISTRY.keys())}"
    )
