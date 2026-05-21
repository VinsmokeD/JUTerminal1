from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from src.auth.routes import get_current_user
from src.db.database import User
from src.cache.redis import cache_get
from src.config import settings

router = APIRouter()

@router.get("/budget")
async def get_ai_budget(current_user: User = Depends(get_current_user)) -> dict:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    hour = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")
    
    global_daily_key = f"ai:budget:global:{today}:tokens"
    user_daily_key = f"ai:budget:user:{current_user.id}:{today}:tokens"
    user_hourly_key = f"ai:budget:user:{current_user.id}:{hour}:calls"
    
    global_tokens = int(await cache_get(global_daily_key) or 0)
    user_tokens = int(await cache_get(user_daily_key) or 0)
    user_calls = int(await cache_get(user_hourly_key) or 0)
    
    return {
        "user_daily_tokens": {
            "used": user_tokens,
            "limit": settings.AI_USER_DAILY_TOKEN_BUDGET,
            "remaining": max(0, settings.AI_USER_DAILY_TOKEN_BUDGET - user_tokens)
        },
        "user_hourly_calls": {
            "used": user_calls,
            "limit": settings.AI_USER_HOURLY_CALL_LIMIT,
            "remaining": max(0, settings.AI_USER_HOURLY_CALL_LIMIT - user_calls)
        },
        "global_daily_tokens": {
            "used": global_tokens,
            "limit": settings.AI_GLOBAL_DAILY_TOKEN_BUDGET,
            "remaining": max(0, settings.AI_GLOBAL_DAILY_TOKEN_BUDGET - global_tokens)
        }
    }
