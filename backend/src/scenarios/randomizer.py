"""
Phase 28 — Scenario Depth, Randomization & Dynamic Security.

Deterministic session-level randomization seeded from MD5(session_id).

Default CyberSim sessions now use the static YAML flag values because instructor
demos, docs, and the AI tutor all teach from the published scenario artifacts.
Randomization remains available only when the session start API explicitly asks
for it. This keeps viva/demo runs reproducible while preserving the production
variant machinery for later classroom cohorts.
"""

from __future__ import annotations

import hashlib
import io
import random
import re
import tarfile
import uuid
from typing import Any

import logging

from src.scenarios.loader import load_scenario

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Bypass IDs — never randomized
# ---------------------------------------------------------------------------
_BYPASS_EXACT: set[str] = {"demo"}
_BYPASS_PREFIX: str = "test"


def _is_bypass(session_id: str) -> bool:
    return session_id == "demo" or session_id.startswith(_BYPASS_PREFIX)


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------


def get_seed(session_id: str) -> int:
    """Return a deterministic 32-bit integer seed from MD5(session_id)."""
    digest = hashlib.md5(session_id.encode()).hexdigest()  # noqa: S324
    return int(digest[:8], 16)


def _rng(session_id: str) -> random.Random:
    return random.Random(get_seed(session_id))


# ---------------------------------------------------------------------------
# Per-scenario randomization specs
# ---------------------------------------------------------------------------

# SC-01 randomization pools
_SC01_FLAG_PATHS: list[str] = [
    "/var/www/html/.secret/flag.txt",
    "/var/www/html/uploads/.htaccess_flag",
    "/tmp/.novamed_flag",
    "/var/lib/mysql/novamed_flag",
]
_SC01_DB_USERS: list[str] = ["novamed_app", "nm_service", "webuser", "api_prod"]
_SC01_DB_PASSES: list[str] = ["P@ssw0rd!", "Nm@2024!", "S3rv1ce#!", "Pr0d!2025"]
_SC01_VULNS: list[str] = ["sqli", "lfi"]

# SC-02 randomization pools
_SC02_DC_HOSTS: list[str] = ["NEXORA-DC01", "NEXORA-DC02", "NEXORA-AD01"]
_SC02_GPP_DIRS: list[str] = [
    "{6AC1786C-016F-11D2-945F-00C04fB984F9}",
    "{31B2F340-016D-11D2-945F-00C04FB984F9}",
    "{827D319E-6EAC-11D2-A4EA-00C04F79F83A}",
]
_SC02_KERBEROASTABLE_SPNS: list[str] = [
    "svc_backup/NEXORA-DC01.nexora.local",
    "svc_sql/NEXORA-DC01.nexora.local",
    "svc_iis/NEXORA-DC01.nexora.local",
]

# SC-03 randomization pools
_SC03_SUBJECTS: list[str] = [
    "Urgent: IT Security Policy Update Required",
    "Action Required: Employee Benefits Review",
    "Important: System Maintenance Notification",
    "Quarterly Compliance Training — Mandatory",
]
_SC03_PRETEXTS: list[str] = [
    "HR Department — benefits enrollment window closing soon",
    "IT Helpdesk — password expiry in 24 hours",
    "Finance Department — payroll update required",
    "Compliance Team — mandatory policy acknowledgment",
]
_SC03_RELAY_ROUTES: list[str] = [
    "mail.orion-logistics.sim",
    "smtp.orion-internal.sim",
    "relay01.orion-logistics.sim",
]


def _primary_target_ip(scenario_id: str) -> str:
    spec = load_scenario(scenario_id)
    for key in ("targets", "containers"):
        for target in spec.get(key, []) or []:
            if isinstance(target, dict) and target.get("ip"):
                return str(target["ip"])

    network = spec.get("network", {})
    if isinstance(network, dict):
        for host in network.get("hosts", []) or []:
            if isinstance(host, dict) and host.get("ip"):
                return str(host["ip"])

    return ""


# ---------------------------------------------------------------------------
# Public: generate_randomized_session_metadata
# ---------------------------------------------------------------------------


def generate_randomized_session_metadata(
    session_id: str,
    scenario_id: str,
) -> dict[str, Any]:
    """
    Return a dict of randomized session parameters, or {} for bypass sessions.

    The returned dict is stored in ``Session.session_metadata`` and consumed by:
    - ``validate_flag`` (flag value / regex overrides)
    - ``daemon_noise`` (jitter seed)
    - frontend badges (difficulty variant, pretext)
    """
    if _is_bypass(session_id):
        return {}

    rng = _rng(session_id)
    scid = scenario_id.upper()

    if scid == "SC-01":
        flag_path = rng.choice(_SC01_FLAG_PATHS)
        db_user = rng.choice(_SC01_DB_USERS)
        db_pass = rng.choice(_SC01_DB_PASSES)
        primary_vuln = rng.choice(_SC01_VULNS)
        target_ip = _primary_target_ip(scid)
        flag_value = (
            f"FLAG{{NovaMed_{hashlib.md5(session_id.encode()).hexdigest()[:8]}}}"  # noqa: S324
        )
        return {
            "seed": get_seed(session_id),
            "scenario_variant": primary_vuln.upper(),
            "target_ip": target_ip,
            "db_user": db_user,
            "db_pass": db_pass,
            "flag_path": flag_path,
            "flags": {
                "FLAG-SC01-1": {
                    "value": flag_value,
                    "value_pattern": r"FLAG\{NovaMed_[0-9a-f]{8}\}",
                    "points": 50,
                },
            },
        }

    elif scid == "SC-02":
        dc_host = rng.choice(_SC02_DC_HOSTS)
        gpp_dir = rng.choice(_SC02_GPP_DIRS)
        spn = rng.choice(_SC02_KERBEROASTABLE_SPNS)
        target_ip = _primary_target_ip(scid)
        flag_value = (
            f"FLAG{{Nexora_{hashlib.md5(session_id.encode()).hexdigest()[:8]}}}"  # noqa: S324
        )
        return {
            "seed": get_seed(session_id),
            "scenario_variant": f"Kerberoast/{spn.split('/')[0]}",
            "target_ip": target_ip,
            "dc_host": dc_host,
            "gpp_dir": gpp_dir,
            "kerberoastable_spn": spn,
            "flags": {
                "FLAG-SC02-1": {
                    "value": flag_value,
                    "value_pattern": r"FLAG\{Nexora_[0-9a-f]{8}\}",
                    "points": 60,
                },
            },
        }

    elif scid == "SC-03":
        subject = rng.choice(_SC03_SUBJECTS)
        pretext = rng.choice(_SC03_PRETEXTS)
        relay = rng.choice(_SC03_RELAY_ROUTES)
        target_ip = _primary_target_ip(scid)
        flag_value = (
            f"FLAG{{Orion_{hashlib.md5(session_id.encode()).hexdigest()[:8]}}}"  # noqa: S324
        )
        return {
            "seed": get_seed(session_id),
            "scenario_variant": pretext.split("—")[0].strip(),
            "target_ip": target_ip,
            "phish_subject": subject,
            "victim_pretext": pretext,
            "mail_relay": relay,
            "flags": {
                "FLAG-SC03-1": {
                    "value": flag_value,
                    "value_pattern": r"FLAG\{Orion_[0-9a-f]{8}\}",
                    "points": 55,
                },
            },
        }

    return {}


# ---------------------------------------------------------------------------
# Public: build_iptables_rules
# ---------------------------------------------------------------------------


def build_iptables_rules(
    session_id: str,
    scenario_id: str,
    metadata: dict[str, Any],
) -> list[str]:
    """
    Return a list of iptables commands to alias the randomized target_ip
    inside the Kali container so that the virtual IP redirects to the real
    static Docker container IP.

    Returns [] for bypass sessions or when no remapping is needed.
    """
    if _is_bypass(session_id) or not metadata:
        return []

    scid = scenario_id.upper()
    virtual_ip = metadata.get("target_ip", "")

    real_ip = _primary_target_ip(scid)

    if not virtual_ip or not real_ip or virtual_ip == real_ip:
        return []

    return [
        # Add loopback alias for the virtual IP
        f"ip addr add {virtual_ip}/32 dev lo 2>/dev/null || true",
        # DNAT: traffic to virtual_ip → real_ip
        f"iptables -t nat -A OUTPUT -d {virtual_ip} -j DNAT --to-destination {real_ip} 2>/dev/null || true",
        f"iptables -t nat -A PREROUTING -d {virtual_ip} -j DNAT --to-destination {real_ip} 2>/dev/null || true",
    ]


# ---------------------------------------------------------------------------
# Public: build_flag_tarball
# ---------------------------------------------------------------------------


def build_flag_tarball(flag_path: str, flag_value: str) -> bytes:
    """
    Build an in-memory tar archive that places flag_value at flag_path.
    The caller writes this via container.put_archive().
    """
    content = flag_value.encode()
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as tf:
        info = tarfile.TarInfo(name=flag_path.lstrip("/"))
        info.size = len(content)
        tf.addfile(info, io.BytesIO(content))
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Public: apply_randomization (Docker-SDK side-effects)
# ---------------------------------------------------------------------------


async def apply_randomization(
    session_id: str,
    scenario_id: str,
    metadata: dict[str, Any],
    kali_container_id: str,
) -> None:
    """
    Apply iptables NAT rules and inject flag files into scenario containers
    using the Docker SDK.  Silently skips if Docker is unavailable.
    """
    if _is_bypass(session_id) or not metadata or not kali_container_id:
        return

    try:
        import docker  # type: ignore[import]
    except ImportError:
        logger.warning("[randomizer] docker SDK not available — skipping apply_randomization")
        return

    try:
        client = docker.from_env()
    except Exception as exc:
        logger.warning("[randomizer] Docker unavailable: %s", exc)
        return

    # ── 1. iptables NAT alias inside Kali ──────────────────────────────────
    rules = build_iptables_rules(session_id, scenario_id, metadata)
    if rules:
        try:
            kali = client.containers.get(kali_container_id)
            for rule_cmd in rules:
                result = kali.exec_run(["sh", "-c", rule_cmd], privileged=False)
                logger.debug(
                    "[randomizer] iptables cmd exit=%s: %s",
                    result.exit_code,
                    rule_cmd,
                )
        except Exception as exc:
            logger.warning("[randomizer] iptables injection failed: %s", exc)

    # ── 2. Flag file injection into scenario target containers ──────────────
    scid = scenario_id.upper()
    flag_path: str = metadata.get("flag_path", "")
    flags: dict[str, Any] = metadata.get("flags", {})

    if scid == "SC-01" and flag_path and flags:
        flag_entry = flags.get("FLAG-SC01-1", {})
        flag_value: str = flag_entry.get("value", "")
        if flag_value:
            _inject_flag_file(client, "cybersim-sc01-webapp-1", flag_path, flag_value)

    elif scid == "SC-02" and flags:
        flag_entry = flags.get("FLAG-SC02-1", {})
        flag_value = flag_entry.get("value", "")
        if flag_value:
            _inject_flag_file(client, "cybersim-sc02-dc-1", "/root/flag.txt", flag_value)

    elif scid == "SC-03" and flags:
        flag_entry = flags.get("FLAG-SC03-1", {})
        flag_value = flag_entry.get("value", "")
        if flag_value:
            _inject_flag_file(
                client, "cybersim-sc03-victim-1", "/tmp/flag.txt", flag_value
            )  # noqa: S108


def _inject_flag_file(
    client: Any,
    container_name: str,
    flag_path: str,
    flag_value: str,
) -> None:
    """Write a flag file into a running container via tar archive."""
    try:
        container = client.containers.get(container_name)
        tar_bytes = build_flag_tarball(flag_path, flag_value)
        dest_dir = "/" + "/".join(flag_path.lstrip("/").split("/")[:-1])
        # Ensure parent dir exists
        container.exec_run(["mkdir", "-p", dest_dir], user="root")
        container.put_archive(dest_dir, tar_bytes)
        logger.info("[randomizer] Flag injected → %s:%s", container_name, flag_path)
    except Exception as exc:
        logger.warning(
            "[randomizer] Flag injection failed for %s@%s: %s",
            container_name,
            flag_path,
            exc,
        )
