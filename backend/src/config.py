from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Auth
    JWT_SECRET: str = "change-me-in-production"
    JWT_EXPIRY_HOURS: int = 8
    # HS256 (symmetric) is correct for this single-backend monolith. Switch to
    # RS256 (asymmetric: private key signs, services verify with the public key)
    # only if the backend is ever split into multiple services.
    JWT_ALGORITHM: str = "HS256"
    # Password policy enforced on registration (see auth.routes.UserCreate).
    PASSWORD_MIN_LENGTH: int = 8
    # Rate-limit posture when the Redis limiter backend is unavailable:
    #   False (default) -> fail-OPEN: keep serving so a transient cache blip can't
    #                      lock users out (right for a live classroom/demo).
    #   True            -> fail-CLOSED: reject the request (hardened production).
    RATE_LIMIT_FAIL_CLOSED: bool = False
    # Default instructor account seeded on first boot. Override in any shared
    # deployment; the default password is rejected in production (see below).
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "ParallaxAdmin!"

    # Database
    POSTGRES_URL: str = "postgresql+asyncpg://parallax:parallax@postgres:5432/parallax"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # OpenRouter AI (OpenAI-compatible)
    OPENROUTER_API_KEY: str = ""
    # Smarter model choices (set in .env to override). Verified OpenRouter IDs Jun 2026:
    #   anthropic/claude-sonnet-4.6  â€” best Socratic quality + guardrails, fast
    #   anthropic/claude-opus-4-8    â€” max reasoning, slower/pricier
    #   anthropic/claude-haiku-4.5   â€” cheap, solid instruction-following
    #   google/gemini-2.0-flash-001  â€” fast/cheap fallback, weaker guardrails (default)
    OPENROUTER_MODEL: str = "google/gemini-2.0-flash-001"
    OPENROUTER_MAX_TOKENS: int = 500
    AI_CALL_COOLDOWN_SECONDS: int = 10

    # AI Budgets & Security
    AI_USER_DAILY_TOKEN_BUDGET: int = 100000
    AI_USER_HOURLY_CALL_LIMIT: int = 50
    AI_GLOBAL_DAILY_TOKEN_BUDGET: int = 2000000
    AI_HTTP_REFERER: str = "https://parallax.local"
    AI_X_TITLE: str = "Parallax AI Tutor"

    # Docker / Sandbox
    DOCKER_SOCKET: str = "/var/run/docker.sock"
    SCENARIO_NETWORK_PREFIX: str = "172.20"
    KALI_IMAGE: str = "parallax-kali:latest"
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

_INSECURE_ADMIN_PASSWORD = "ParallaxAdmin!"
if settings.ENVIRONMENT == "production" and settings.ADMIN_PASSWORD == _INSECURE_ADMIN_PASSWORD:
    raise RuntimeError(
        "ADMIN_PASSWORD must be changed from the default before running in production. "
        "Set ADMIN_PASSWORD in the environment."
    )
elif settings.ENVIRONMENT != "test" and settings.ADMIN_PASSWORD == _INSECURE_ADMIN_PASSWORD:
    import logging

    logging.getLogger(__name__).warning(
        "Default admin password in use (admin / ParallaxAdmin!). "
        "Set ADMIN_PASSWORD for any shared deployment."
    )

if settings.ENVIRONMENT != "test" and not settings.OPENROUTER_API_KEY:
    import logging

    logging.getLogger(__name__).warning(
        "OPENROUTER_API_KEY is not set. AI features will use static fallback hints."
    )
