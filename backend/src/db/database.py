import uuid
import sys
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, JSON, Float
from sqlalchemy.pool import NullPool
from src.config import settings

_running_under_pytest = any("pytest" in arg for arg in sys.argv)

_engine_options = {
    "echo": settings.ENVIRONMENT == "development",
    "pool_pre_ping": True,
    "pool_recycle": 3600,
}
if settings.ENVIRONMENT == "test" or _running_under_pytest:
    _engine_options["poolclass"] = NullPool
else:
    _engine_options.update({"pool_size": 20, "max_overflow": 5})

engine = create_async_engine(settings.POSTGRES_URL, **_engine_options)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="student")
    skill_level: Mapped[str] = mapped_column(String(20), default="beginner")  # beginner | intermediate | experienced
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    sessions: Mapped[list["Session"]] = relationship(back_populates="user")


class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    scenario_id: Mapped[str] = mapped_column(String(10), nullable=False)
    role: Mapped[str] = mapped_column(String(10), nullable=False)
    methodology: Mapped[str] = mapped_column(String(50), default="ptes")
    ai_mode: Mapped[str] = mapped_column(String(20), default="learn")  # learn | challenge
    phase: Mapped[int] = mapped_column(Integer, default=1)
    score: Mapped[int] = mapped_column(Integer, default=100)
    hints_used: Mapped[list] = mapped_column(JSON, default=list)
    roe_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    container_id: Mapped[str | None] = mapped_column(String, nullable=True)
    network_name: Mapped[str | None] = mapped_column(String, nullable=True)
    session_metadata: Mapped[dict | None] = mapped_column("metadata", JSON, default=dict, nullable=True)
    user: Mapped["User"] = relationship(back_populates="sessions")
    notes: Mapped[list["Note"]] = relationship(back_populates="session")
    commands: Mapped[list["CommandLog"]] = relationship(back_populates="session")
    siem_events: Mapped[list["SiemEvent"]] = relationship(back_populates="session")


class Note(Base):
    __tablename__ = "notes"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"))
    tag: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    phase: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    session: Mapped["Session"] = relationship(back_populates="notes")


class CommandLog(Base):
    __tablename__ = "command_log"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"))
    command: Mapped[str] = mapped_column(String, nullable=False)
    tool: Mapped[str | None] = mapped_column(String(50), nullable=True)
    phase: Mapped[int] = mapped_column(Integer, default=1)
    triggered_siem_events: Mapped[list] = mapped_column(JSON, default=list)
    ai_hint_given: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    session: Mapped["Session"] = relationship(back_populates="commands")


class SiemEvent(Base):
    __tablename__ = "siem_events"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"))
    severity: Mapped[str] = mapped_column(String(10), nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    raw_log: Mapped[str | None] = mapped_column(String, nullable=True)
    mitre_technique: Mapped[str | None] = mapped_column(String(20), nullable=True)
    source_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="attacker")  # attacker | background | system
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    session: Mapped["Session"] = relationship(back_populates="siem_events")


class AutoEvidence(Base):
    __tablename__ = "auto_evidence"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"))
    command: Mapped[str] = mapped_column(String, nullable=False)
    output_summary: Mapped[str] = mapped_column(String, nullable=False)
    tool_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tag: Mapped[str] = mapped_column(String(20), default="evidence")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SiemTriage(Base):
    __tablename__ = "siem_triage"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"))
    event_id: Mapped[str] = mapped_column(String(100), nullable=False)
    classification: Mapped[str | None] = mapped_column(String(20), nullable=True)  # investigating | true_positive | false_positive | escalated
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AIInteraction(Base):
    __tablename__ = "ai_interactions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # unprompted | hint_request | learn
    hint_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    command_context: Mapped[str | None] = mapped_column(String, nullable=True)
    phase: Mapped[int] = mapped_column(Integer, default=1)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    response_text: Mapped[str | None] = mapped_column(String, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    was_fallback: Mapped[bool] = mapped_column(Boolean, default=False)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)


class UserActivity(Base):
    __tablename__ = "user_activity"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    session_id: Mapped[str | None] = mapped_column(String, ForeignKey("sessions.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ContainmentAction(Base):
    __tablename__ = "containment_actions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)  # block_ip | kill_pid | isolate_host
    target_value: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | success | failed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


async def init_db():
    # Development/test bootstrap only. Production must run Alembic migrations first
    # (`alembic upgrade head`) and then start the app, so create_all never races
    # migration-owned table creation.
    if settings.ENVIRONMENT not in {"development", "test"}:
        return
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
