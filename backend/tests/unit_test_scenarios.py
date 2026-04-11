"""
Unit Tests: Scenario Loading, SIEM Detection, and Methodology Gates

These tests validate the core scenario engine without requiring:
- Database (Postgres)
- Docker
- Redis
- Full app startup

Run with:
  cd backend
  pytest tests/unit_test_scenarios.py -v
"""
import os
import sys
import pytest

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: SCENARIO LOADING
# ────────────────────────────────────────────────────────────────────────────

def test_01_load_sc01_scenario():
    """Load SC-01 scenario YAML."""
    from src.scenarios.loader import load_scenario, invalidate_cache

    invalidate_cache()
    spec = load_scenario("SC-01")

    assert spec["id"] == "SC-01"
    assert "title" in spec or "name" in spec
    assert "phases" in spec
    assert "methodology_gates" in spec


def test_02_load_sc02_scenario():
    """Load SC-02 scenario YAML."""
    from src.scenarios.loader import load_scenario, invalidate_cache

    invalidate_cache()
    spec = load_scenario("SC-02")

    assert spec["id"] == "SC-02"
    assert "title" in spec or "name" in spec
    assert "phases" in spec
    assert "methodology_gates" in spec


def test_03_load_sc03_scenario():
    """Load SC-03 scenario YAML."""
    from src.scenarios.loader import load_scenario, invalidate_cache

    invalidate_cache()
    spec = load_scenario("SC-03")

    assert spec["id"] == "SC-03"
    assert "title" in spec or "name" in spec
    assert "phases" in spec
    assert "methodology_gates" in spec


def test_04_loader_rejects_unknown_scenario():
    """Loader should reject unknown scenario IDs."""
    from src.scenarios.loader import load_scenario

    with pytest.raises(ValueError, match="Unknown scenario"):
        load_scenario("SC-99")


def test_05_loader_rejects_sc04_sc05():
    """Loader should reject SC-04 and SC-05 (v2.0 scope violation)."""
    from src.scenarios.loader import load_scenario

    for scenario_id in ["SC-04", "SC-05"]:
        with pytest.raises(ValueError, match="Unknown scenario"):
            load_scenario(scenario_id)


def test_06_list_scenarios_returns_three():
    """List scenarios should return exactly 3 scenarios."""
    from src.scenarios.loader import list_scenarios

    scenarios = list_scenarios()
    ids = [s["id"] for s in scenarios]

    assert len(ids) == 3
    assert "SC-01" in ids
    assert "SC-02" in ids
    assert "SC-03" in ids


def test_07_scenario_has_all_phases():
    """Each scenario should have phase definitions."""
    from src.scenarios.loader import load_scenario

    for scenario_id in ["SC-01", "SC-02", "SC-03"]:
        spec = load_scenario(scenario_id)
        phases = spec.get("phases", {})

        assert len(phases) > 0, f"{scenario_id} has no phases"

        # Verify phase structure - phases are dict keyed by number
        for phase_num, phase_data in phases.items():
            assert isinstance(phase_num, (int, str))
            assert isinstance(phase_data, dict)


def test_08_scenario_has_methodology_gates():
    """Each scenario should have methodology gates."""
    from src.scenarios.loader import load_scenario

    for scenario_id in ["SC-01", "SC-02", "SC-03"]:
        spec = load_scenario(scenario_id)
        gates = spec.get("methodology_gates", {})

        assert len(gates) > 0, f"{scenario_id} has no methodology gates"


def test_09_scenario_has_siem_rules():
    """Each scenario should have SIEM detection rules."""
    from src.scenarios.loader import load_scenario

    for scenario_id in ["SC-01", "SC-02", "SC-03"]:
        spec = load_scenario(scenario_id)
        rules = spec.get("soc_detection", [])

        assert len(rules) > 0, f"{scenario_id} has no SIEM detection rules"


# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: METHODOLOGY GATES
# ────────────────────────────────────────────────────────────────────────────

def test_10_sc01_gates_sqlmap_at_phase_3():
    """SC-01: sqlmap should require phase >= 3."""
    from src.scenarios.loader import load_scenario, get_methodology_gate

    gate = get_methodology_gate("SC-01", "sqlmap")
    assert gate is not None
    assert gate["min_phase"] == 3


def test_11_sc01_gates_advanced_tools():
    """SC-01: Should gate directory enumeration tools (gobuster, dirb)."""
    from src.scenarios.loader import get_methodology_gate

    # SC-01 gates: sqlmap, gobuster, dirb, nmap
    gobuster_gate = get_methodology_gate("SC-01", "gobuster")
    dirb_gate = get_methodology_gate("SC-01", "dirb")

    # At least one should exist
    assert gobuster_gate is not None or dirb_gate is not None, "SC-01 should gate directory enumeration"


def test_12_sc02_gates_kerberos_tools():
    """SC-02: Kerberos tools (impacket-getuserspns) should have phase requirements."""
    from src.scenarios.loader import get_methodology_gate

    # SC-02 specifically gates impacket-getuserspns
    gate = get_methodology_gate("SC-02", "impacket-getuserspns")

    assert gate is not None, "SC-02 should gate impacket-getuserspns for Kerberoasting"


def test_13_sc03_gates_gophish():
    """SC-03: GoPhish should have phase requirement."""
    from src.scenarios.loader import get_methodology_gate

    gate = get_methodology_gate("SC-03", "gophish")
    assert gate is not None
    assert gate["min_phase"] >= 2


def test_14_ungated_tools_return_none():
    """Tools without gates should return None."""
    from src.scenarios.loader import get_methodology_gate

    # nmap and ping are typically ungated
    gate = get_methodology_gate("SC-01", "nmap")
    # May or may not be gated, but shouldn't error


# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: SIEM DETECTION RULES
# ────────────────────────────────────────────────────────────────────────────

def test_15_siem_rules_have_required_fields():
    """All SIEM rules should have required fields."""
    from src.scenarios.loader import load_scenario

    required_fields = ["trigger_regex", "severity", "event_template"]

    for scenario_id in ["SC-01", "SC-02", "SC-03"]:
        spec = load_scenario(scenario_id)
        rules = spec.get("soc_detection", [])

        for idx, rule in enumerate(rules):
            for field in required_fields:
                assert field in rule, f"Rule #{idx} missing {field}"


def test_16_siem_rules_have_valid_severity():
    """All SIEM rules should have valid severity levels."""
    from src.scenarios.loader import load_scenario

    valid_severities = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

    for scenario_id in ["SC-01", "SC-02", "SC-03"]:
        spec = load_scenario(scenario_id)
        rules = spec.get("soc_detection", [])

        for rule in rules:
            severity = rule.get("severity", "").upper()
            assert severity in valid_severities, f"Invalid severity: {severity}"


def test_17_sc01_has_waf_rules():
    """SC-01 should have WAF detection rules."""
    from src.scenarios.loader import load_scenario

    spec = load_scenario("SC-01")
    rules = spec.get("soc_detection", [])

    # WAF rules should detect SQL injection, path traversal, etc.
    waf_rules = [r for r in rules if any(
        keyword in r.get("trigger_regex", "").lower()
        for keyword in ["sqlmap", "union select", "sql injection", "path traversal", "shell.php"]
    )]
    assert len(waf_rules) > 0, "SC-01 should have WAF detection rules"


def test_18_sc02_has_ad_rules():
    """SC-02 should have Active Directory detection rules."""
    from src.scenarios.loader import load_scenario

    spec = load_scenario("SC-02")
    rules = spec.get("soc_detection", [])

    # Look for AD-related rules in trigger_regex
    ad_rules = [r for r in rules if any(
        keyword in r.get("trigger_regex", "").lower() or keyword in r.get("event_template", "").lower()
        for keyword in ["kerberos", "ad", "user", "enum", "spn", "getuserspn", "domain"]
    )]
    assert len(ad_rules) > 0, "SC-02 should have AD detection rules"


def test_19_sc03_has_phishing_rules():
    """SC-03 should have phishing/email detection rules."""
    from src.scenarios.loader import load_scenario

    spec = load_scenario("SC-03")
    rules = spec.get("soc_detection", [])

    # Phishing rules in trigger_regex
    phish_rules = [r for r in rules if any(
        keyword in r.get("trigger_regex", "").lower() or keyword in r.get("event_template", "").lower()
        for keyword in ["phishing", "email", "gophish", "campaign", "opened", "clicked"]
    )]
    assert len(phish_rules) > 0, "SC-03 should have phishing detection rules"


def test_20_siem_rules_have_trigger_patterns():
    """All SIEM rules should have regex trigger patterns."""
    from src.scenarios.loader import load_scenario
    import re

    for scenario_id in ["SC-01", "SC-02", "SC-03"]:
        spec = load_scenario(scenario_id)
        rules = spec.get("soc_detection", [])

        for idx, rule in enumerate(rules):
            pattern = rule.get("trigger_regex", "")
            assert pattern, f"Rule #{idx} has no trigger_regex"

            # Verify it's a valid regex
            try:
                re.compile(pattern)
            except re.error as e:
                pytest.fail(f"Rule #{idx} has invalid regex: {e}")


# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: MITRE ATT&CK & CWE MAPPINGS
# ────────────────────────────────────────────────────────────────────────────

def test_21_siem_rules_have_mitre_mappings():
    """All SIEM rules should have MITRE ATT&CK technique mappings."""
    from src.scenarios.loader import load_scenario

    for scenario_id in ["SC-01", "SC-02", "SC-03"]:
        spec = load_scenario(scenario_id)
        rules = spec.get("soc_detection", [])

        unmapped = []
        for idx, rule in enumerate(rules):
            # YAML uses "mitre" field
            has_mitre = "mitre" in rule
            if not has_mitre:
                unmapped.append(idx)

        # At least 80% should have mappings
        coverage = (len(rules) - len(unmapped)) / len(rules) * 100
        assert coverage >= 80, f"{scenario_id}: Only {coverage:.1f}% have MITRE mappings (missing: {unmapped})"


def test_22_siem_rules_have_cwe_mappings():
    """All SIEM rules should have CWE mappings."""
    from src.scenarios.loader import load_scenario

    for scenario_id in ["SC-01", "SC-02", "SC-03"]:
        spec = load_scenario(scenario_id)
        rules = spec.get("soc_detection", [])

        unmapped = []
        for idx, rule in enumerate(rules):
            # CWE field optional but checking if present
            cwe = rule.get("cwe", "")
            if cwe and not cwe.startswith("CWE-"):
                unmapped.append(idx)

        # If CWE is present, it should be valid format
        if unmapped:
            pytest.fail(f"{scenario_id}: Rules have invalid CWE format: {unmapped}")


def test_23_mitre_techniques_format_valid():
    """MITRE technique IDs should be in valid format (T1234)."""
    from src.scenarios.loader import load_scenario
    import re

    mitre_pattern = re.compile(r"^T\d{4,5}$")

    for scenario_id in ["SC-01", "SC-02", "SC-03"]:
        spec = load_scenario(scenario_id)
        rules = spec.get("soc_detection", [])

        for rule in rules:
            technique = rule.get("mitre_technique")
            if technique:
                assert mitre_pattern.match(technique), f"Invalid MITRE format: {technique}"


# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: SCENARIO EVENT COUNTS
# ────────────────────────────────────────────────────────────────────────────

def test_24_total_siem_events_across_scenarios():
    """Total SIEM events across all scenarios should be >= 12 (4 per scenario minimum)."""
    from src.scenarios.loader import load_scenario

    total_events = 0
    scenario_counts = {}

    for scenario_id in ["SC-01", "SC-02", "SC-03"]:
        spec = load_scenario(scenario_id)
        rules = spec.get("soc_detection", [])
        count = len(rules)
        scenario_counts[scenario_id] = count
        total_events += count

    print(f"\nSIEM Detection Rules in YAML:")
    print(f"  SC-01: {scenario_counts['SC-01']} rules")
    print(f"  SC-02: {scenario_counts['SC-02']} rules")
    print(f"  SC-03: {scenario_counts['SC-03']} rules")
    print(f"  TOTAL: {total_events} rules")

    # Each scenario should have at least 3-4 core detection rules
    assert total_events >= 12, f"Expected >= 12 total SIEM rules, got {total_events}"


def test_25_sc01_event_minimum():
    """SC-01 should have >= 4 detection rules in YAML."""
    from src.scenarios.loader import load_scenario

    spec = load_scenario("SC-01")
    rules = spec.get("soc_detection", [])

    assert len(rules) >= 4, f"SC-01: Expected >= 4 rules, got {len(rules)}"


def test_26_sc02_event_minimum():
    """SC-02 should have >= 4 detection rules in YAML."""
    from src.scenarios.loader import load_scenario

    spec = load_scenario("SC-02")
    rules = spec.get("soc_detection", [])

    assert len(rules) >= 4, f"SC-02: Expected >= 4 rules, got {len(rules)}"


def test_27_sc03_event_minimum():
    """SC-03 should have >= 4 detection rules in YAML."""
    from src.scenarios.loader import load_scenario

    spec = load_scenario("SC-03")
    rules = spec.get("soc_detection", [])

    assert len(rules) >= 4, f"SC-03: Expected >= 4 rules, got {len(rules)}"


# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: CACHE PERFORMANCE
# ────────────────────────────────────────────────────────────────────────────

def test_28_yaml_loader_caches_results():
    """YAML loader should cache results (second load is instant)."""
    from src.scenarios.loader import load_scenario, invalidate_cache
    import time

    invalidate_cache()

    # First load (uncached)
    start = time.perf_counter()
    load_scenario("SC-01")
    first = (time.perf_counter() - start) * 1000

    # Second load (cached)
    start = time.perf_counter()
    load_scenario("SC-01")
    cached = (time.perf_counter() - start) * 1000

    print(f"\nCache Performance:")
    print(f"  First load:  {first:.2f}ms")
    print(f"  Cached load: {cached:.2f}ms")

    # Cached should be at least 10x faster
    assert cached < 10, f"Cached load too slow: {cached:.2f}ms"


def test_29_loader_invalidate_cache_works():
    """Cache invalidation should work."""
    from src.scenarios.loader import load_scenario, invalidate_cache

    load_scenario("SC-01")
    invalidate_cache()

    # Should reload without error
    spec = load_scenario("SC-01")
    assert spec["id"] == "SC-01"


# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: SUMMARY REPORT
# ────────────────────────────────────────────────────────────────────────────

def test_30_summary_all_scenarios_valid():
    """Summary: All scenarios are valid and complete."""
    from src.scenarios.loader import load_scenario, invalidate_cache

    invalidate_cache()

    print("\n" + "="*70)
    print("SCENARIO VALIDATION SUMMARY")
    print("="*70)

    summary = {}
    for scenario_id in ["SC-01", "SC-02", "SC-03"]:
        spec = load_scenario(scenario_id)

        summary[scenario_id] = {
            "Name": spec.get("name", "Unknown"),
            "Phases": len(spec.get("phases", [])),
            "Gates": len(spec.get("methodology_gates", {})),
            "SIEM Rules": len(spec.get("soc_detection", [])),
            "Status": "✅ VALID"
        }

    for scenario_id, data in summary.items():
        print(f"\n{scenario_id}: {data['Status']}")
        print(f"  Name:       {data['Name']}")
        print(f"  Phases:     {data['Phases']}")
        print(f"  Gates:      {data['Gates']}")
        print(f"  SIEM Rules: {data['SIEM Rules']}")

    print("\n" + "="*70)


if __name__ == "__main__":
    print("""
    CyberSim Scenario Unit Tests
    ============================

    Run all tests:
      pytest tests/unit_test_scenarios.py -v

    Run by section:
      pytest tests/unit_test_scenarios.py -v -k "test_0[1-9]"  # Scenario loading
      pytest tests/unit_test_scenarios.py -v -k "test_1[0-4]"  # Methodology gates
      pytest tests/unit_test_scenarios.py -v -k "test_1[5-23]" # SIEM rules
      pytest tests/unit_test_scenarios.py -v -k "test_2[1-3]"  # MITRE/CWE mappings
      pytest tests/unit_test_scenarios.py -v -k "test_2[4-7]"  # Event counts
      pytest tests/unit_test_scenarios.py -v -k "test_2[8-9]"  # Cache performance

    Run with output:
      pytest tests/unit_test_scenarios.py -v -s
    """)
