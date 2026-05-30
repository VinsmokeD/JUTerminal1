"""Deterministic tests for the scoring engine (transparency + regression guard).

The session's running ``score`` already reflects every penalty applied live
during play (hint penalties, gate/scope penalties). ``final_score`` therefore
must only ADD a completion-time bonus — it must NOT re-subtract hint penalties,
which previously double-counted them.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.config import settings
from src.scoring.engine import compute_time_bonus, compute_hint_penalty, final_score

THRESHOLD = settings.TIME_BONUS_THRESHOLD_MINUTES
START = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


def _done(minutes: float) -> datetime:
    return START + timedelta(minutes=minutes)


# ── compute_time_bonus ───────────────────────────────────────────────────────


def test_no_completion_means_no_bonus():
    assert compute_time_bonus(START, None) == 0


def test_instant_completion_gives_max_bonus():
    assert compute_time_bonus(START, _done(0)) == 20


def test_half_threshold_gives_half_bonus():
    assert compute_time_bonus(START, _done(THRESHOLD / 2)) == 10


def test_at_threshold_gives_zero_bonus():
    assert compute_time_bonus(START, _done(THRESHOLD)) == 0


def test_over_threshold_gives_zero_bonus():
    assert compute_time_bonus(START, _done(THRESHOLD + 30)) == 0


# ── compute_hint_penalty ─────────────────────────────────────────────────────


def test_no_hints_no_penalty():
    assert compute_hint_penalty([]) == 0


def test_dict_hints_sum_per_level():
    hints = [{"level": 1}, {"level": 2}, {"level": 3}]
    expected = settings.HINT_L1_PENALTY + settings.HINT_L2_PENALTY + settings.HINT_L3_PENALTY
    assert compute_hint_penalty(hints) == expected


def test_string_hints_default_to_five_each():
    # ws/routes stores hints_used as strings like "L2_phase3"; these can't carry
    # a level, so the helper defaults each to 5.
    assert compute_hint_penalty(["L1_phase1", "L2_phase2", "L3_phase3"]) == 15


# ── final_score: regression guard against double-counting ────────────────────


def test_final_score_does_not_resubtract_hint_penalties():
    # base already includes the live hint penalties; with no completion bonus the
    # final score must equal base, NOT base minus another penalty.
    assert final_score(85, ["L1_phase1", "L1_phase2", "L1_phase3"], START, None) == 85
    assert final_score(40, [{"level": 3}, {"level": 3}, {"level": 3}], START, None) == 40


def test_final_score_adds_time_bonus_to_base():
    assert final_score(60, [], START, _done(THRESHOLD / 2)) == 70  # 60 + 10
    assert final_score(70, [], START, _done(0)) == 90  # 70 + 20


def test_final_score_clamps_to_0_100():
    assert final_score(100, [], START, _done(0)) == 100  # 100 + 20 clamped
    assert final_score(0, ["L3_phase3"], START, None) == 0
    assert final_score(-50, [], START, None) == 0
