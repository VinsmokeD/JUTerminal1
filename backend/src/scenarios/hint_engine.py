import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.auth.routes import get_current_user
from src.db.database import get_db, Session, User
from src.ai.monitor import get_ai_hint
from src.cache.redis import cache_get

router = APIRouter()

HINTS_DIR = Path(__file__).parent / "hints"


def _load_hints(scenario_id: str) -> dict:
    path = HINTS_DIR / f"{scenario_id.lower().replace('-', '')}_hints.json"
    if path.exists():
        return json.loads(path.read_text())
    return {}


class HintRequest(BaseModel):
    session_id: str
    level: int  # 1 | 2 | 3


@router.post("/request")
async def request_hint(
    body: HintRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Session).where(Session.id == body.session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if body.level not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Hint level must be 1, 2, or 3")

    # Penalty map
    penalties = {1: 5, 2: 10, 3: 20}
    penalty = penalties[body.level]

    # Try static hint tree first
    hints = _load_hints(session.scenario_id)
    sc_hints = hints.get(session.scenario_id, {})
    role_hints = sc_hints.get(session.role, {})
    phase_hints = role_hints.get(str(session.phase), {})
    static_hint = phase_hints.get(f"L{body.level}")

    # Fall back to AI hint
    state = {
        "scenario_id": session.scenario_id,
        "role": session.role,
        "phase": session.phase,
        "methodology": session.methodology,
    }
    ai_hint = await get_ai_hint(session.id, state, None, body.level)

    # Static hints can be arrays (step-by-step) or strings
    if isinstance(static_hint, list):
        hint_text = "\n".join(static_hint)
        hint_steps = static_hint
    elif static_hint:
        hint_text = static_hint
        hint_steps = [static_hint]
    elif ai_hint:
        hint_text = ai_hint
        hint_steps = [ai_hint]
    else:
        hint_text = "No hint available for this phase."
        hint_steps = [hint_text]

    # Apply score penalty and record usage
    session.score = max(0, session.score - penalty)
    hints_used = list(session.hints_used or [])
    hints_used.append({"level": body.level, "phase": session.phase})
    session.hints_used = hints_used
    await db.commit()

    return {
        "hint": hint_text,
        "steps": hint_steps,
        "level": body.level,
        "penalty": penalty,
        "score": session.score,
    }
