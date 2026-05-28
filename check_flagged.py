
import asyncio
from sqlalchemy import select
from src.db.database import AsyncSessionLocal, AIInteraction
from src.ai.security import sanitize_tutor_response, validate_ai_output

async def run():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AIInteraction).order_by(AIInteraction.created_at.desc()).limit(1))
        row = res.scalar_one_or_none()
        if row:
            print(f"FLAGGED: {row.flagged}")
            print(f"TEXT: {row.response_text}")
            
            is_valid, safe_text = validate_ai_output(row.response_text)
            print(f"is_valid: {is_valid}")
            print(f"safe_text: {safe_text}")
            
            san = sanitize_tutor_response(row.response_text, "learn")
            print(f"was_flagged: {san.was_flagged}")
            print(f"violations: {san.violations}")
        else:
            print("No rows.")

if __name__ == "__main__":
    asyncio.run(run())
