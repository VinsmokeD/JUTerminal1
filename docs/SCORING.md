# Parallax â€” Scoring Rubric

Transparent, deterministic scoring. Every session starts at **100** and ends in **[0, 100]**.

## How the score moves

| Event | Effect | Where |
|---|---|---|
| **Session start** | base score = **100** | `sessions/routes.py` |
| **Hint requested** | âˆ’penalty **immediately** (live) | `ws/routes._send_hint`, `scenarios/hint_engine` |
| **Methodology gate violation** (wrong-phase tool) | âˆ’5 | `ws/routes` (PTES/engine gate) |
| **Out-of-scope target** (ROE violation) | âˆ’5 | `ws/routes` + `scope_enforcer` |
| **Fast completion** | + time bonus (0â€“20) | `scoring/engine.compute_time_bonus` |

### Hint penalties (per request, by skill level)
| Level | Beginner | Intermediate | Experienced |
|---|---|---|---|
| L1 (conceptual) | 2 | 5 | 10 |
| L2 (directional) | 5 | 10 | 20 |
| L3 (procedural) | 10 | 20 | 40 |

Configurable via `HINT_L{1,2,3}_PENALTY` (defaults 5/10/20).

### Time bonus
Linear: **+20** for (near-)instant completion, scaling down to **+0** at
`TIME_BONUS_THRESHOLD_MINUTES` (default 120). Example: finishing at half the
threshold â†’ **+10**. No bonus if the session is never completed.

## Final score
```
final_score = clamp_0_100( running_score + time_bonus )
```
`running_score` (= `session.score`) **already includes** every hint/gate/scope
penalty deducted live during play. The final calculation therefore **only adds
the time bonus** â€” it does not re-apply hint penalties.

> Historical note: a prior version re-subtracted hint penalties in
> `final_score`, double-counting them. Fixed 2026-05-29; guarded by
> `tests/test_scoring_engine.py::test_final_score_does_not_resubtract_hint_penalties`.

## Where it surfaces
- `GET /api/scoring/{session_id}` â€” `{base_score, final_score, hints_used, completed}`
- `GET /api/reports/{session_id}` â€” consolidated debrief includes the score block
- Live `score_update` WebSocket frames during play
