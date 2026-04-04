from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Auth
    JWT_SECRET: str = "change-me-in-production"
    JWT_EXPIRY_HOURS: int = 8

    # Database
    POSTGRES_URL: str = "postgresql+asyncpg://cybersim:cybersim@postgres:5432/cybersim"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost"]

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash-latest"
    GEMINI_MAX_TOKENS: int = 150
    AI_CALL_COOLDOWN_SECONDS: int = 10

    # Docker / Sandbox
    DOCKER_SOCKET: str = "/var/run/docker.sock"
    SCENARIO_NETWORK_PREFIX: str = "172.20"
    KALI_IMAGE: str = "cybersim-kali:latest"
    MAX_CONCURRENT_SESSIONS: int = 10
    CONTAINER_CPU_LIMIT: float = 1.0
    CONTAINER_MEMORY_LIMIT: str = "512m"

    # Scoring
    HINT_L1_PENALTY: int = 5
    HINT_L2_PENALTY: int = 10
    HINT_L3_PENALTY: int = 20
    TIME_BONUS_THRESHOLD_MINUTES: int = 120

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
