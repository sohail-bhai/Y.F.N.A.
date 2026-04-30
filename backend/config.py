"""
config.py – Application settings loaded from environment / .env file.
"""
import json
from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///civicai.db"

    # SMTP
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "CivicAI Reporter <noreply@civicai.local>"
    complaint_recipient: str = "civic@municipality.gov.in"

    # App
    app_secret: str = "dev-secret-change-me"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    upload_dir: str = "uploads"
    max_upload_mb: int = 20
    confidence_threshold: float = 0.60

    # AI Model backend selector
    model_backend: str = "mock"          # mock | local_torch | local_tf | yolo | api
    model_path: str = ""                 # filesystem path to model file
    model_api_url: str = ""              # external inference API URL
    model_api_key: str = ""              # optional API key

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return []
            if value.startswith("["):
                return json.loads(value)
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=("settings_",),
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
