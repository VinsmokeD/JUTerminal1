"""Scoring engine — computes final score adjustments and time bonuses."""

from datetime import datetime

from src.config import settings


def compute_time_bonus(started_at: datetime, completed_at: datetime | None) -> int:
    """Return a time bonus if session completed within threshold."""
    if not completed_at:
        return 0
    elapsed_minutes = (completed_at - started_at).total_seconds() / 60
    if elapsed_minutes <= settings.TIME_BONUS_THRESHOLD_MINUTES:
        # Linear bonus: +20 for instant completion, scaling down to +0 at the
        # threshold (e.g. +10 at half the threshold).
        ratio = max(0.0, 1.0 - elapsed_minutes / settings.TIME_BONUS_THRESHOLD_MINUTES)
        return int(ratio * 20)
    return 0


def compute_hint_penalty(hints_used: list) -> int:
    """Sum all hint penalties from the hints_used list."""
    penalty_map = {
        1: settings.HINT_L1_PENALTY,
        2: settings.HINT_L2_PENALTY,
        3: settings.HINT_L3_PENALTY,
    }
    penalty = 0
    for h in hints_used:
        if isinstance(h, dict):
            penalty += penalty_map.get(h.get("level", 1), 5)
        else:
            # If it's a string or other format, default to L1 penalty
            penalty += 5
    return penalty


def final_score(
    base: int, hints_used: list, started_at: datetime, completed_at: datetime | None
) -> int:
    """Final score = the running score (`base`) plus a completion-time bonus,
    clamped to [0, 100].

    IMPORTANT: `base` is `session.score`, which ALREADY has every penalty
    applied live during the session — hint penalties (ws/routes._send_hint and
    scenarios/hint_engine) and gate/scope penalties. `hints_used` is accepted
    for signature stability but is intentionally NOT re-penalised here: doing so
    double-counted penalties already deducted from `base`.
    """
    bonus = compute_time_bonus(started_at, completed_at)
    return max(0, min(100, base + bonus))
