"""
Saraswati Backend — Application Settings
Loads configuration from environment variables via Pydantic Settings.
Per docs/18-ENVIRONMENT-VARIABLES.md
"""
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    app_base_url: str = "http://localhost:3000"
    log_level: str = "info"

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = ""

    # ── Supabase ─────────────────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # ── Razorpay ─────────────────────────────────────────────────────────────
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    # ── Firebase ─────────────────────────────────────────────────────────────
    firebase_service_account_json: str = ""

    # ── Email ─────────────────────────────────────────────────────────────────
    resend_api_key: str = ""

    # ── Maps ──────────────────────────────────────────────────────────────────
    google_maps_server_api_key: str = ""

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_allowed_origins: str = "http://localhost:3000"

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    rate_limit_default: int = 60

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — call this everywhere instead of Settings()."""
    return Settings()
