"""
Scenario YAML loader.
Reads SC-01, SC-02, SC-03 specs from docs/scenarios/ and provides a
typed interface consumed by the engine and routes.
"""
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

_SCENARIOS_DIR = Path(__file__).resolve().parents[4] / "docs" / "scenarios"

# Map scenario ID → YAML filename
_YAML_FILES: dict[str, str] = {
    "SC-01": "SC-01-webapp-pentest.yaml",
    "SC-02": "SC-02-ad-compromise.yaml",
    "SC-03": "SC-03-phishing.yaml",
}


@lru_cache(maxsize=8)
def load_scenario(scenario_id: str) -> dict[str, Any]:
    """Return parsed YAML for a scenario. Results are cached."""
    sid = scenario_id.upper()
    fname = _YAML_FILES.get(sid)
    if not fname:
        raise ValueError(f"Unknown scenario: {scenario_id!r}. Valid: {list(_YAML_FILES)}")

    path = _SCENARIOS_DIR / fname
    if not path.exists():
        raise FileNotFoundError(f"Scenario spec not found: {path}")

    with path.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh)

    if not data or data.get("id", "").upper() != sid:
        raise ValueError(f"Spec ID mismatch in {fname}: expected {sid}")

    return data


def list_scenarios() -> list[dict[str, Any]]:
    """Return lightweight metadata for all 3 scenarios (used by GET /api/scenarios)."""
    result = []
    for sid in _YAML_FILES:
        try:
            spec = load_scenario(sid)
            result.append({
                "id": spec["id"],
                "title": spec["title"],
                "description": spec.get("description", ""),
                "difficulty": spec.get("difficulty", "intermediate"),
                "duration_hours": round(spec.get("estimated_duration_minutes", 180) / 60, 1),
                "frameworks": spec.get("frameworks", []),
                "mitre_tactics": spec.get("tactics", []),
                "network": spec.get("network"),
                "phase_count": len(spec.get("phases", {})),
            })
        except Exception as exc:  # noqa: BLE001
            result.append({"id": sid, "error": str(exc)})
    return result


def get_phase(scenario_id: str, phase_num: int) -> dict[str, Any]:
    """Return phase definition dict, or empty dict if phase doesn't exist."""
    spec = load_scenario(scenario_id)
    phases = spec.get("phases", {})
    return phases.get(phase_num, phases.get(str(phase_num), {}))


def get_methodology_gate(scenario_id: str, tool: str) -> dict[str, Any] | None:
    """
    Return the gate rule for a tool, or None if the tool is ungated.
    Tool matching is case-insensitive prefix match on the command string.
    """
    spec = load_scenario(scenario_id)
    gates = spec.get("methodology_gates", {})
    tool_lower = tool.lower()
    for gate_key, rule in gates.items():
        if tool_lower.startswith(gate_key.lower()):
            return rule
    return None


def get_soc_events(scenario_id: str, command: str) -> list[dict[str, Any]]:
    """
    Match command string against soc_detection rules and return triggered event dicts.
    Caller fills in template variables ({source_ip}, {target_user}, etc.).
    """
    spec = load_scenario(scenario_id)
    detections = spec.get("soc_detection", [])
    triggered = []
    for rule in detections:
        pattern = rule.get("trigger_regex", "")
        try:
            if re.search(pattern, command, re.IGNORECASE):
                triggered.append(rule)
        except re.error:
            continue
    return triggered


def get_flags(scenario_id: str) -> list[dict[str, Any]]:
    spec = load_scenario(scenario_id)
    return spec.get("flags", [])


def get_scoring(scenario_id: str, role: str) -> dict[str, Any]:
    spec = load_scenario(scenario_id)
    return spec.get("scoring", {}).get(role, {"base": 100})


def invalidate_cache() -> None:
    """Force reload of all YAMLs (for testing / hot-reload in dev)."""
    load_scenario.cache_clear()
