from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.config import settings
from src.db.database import get_db, User

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class UserCreate(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


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


@router.post("/register", response_model=Token)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(username=body.username, password_hash=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return Token(access_token=create_token(user.id, user.username), token_type="bearer", username=user.username)


@router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(access_token=create_token(user.id, user.username), token_type="bearer", username=user.username)


async def require_instructor(user: User = Depends(get_current_user)) -> User:
    if user.role != "instructor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructor access required")
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
async def update_profile(body: ProfileUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if body.skill_level and body.skill_level in ("beginner", "intermediate", "experienced"):
        user.skill_level = body.skill_level
    if body.onboarding_completed is not None:
        user.onboarding_completed = body.onboarding_completed
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "skill_level": user.skill_level, "onboarding_completed": user.onboarding_completed}
