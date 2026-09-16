"""Configuration for the RakshaSafe AI service.

Settings are read from environment variables or a local .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    service_name: str = "rakshasafe-ai-service"
    version: str = "0.1.0"
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "info"

    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()