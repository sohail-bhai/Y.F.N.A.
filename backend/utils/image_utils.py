"""
utils/image_utils.py – PIL image preprocessing helpers.
"""
from pathlib import Path
from PIL import Image, ExifTags


def load_and_normalise(path: str | Path, max_dim: int = 1280) -> Image.Image:
    """
    Open an image, apply EXIF rotation, and resize if larger than max_dim.
    Returns a PIL Image in RGB mode.
    """
    img = Image.open(path)

    # Auto-rotate based on EXIF orientation
    try:
        exif = img._getexif()
        if exif:
            orientation_key = next(
                (k for k, v in ExifTags.TAGS.items() if v == "Orientation"), None
            )
            if orientation_key and orientation_key in exif:
                orientation = exif[orientation_key]
                rotations = {3: 180, 6: 270, 8: 90}
                if orientation in rotations:
                    img = img.rotate(rotations[orientation], expand=True)
    except Exception:
        pass

    img = img.convert("RGB")

    # Downscale if needed (keeps aspect ratio)
    w, h = img.size
    if max(w, h) > max_dim:
        ratio = max_dim / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    return img


def image_to_base64(path: str | Path) -> str:
    """Return base64-encoded JPEG string for a given image path."""
    import base64
    import io

    img = load_and_normalise(path)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")
