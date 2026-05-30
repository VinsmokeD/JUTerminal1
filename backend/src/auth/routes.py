from datetime import datetime, timedelta, timezone
import hashlib

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.config import settings
from src.db.database import get_db, User, Session, CommandLog, Note, SiemEvent
from src.activity.service import record_activity

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
PASSWORD_HASH_PREFIX = "bcrypt_sha256$"
LEGACY_PASSWORD_HASH_PREFIXES = ("bcrypt-sha256$",)


class UserCreate(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str


def hash_password(password: str) -> str:
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest().encode("ascii")
    hashed = bcrypt.hashpw(digest, bcrypt.gensalt(rounds=12)).decode("ascii")
    return f"{PASSWORD_HASH_PREFIX}{hashed}"


def verify_password(plain: str, hashed: str) -> bool:
    stored_hash = hashed
    if hashed.startswith(PASSWORD_HASH_PREFIX):
        stored_hash = hashed.removeprefix(PASSWORD_HASH_PREFIX)
        password = hashlib.sha256(plain.encode("utf-8")).hexdigest().encode("ascii")
    elif any(hashed.startswith(prefix) for prefix in LEGACY_PASSWORD_HASH_PREFIXES):
        for prefix in LEGACY_PASSWORD_HASH_PREFIXES:
            if hashed.startswith(prefix):
                stored_hash = hashed.removeprefix(prefix)
                break
        password = hashlib.sha256(plain.encode("utf-8")).hexdigest().encode("ascii")
    else:
        password = plain.encode("utf-8")

    try:
        return bcrypt.checkpw(password, stored_hash.encode("ascii"))
    except ValueError:
        return False


def create_token(user_id: str, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)
    return jwt.encode(
        {"sub": user_id, "username": username, "exp": expire},
        settings.JWT_SECRET,
        algorithm="HS256",
    )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        user_id: str = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def enforce_rate_limit(key: str, limit: int, window: int):
    """Enforce a rate limit using Redis. key should uniquely identify the user/ip/session."""
    try:
        from src.cache.redis import _get as get_redis

        redis = get_redis()
        current = await redis.get(key)
        if current is not None and int(current) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )
        async with redis.pipeline(transaction=True) as pipe:
            await pipe.incr(key)
            await pipe.expire(key, window)
            await pipe.execute()
    except HTTPException:
        raise
    except Exception:
        # Fail-open if Redis encounters connection issues
        pass


@router.post("/register", response_model=Token)
async def register(body: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    await enforce_rate_limit(f"rate_limit:register:{ip}", limit=20, window=3600)

    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(username=body.username, password_hash=hash_password(body.password))
    db.add(user)
    await db.flush()
    await record_activity(db, user.id, "register", None, {"username": user.username})
    await db.commit()
    await db.refresh(user)
    return Token(
        access_token=create_token(user.id, user.username),
        token_type="bearer",
        username=user.username,
    )


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else "unknown"
    await enforce_rate_limit(f"rate_limit:login:{ip}", limit=30, window=300)

    result = await db.execute(select(User).where(User.username == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    await record_activity(db, user.id, "login", None, {"username": user.username})
    await db.commit()

    return Token(
        access_token=create_token(user.id, user.username),
        token_type="bearer",
        username=user.username,
    )


async def require_instructor(user: User = Depends(get_current_user)) -> User:
    if user.role != "instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Instructor access required"
        )
    return user


class ProfileUpdate(BaseModel):
    skill_level: str | None = None
    onboarding_completed: bool | None = None


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "skill_level": user.skill_level,
        "onboarding_completed": user.onboarding_completed,
    }


@router.put("/profile")
async def update_profile(
    body: ProfileUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    changes = {}
    if body.skill_level and body.skill_level in ("beginner", "intermediate", "experienced"):
        user.skill_level = body.skill_level
        changes["skill_level"] = body.skill_level
    if body.onboarding_completed is not None:
        user.onboarding_completed = body.onboarding_completed
        changes["onboarding_completed"] = body.onboarding_completed
    db.add(user)
    await record_activity(db, user.id, "profile_update", None, changes)
    await db.commit()
    await db.refresh(user)
    return {
        "id": user.id,
        "skill_level": user.skill_level,
        "onboarding_completed": user.onboarding_completed,
    }


@router.get("/stats")
async def get_user_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # 1. Basic counts
    sess_res = await db.execute(select(func.count(Session.id)).where(Session.user_id == user.id))
    total_missions = sess_res.scalar() or 0

    comp_res = await db.execute(
        select(func.count(Session.id)).where(
            Session.user_id == user.id, Session.completed_at != None
        )
    )
    completed_missions = comp_res.scalar() or 0

    # 2. Score analytics
    score_res = await db.execute(
        select(func.avg(Session.score)).where(
            Session.user_id == user.id, Session.completed_at != None
        )
    )
    avg_score = round(float(score_res.scalar() or 0.0), 1)

    # 3. Activity volume
    cmd_res = await db.execute(
        select(func.count(CommandLog.id)).join(Session).where(Session.user_id == user.id)
    )
    total_commands = cmd_res.scalar() or 0

    note_res = await db.execute(
        select(func.count(Note.id)).join(Session).where(Session.user_id == user.id)
    )
    total_notes = note_res.scalar() or 0

    # 4. Role distribution
    red_res = await db.execute(
        select(func.count(Session.id)).where(Session.user_id == user.id, Session.role == "red")
    )
    red_count = red_res.scalar() or 0

    blue_res = await db.execute(
        select(func.count(Session.id)).where(Session.user_id == user.id, Session.role == "blue")
    )
    blue_count = blue_res.scalar() or 0

    # 5. Recent History
    history_res = await db.execute(
        select(Session)
        .where(Session.user_id == user.id)
        .order_by(Session.started_at.desc())
        .limit(10)
    )
    history = [
        {
            "id": s.id,
            "scenario_id": s.scenario_id,
            "role": s.role,
            "score": s.score,
            "started_at": s.started_at.isoformat(),
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        }
        for s in history_res.scalars()
    ]

    return {
        "username": user.username,
        "skill_level": user.skill_level,
        "joined_at": user.created_at.isoformat(),
        "summary": {
            "total_missions": total_missions,
            "completed_missions": completed_missions,
            "avg_score": avg_score,
            "total_commands": total_commands,
            "total_notes": total_notes,
            "red_count": red_count,
            "blue_count": blue_count,
        },
        "history": history,
    }
