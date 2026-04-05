import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, JSON, Float
from src.config import settings

engine = create_async_engine(settings.POSTGRES_URL, echo=settings.ENVIRONMENT == "development")
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="student")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    sessions: Mapped[list["Session"]] = relationship(back_populates="user")


class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    scenario_id: Mapped[str] = mapped_column(String(10), nullable=False)
    role: Mapped[str] = mapped_column(String(10), nullable=False)
    methodology: Mapped[str] = mapped_column(String(50), default="ptes")
    phase: Mapped[int] = mapped_column(Integer, default=1)
    score: Mapped[int] = mapped_column(Integer, default=100)
    hints_used: Mapped[list] = mapped_column(JSON, default=list)
    roe_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    container_id: Mapped[str | None] = mapped_column(String, nullable=True)
    network_name: Mapped[str | None] = mapped_column(String, nullable=True)
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
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    session: Mapped["Session"] = relationship(back_populates="siem_events")


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
