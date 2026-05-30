from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # OpenRouter AI (OpenAI-compatible)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "deepseek/deepseek-chat-v3-0324"
    OPENROUTER_MAX_TOKENS: int = 300
    AI_CALL_COOLDOWN_SECONDS: int = 10

    # AI Budgets & Security
    AI_USER_DAILY_TOKEN_BUDGET: int = 100000
    AI_USER_HOURLY_CALL_LIMIT: int = 50
    AI_GLOBAL_DAILY_TOKEN_BUDGET: int = 2000000
    AI_HTTP_REFERER: str = "https://cybersim.local"
    AI_X_TITLE: str = "CyberSim AI Tutor"

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

settings = Settings()

_INSECURE_SECRET = "change-me-in-production"
if settings.ENVIRONMENT == "production" and settings.JWT_SECRET == _INSECURE_SECRET:
    raise RuntimeError(
        "JWT_SECRET must be changed from the default before running in production. "
        "Generate one with: openssl rand -hex 32"
    )

if settings.ENVIRONMENT != "test" and not settings.OPENROUTER_API_KEY:
    import logging
    logging.getLogger(__name__).warning(
        "OPENROUTER_API_KEY is not set. AI features will use static fallback hints."
    )
