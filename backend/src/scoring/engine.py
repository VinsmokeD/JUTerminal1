"""Scoring engine — computes final score adjustments and time bonuses."""
from datetime import datetime, timezone

from src.config import settings


def compute_time_bonus(started_at: datetime, completed_at: datetime | None) -> int:
    """Return a time bonus if session completed within threshold."""
    if not completed_at:
        return 0
    elapsed_minutes = (completed_at - started_at).total_seconds() / 60
    if elapsed_minutes <= settings.TIME_BONUS_THRESHOLD_MINUTES:
        # Linear bonus: up to +20 for finishing in half the threshold
        ratio = max(0.0, 1.0 - elapsed_minutes / settings.TIME_BONUS_THRESHOLD_MINUTES)
        return int(ratio * 20)
    return 0


def compute_hint_penalty(hints_used: list[dict]) -> int:
    """Sum all hint penalties from the hints_used list."""
    penalty_map = {1: settings.HINT_L1_PENALTY, 2: settings.HINT_L2_PENALTY, 3: settings.HINT_L3_PENALTY}
    return sum(penalty_map.get(h.get("level", 1), 5) for h in hints_used)


def final_score(base: int, hints_used: list[dict], started_at: datetime, completed_at: datetime | None) -> int:
    bonus = compute_time_bonus(started_at, completed_at)
    total = base + bonus
    return max(0, min(100, total))
