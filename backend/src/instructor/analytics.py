"""
Phase 25 — Instructor Learning Analytics helper logic.
Provides class-level statistics, struggle detection, SVG score distribution, and CSV export.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.database import Session, User, CommandLog, SiemEvent, SiemTriage, Note, AIInteraction

# Struggle weights
# StruggleScore = min(100, 0.4 * ReconParalysisTime + 0.3 * CommandLoopsCount + 0.3 * HintDeduction)
RECON_WEIGHT = 0.4
LOOP_WEIGHT = 0.3
HINT_WEIGHT = 0.3

async def get_instructor_analytics(db: AsyncSession) -> dict:
    """
    Fetch class-level learning signals, common mistakes, struggle flags, and KDE score distribution.
    """
    # 1. Load all sessions
    sessions_result = await db.execute(
        select(Session, User.username, User.role)
        .join(User, Session.user_id == User.id)
    )
    rows = sessions_result.all()
    
    # Filter to student sessions only
    student_sessions = [r for r in rows if r[2] == "student"]
    
    total_sessions_count = len(student_sessions)
    if total_sessions_count == 0:
        # Return empty defaults
        return {
            "total_student_sessions": 0,
            "averages": {
                "score": 0.0,
                "hints_l1": 0.0,
                "hints_l2": 0.0,
                "hints_l3": 0.0,
                "duration_minutes": 0.0,
            },
            "by_scenario": {},
            "methodology_gaps": [],
            "blind_spots": [],
            "struggle_flags": [],
            "struggle_rate": 0.0,
            "score_distribution": _get_default_kde_coords()
        }

    # 2. Basic averages
    scores = []
    durations = []
    l1_hints_total = 0
    l2_hints_total = 0
    l3_hints_total = 0
    
    # Per-scenario breakdown
    # {scenario_id: {"scores": [], "durations": [], "l1": 0, "l2": 0, "l3": 0, "completed": 0, "active": 0}}
    scenario_stats: dict[str, dict] = {}
    
    struggle_flags = []
    active_count = 0
    struggle_count = 0

    now = datetime.now(timezone.utc)

    for session, username, _ in student_sessions:
        scores.append(session.score)
        
        # Hints count breakdown
        hints = session.hints_used or []
        l1_cnt = sum(1 for h in hints if "L1" in str(h) or (isinstance(h, dict) and h.get("level") == 1))
        l2_cnt = sum(1 for h in hints if "L2" in str(h) or (isinstance(h, dict) and h.get("level") == 2))
        l3_cnt = sum(1 for h in hints if "L3" in str(h) or (isinstance(h, dict) and h.get("level") == 3))
        l1_hints_total += l1_cnt
        l2_hints_total += l2_cnt
        l3_hints_total += l3_cnt

        sc_id = session.scenario_id
        if sc_id not in scenario_stats:
            scenario_stats[sc_id] = {
                "scores": [],
                "durations": [],
                "hints_l1": 0,
                "hints_l2": 0,
                "hints_l3": 0,
                "completed": 0,
                "active": 0
            }
        
        scenario_stats[sc_id]["scores"].append(session.score)
        scenario_stats[sc_id]["hints_l1"] += l1_cnt
        scenario_stats[sc_id]["hints_l2"] += l2_cnt
        scenario_stats[sc_id]["hints_l3"] += l3_cnt

        is_completed = session.completed_at is not None
        if is_completed:
            duration = (session.completed_at - session.started_at).total_seconds() / 60.0
            durations.append(duration)
            scenario_stats[sc_id]["durations"].append(duration)
            scenario_stats[sc_id]["completed"] += 1
        else:
            active_count += 1
            scenario_stats[sc_id]["active"] += 1

        # Calculate struggle indicators for this session
        struggle_info = await calculate_session_struggle(db, session, now)
        if struggle_info["struggle_score"] > 40:
            struggle_count += 1
            
        if struggle_info["struggle_score"] > 0:
            struggle_flags.append({
                "session_id": session.id,
                "username": username,
                "scenario_id": session.scenario_id,
                "phase": session.phase,
                "score": session.score,
                "struggle_score": round(struggle_info["struggle_score"], 1),
                "reasons": struggle_info["reasons"]
            })

    # Sort struggle flags by score descending
    struggle_flags.sort(key=lambda x: x["struggle_score"], reverse=True)

    # 3. Methodology Gates Blocks (Rushing / Methodology Gaps)
    # Gating blocks are logged with tool prefix `gate_block:` in CommandLog
    gaps_result = await db.execute(
        select(CommandLog.tool, func.count(CommandLog.id))
        .where(CommandLog.tool.like("gate_block:%"))
        .group_by(CommandLog.tool)
        .order_by(func.count(CommandLog.id).desc())
        .limit(10)
    )
    methodology_gaps = [
        {"tool": tool.split(":")[-1], "blocks_triggered": count}
        for tool, count in gaps_result.all() if tool
    ]

    # 4. Blind Spots Analysis
    # Let's check common events triggered but not documented
    # Map MITRE / Event types to keywords
    # Query all events and notes for student sessions
    blind_spots = await analyze_cohort_blind_spots(db, [s.id for s, _, _ in student_sessions])

    # 5. Scenario summary statistics
    by_scenario = {}
    for sc_id, sdata in scenario_stats.items():
        sc_scores = sdata["scores"]
        sc_durations = sdata["durations"]
        sc_count = len(sc_scores)
        by_scenario[sc_id] = {
            "session_count": sc_count,
            "active_count": sdata["active"],
            "completed_count": sdata["completed"],
            "avg_score": round(sum(sc_scores) / sc_count, 1) if sc_count > 0 else 0.0,
            "min_score": min(sc_scores) if sc_count > 0 else 0,
            "max_score": max(sc_scores) if sc_count > 0 else 0,
            "avg_duration_minutes": round(sum(sc_durations) / len(sc_durations), 1) if sc_durations else 0.0,
            "avg_hints_l1": round(sdata["hints_l1"] / sc_count, 1) if sc_count > 0 else 0.0,
            "avg_hints_l2": round(sdata["hints_l2"] / sc_count, 1) if sc_count > 0 else 0.0,
            "avg_hints_l3": round(sdata["hints_l3"] / sc_count, 1) if sc_count > 0 else 0.0,
        }

    # 6. Overall averages
    total_scores_count = len(scores)
    averages = {
        "score": round(sum(scores) / total_scores_count, 1) if total_scores_count > 0 else 0.0,
        "hints_l1": round(l1_hints_total / total_sessions_count, 1),
        "hints_l2": round(l2_hints_total / total_sessions_count, 1),
        "hints_l3": round(l3_hints_total / total_sessions_count, 1),
        "duration_minutes": round(sum(durations) / len(durations), 1) if durations else 0.0,
    }

    # 7. Cohort struggle rate
    struggle_rate = round((struggle_count / total_sessions_count) * 100, 1) if total_sessions_count > 0 else 0.0

    # 8. Score distribution KDE coordinates
    score_distribution = generate_kde_svg_coords(scores)

    # 9. Hint density heat grid (6 phases x 3 hint levels)
    hint_grid = {str(p): {str(l): 0 for l in (1, 2, 3)} for p in range(1, 7)}
    for session, _, _ in student_sessions:
        hints = session.hints_used or []
        for h in hints:
            if isinstance(h, dict):
                lvl = h.get("level")
                ph = h.get("phase")
            else:
                lvl = 1
                if "L2" in str(h):
                    lvl = 2
                elif "L3" in str(h):
                    lvl = 3
                ph = 1
                for p in range(1, 7):
                    if f"Phase {p}" in str(h) or f"P{p}" in str(h):
                        ph = p
                        break
            if str(ph) in hint_grid and str(lvl) in hint_grid[str(ph)]:
                hint_grid[str(ph)][str(lvl)] += 1

    return {
        "total_student_sessions": total_sessions_count,
        "active_student_sessions": active_count,
        "averages": averages,
        "by_scenario": by_scenario,
        "methodology_gaps": methodology_gaps,
        "blind_spots": blind_spots,
        "struggle_flags": struggle_flags,
        "struggle_rate": struggle_rate,
        "score_distribution": score_distribution,
        "hint_grid": hint_grid,
    }


async def calculate_session_struggle(db: AsyncSession, session: Session, now: datetime) -> dict:
    """
    Evaluates struggle signals for a specific session.
    """
    reasons = []
    recon_paralysis_time = 0.0
    command_loops_count = 0
    hint_deduction = 100.0 - float(session.score or 100.0)
    
    # We query the commands for this session
    cmd_res = await db.execute(
        select(CommandLog)
        .where(CommandLog.session_id == session.id)
        .order_by(CommandLog.created_at.desc())
    )
    commands = cmd_res.scalars().all()
    
    # 1. Recon Paralysis
    # Spent more than 30 minutes in the enumeration phase (phase 1) with at least 10 commands run,
    # but 0 milestones reached and 0 findings noted.
    if session.completed_at is None and session.phase == 1:
        elapsed_minutes = (now - session.started_at).total_seconds() / 60.0
        phase_1_cmds = [c for c in commands if c.phase == 1]
        
        # Check notes
        notes_res = await db.execute(
            select(func.count(Note.id))
            .where(Note.session_id == session.id, Note.tag == "finding")
        )
        findings_count = notes_res.scalar() or 0
        
        if elapsed_minutes > 30.0 and len(phase_1_cmds) >= 10 and findings_count == 0:
            recon_paralysis_time = elapsed_minutes
            reasons.append(f"Recon Paralysis: spent {int(elapsed_minutes)}m in Recon with {len(phase_1_cmds)} commands but no findings noted.")

    # 2. Command Loops
    # Repeating the exact same command string or targeting the exact same parameter > 5 times in a 5-minute window without progress.
    # Let's inspect commands and search for loops.
    recent_cmds = commands[:15] # look at last 15 commands
    cmd_counts: dict[str, list[datetime]] = {}
    for c in recent_cmds:
        cmd_str = c.command.strip()
        if cmd_str not in cmd_counts:
            cmd_counts[cmd_str] = []
        cmd_counts[cmd_str].append(c.created_at)

    max_repeats = 0
    for cmd_str, times in cmd_counts.items():
        if len(times) > 5:
            # Check window of 5 minutes (300s) between first and last of any 6 duplicate calls
            times.sort()
            for i in range(len(times) - 5):
                diff = (times[i+5] - times[i]).total_seconds()
                if diff <= 300:
                    repeats = len(times)
                    if repeats > max_repeats:
                        max_repeats = repeats
                    
    if max_repeats > 5:
        command_loops_count = max_repeats
        reasons.append(f"Command Loops: repeated same command string {max_repeats} times in a 5-minute window.")

    # 3. Hint Dependency
    # Requesting L3 hints within 60 seconds of a command block or using hints for > 70% of the milestone steps in the active scenario.
    hints = session.hints_used or []
    l3_hints = [h for h in hints if "L3" in str(h) or (isinstance(h, dict) and h.get("level") == 3)]
    if len(l3_hints) > 0:
        # Check if an L3 hint was requested within 60s of a gate block command
        # Query gate blocks
        blocks = [c for c in commands if c.tool and c.tool.startswith("gate_block:")]
        
        # Query AIInteraction table for actual hint requests
        ai_res = await db.execute(
            select(AIInteraction)
            .where(AIInteraction.session_id == session.id, AIInteraction.kind == "hint", AIInteraction.hint_level == 3)
        )
        hint_requests = ai_res.scalars().all()
        
        timed_dependency = False
        for hr in hint_requests:
            for blk in blocks:
                time_diff = abs((hr.created_at - blk.created_at).total_seconds())
                if time_diff <= 60.0:
                    timed_dependency = True
                    break
            if timed_dependency:
                break
        
        if timed_dependency:
            reasons.append("Hint Dependency: requested Level 3 hint immediately after a methodology gate block.")
            
    # Or hint count > 70% of milestones (phases). Scenario typically has 5-6 phases.
    # Total hints count > 4 for example
    if len(hints) >= 4:
        reasons.append(f"Hint Dependency: requested {len(hints)} hints across phases.")

    # 4. Defensive Blind Spot
    # Running offensive scans that trigger SIEM events, but leaving > 80% of these alerts unclassified (untriaged)
    # Query SIEM events (attacker-triggered)
    events_res = await db.execute(
        select(SiemEvent)
        .where(SiemEvent.session_id == session.id, SiemEvent.source == "attacker")
    )
    attacker_events = events_res.scalars().all()
    
    if len(attacker_events) >= 5:
        # Query triage classifications
        triage_res = await db.execute(
            select(SiemTriage)
            .where(SiemTriage.session_id == session.id, SiemTriage.classification.is_not(None))
        )
        triaged = triage_res.scalars().all()
        triaged_event_ids = {t.event_id for t in triaged}
        
        untriaged_count = sum(1 for e in attacker_events if e.id not in triaged_event_ids)
        untriaged_ratio = untriaged_count / len(attacker_events) if len(attacker_events) > 0 else 0
        if untriaged_ratio > 0.8:
            reasons.append(f"Defensive Blind Spot: triggered {len(attacker_events)} alerts but left {round(untriaged_ratio*100)}% untriaged.")

    # Calculate Struggle Score
    # StruggleScore = min(100, 0.4 * ReconParalysisTime + 0.3 * CommandLoopsCount + 0.3 * HintDeduction)
    recon_term = 0.4 * min(120.0, recon_paralysis_time) # cap recon paralysis influence
    loop_term = 0.3 * (command_loops_count * 10) # 10 points per repeat above 5
    hint_term = 0.3 * hint_deduction
    
    struggle_score = min(100.0, recon_term + loop_term + hint_term)

    return {
        "struggle_score": struggle_score,
        "reasons": reasons
    }


async def analyze_cohort_blind_spots(db: AsyncSession, session_ids: list[str]) -> list[dict]:
    """
    Compares triggered attacker-severity events to note contents for blind spot correlation.
    """
    if not session_ids:
        return []

    # Let's map semantic alerts to note keywords
    # Key: alert signature keyword -> (Note keyword matches, Blind Spot title, Category)
    blind_spot_rules = [
        {
            "match": "SQL injection|sqlmap|WAF Rule 942100",
            "keywords": ["sql", "sqli", "injection", "database", "mariadb"],
            "title": "SQL Injection Exposure",
            "category": "Offensive Visibility"
        },
        {
            "match": "Path traversal|traversal|etc/passwd",
            "keywords": ["lfi", "traversal", "file", "passwd", "apache"],
            "title": "Local File Inclusion (LFI)",
            "category": "Offensive Visibility"
        },
        {
            "match": "webshell|file written|potential webshell",
            "keywords": ["shell", "webshell", "upload", "rce", "payload"],
            "title": "Web Shell Execution",
            "category": "Offensive Visibility"
        },
        {
            "match": "directory brute-force|High-frequency 404s|gobuster|dirb",
            "keywords": ["gobuster", "dirb", "fuzz", "scan", "directory"],
            "title": "Active Scan Footprinting",
            "category": "Offensive Visibility"
        },
        {
            "match": "Kerberoast|Event 4769|TGS request",
            "keywords": ["kerberoast", "tgs", "spn", "active directory", "ad"],
            "title": "Active Directory Kerberoasting",
            "category": "Offensive Visibility"
        },
        {
            "match": "DCSync|secretsdump|Event 4728",
            "keywords": ["dcsync", "secretsdump", "dump", "domain admin"],
            "title": "Active Directory DCSync Dumps",
            "category": "Offensive Visibility"
        }
    ]

    spot_counts = {r["title"]: {"triggered": 0, "documented": 0, "category": r["category"]} for r in blind_spot_rules}

    # Fetch notes and SIEM events for all session IDs
    for sid in session_ids:
        notes_res = await db.execute(select(Note).where(Note.session_id == sid))
        notes = notes_res.scalars().all()
        notes_text = " ".join([n.content.lower() for n in notes])

        events_res = await db.execute(
            select(SiemEvent)
            .where(SiemEvent.session_id == sid, SiemEvent.source == "attacker")
        )
        events = events_res.scalars().all()
        events_text = " ".join([e.message.lower() for e in events])

        for rule in blind_spot_rules:
            # Check if any event matches
            has_event = any(re_match(rule["match"], e.message) for e in events)
            if has_event:
                title = rule["title"]
                spot_counts[title]["triggered"] += 1
                # Check if documented
                has_doc = any(kw in notes_text for kw in rule["keywords"])
                if has_doc:
                    spot_counts[title]["documented"] += 1

    blind_spots = []
    for title, counts in spot_counts.items():
        trig = counts["triggered"]
        doc = counts["documented"]
        if trig > 0:
            undocumented_percentage = round(((trig - doc) / trig) * 100)
            if undocumented_percentage > 30: # Flag as blind spot if >30% fail to document
                blind_spots.append({
                    "title": title,
                    "category": counts["category"],
                    "triggered_count": trig,
                    "documented_count": doc,
                    "undocumented_percentage": undocumented_percentage
                })

    blind_spots.sort(key=lambda x: x["undocumented_percentage"], reverse=True)
    return blind_spots


def re_match(pattern: str, text: str) -> bool:
    import re
    try:
        return bool(re.search(pattern, text, re.IGNORECASE))
    except Exception:
        return False


def generate_kde_svg_coords(scores: list[int]) -> list[dict[str, float]]:
    """
    Computes Kernel Density Estimation (KDE) coordinates from cohort scores using a Gaussian kernel.
    Returns 50 path coordinates (x, y) scaled for a box: X in [0, 500], Y in [0, 100].
    """
    if len(scores) < 2:
        # Return a flat normal curve centered around the average score, or 80.
        center = scores[0] if scores else 80.0
        return _get_default_kde_coords(center)

    n = len(scores)
    # Bandwidth selection: Silverman's rule of thumb (stddev * (4/(3n))^(1/5))
    mean = sum(scores) / n
    variance = sum((s - mean) ** 2 for s in scores) / (n - 1)
    stddev = math.sqrt(variance) if variance > 0 else 5.0
    h = stddev * (4.0 / (3.0 * n)) ** 0.2
    if h <= 0:
        h = 5.0

    # We evaluate 50 points on x from 0 to 100 (representing score)
    x_points = [i * 2.0 for i in range(51)] # 0, 2, 4, ..., 100
    densities = []

    for x in x_points:
        # Gaussian kernel: sum( exp(-0.5 * ((x - score)/h)^2) / sqrt(2*pi) ) / (n * h)
        total = 0.0
        for s in scores:
            z = (x - s) / h
            total += math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi)
        densities.append(total / (n * h))

    # Scale coordinates
    # X scales from 0..100 score to 0..500 SVG width
    # Y scales from 0..max(density) to 100..0 SVG height (where SVG 0 is top, so 100 is bottom)
    max_d = max(densities) if densities else 1.0
    if max_d <= 0:
        max_d = 1.0

    coords = []
    for x, d in zip(x_points, densities):
        svg_x = x * 5.0 # 0..100 -> 0..500
        # Invert Y so higher density is higher in the chart (closer to Y=10, leaving 10px margin at top)
        svg_y = 100.0 - (d / max_d * 90.0)
        coords.append({"x": round(svg_x, 1), "y": round(svg_y, 1)})

    return coords


def _get_default_kde_coords(center: float = 80.0) -> list[dict[str, float]]:
    """Generates a standard bell curve centered at the given score."""
    coords = []
    # Bell curve formula: exp(-0.5 * ((x-center)/15)^2)
    for i in range(51):
        x = i * 2.0
        z = (x - center) / 15.0
        y_val = math.exp(-0.5 * z * z)
        svg_x = x * 5.0
        svg_y = 100.0 - (y_val * 85.0) # Scale y to leaves some padding
        coords.append({"x": round(svg_x, 1), "y": round(svg_y, 1)})
    return coords
