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
    """Final score = the running score (`base`), clamped to [0, 100].

    `base` is `session.score`, which ALREADY has every score change applied live
    during the session — hint penalties (ws/routes._send_hint and
    scenarios/hint_engine), gate/scope penalties, and flag bonuses. So the
    headline score is just the clamped base.

    The completion-time bonus is deliberately NOT folded in here. It used to be
    added and then clamped to 100, which mathematically ERASED any deduction up
    to +20 on a fast run — so a student who lost points still saw a perfect
    100/100. The time/speed bonus is now surfaced separately (see
    ``compute_time_bonus`` and the report breakdown) so it can never mask
    penalties in the headline score.

    `hints_used`, `started_at`, `completed_at` are accepted for signature
    stability (callers and the report breakdown still pass them).
    """
    return max(0, min(100, base))
