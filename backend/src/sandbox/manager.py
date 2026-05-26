"""Docker container lifecycle manager for scenario sandboxes."""

from __future__ import annotations

import asyncio
import logging
import subprocess
from pathlib import Path
from typing import Tuple, Optional

from sqlalchemy import select

logger = logging.getLogger(__name__)

try:
    import docker
    from docker.errors import NotFound, DockerException, APIError

    _docker_available = True
except ImportError:
    _docker_available = False

    class DockerException(Exception):
        pass

    class APIError(Exception):
        pass

    class NotFound(Exception):
        pass


from src.config import settings
from src.cache.redis import cache_get, cache_set
from src.db.database import AsyncSessionLocal, Session

# v2.0 guardrail — hardcoded, not configurable at runtime
_CPU_PERIOD = 100000
_CPU_QUOTA = 50000  # 0.5 cores
_MEM_LIMIT = "512m"

# Scenario profile → target services that must be running
_SCENARIO_TARGETS: dict[str, list[str]] = {
    "sc01": ["sc01-db", "sc01-webapp", "sc01-waf"],
    "sc02": ["sc02-dc", "sc02-fileserver"],
    "sc03": ["sc03-phish"],
}

# Locate docker-compose.yml (now explicitly mounted as /project in backend)
_COMPOSE_FILE = Path("/project/docker-compose.yml")

# Singleton Docker client (avoids creating new connections per invocation)
_docker_client: Optional["docker.DockerClient"] = None


def _get_client() -> "docker.DockerClient":
    """Get or create the module-level Docker client singleton."""
    global _docker_client
    if not _docker_available:
        raise RuntimeError("docker SDK not installed")
    if _docker_client is None:
        _docker_client = docker.from_env()
    return _docker_client


# ---------------------------------------------------------------------------
# Public async API
# ---------------------------------------------------------------------------


async def start_scenario_container(
    session_id: str,
    scenario_id: str,
) -> Tuple[str, str]:
    """
    Provision a Kali container on the scenario network AND ensure the
    scenario's target containers (webapp, DC, etc.) are running.
    If a container for this session_id already exists (browser refresh re-attach),
    returns its existing ID without creating a duplicate.
    Returns (container_id, network_name).
    """
    loop = asyncio.get_running_loop()
    # Start target containers in parallel with the Kali container
    await loop.run_in_executor(None, _ensure_scenario_targets, scenario_id, False)
    return await loop.run_in_executor(None, _start_sync, session_id, scenario_id)


async def ensure_scenario_container(
    session_id: str,
    scenario_id: str,
    container_id: str | None,
) -> Tuple[str, str, bool]:
    """
    Return a live Kali container for a session, replacing stale DB pointers.

    Returns (container_id, network_name, changed).
    """
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _ensure_scenario_targets, scenario_id, False)
    return await loop.run_in_executor(
        None, _ensure_sync, session_id, scenario_id, container_id
    )


async def stop_scenario_container(
    container_id: str, scenario_id: str | None = None
) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _stop_sync, container_id)
    if scenario_id:
        await loop.run_in_executor(None, _teardown_scenario_targets, scenario_id)


async def exec_command(container_id: str, command: str) -> str:
    """Run a one-shot command in a container and return stdout."""
    if container_id.startswith("mock-"):
        return f"[mock] {command}"
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _exec_sync, container_id, command)


async def get_kali_ip_for_session(session_id: str) -> str | None:
    """Return the live Kali container IP for a session, with Redis caching."""
    cache_key = f"session:{session_id}:kali_ip"
    cached_ip = await cache_get(cache_key)
    if isinstance(cached_ip, str) and cached_ip:
        return cached_ip

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Session.container_id, Session.network_name).where(
                Session.id == session_id
            )
        )
        row = result.one_or_none()

    if row is None:
        return None

    container_id, network_name = row
    if not container_id or container_id.startswith("mock-"):
        return None

    loop = asyncio.get_running_loop()
    ip_address = await loop.run_in_executor(
        None, _get_container_network_ip_sync, container_id, network_name
    )
    if ip_address:
        await cache_set(cache_key, ip_address, ttl=28800)
    return ip_address


# ---------------------------------------------------------------------------
# Sync implementations (run in thread pool to avoid blocking event loop)
# ---------------------------------------------------------------------------


def _ensure_scenario_targets(scenario_id: str, force_reset: bool = True) -> None:
    """Bring up scenario-specific target containers using docker-compose.

    Explicitly targets the required services to avoid restarting the backend.
    """
    profile = scenario_id.lower().replace("-", "")  # SC-01 → sc01
    targets = _SCENARIO_TARGETS.get(profile)
    if not targets or not _COMPOSE_FILE.exists():
        return

    try:
        cmd = [
            "docker-compose",
            "--project-name",
            "cybersim",
            "-f",
            str(_COMPOSE_FILE),
            "up",
            "-d",
            "--no-deps",
        ]
        if force_reset:
            cmd.append("--force-recreate")
        else:
            cmd.append("--no-recreate")

        # Explicitly target only the scenario services
        cmd.extend(targets)

        subprocess.run(cmd, capture_output=True, timeout=60)
    except (subprocess.SubprocessError, OSError) as exc:
        print(f"[Sandbox] Scenario targets for {profile} unavailable: {exc}")


def _teardown_scenario_targets(scenario_id: str) -> None:
    """Stop scenario-specific targets."""
    profile = scenario_id.lower().replace("-", "")
    targets = _SCENARIO_TARGETS.get(profile)
    if not targets or not _COMPOSE_FILE.exists():
        return

    try:
        subprocess.run(
            [
                "docker-compose",
                "--project-name",
                "cybersim",
                "-f",
                str(_COMPOSE_FILE),
                "stop",
            ]
            + targets,
            capture_output=True,
            timeout=60,
        )
    except (subprocess.SubprocessError, OSError) as exc:
        print(f"[Sandbox] Error stopping scenario targets for {profile}: {exc}")


def _get_scenario_network(sc_num: str) -> str:
    """
    Return the Docker network name for a scenario profile.

    Docker Compose prefixes networks with the project name derived from the
    directory (e.g. 'JUTerminal1' → 'juterminal1').  We discover the name
    at runtime so the code works regardless of where the project is cloned.
    """
    try:
        client = _get_client()
        # Look for networks whose name contains the scenario suffix, e.g. sc01-net
        for net in client.networks.list():
            if sc_num + "-net" in net.name:
                return net.name
    except (DockerException, APIError, RuntimeError):
        pass
    # Derive from compose file parent directory as a reliable fallback
    return f"cybersim_{sc_num}-net"


def _repair_kali_tools(container: "docker.models.containers.Container") -> bool:
    """Repair tool metadata that conflicts with the non-root sandbox policy."""
    try:
        container.exec_run(
            [
                "/bin/bash",
                "-lc",
                "if [ -f /usr/lib/nmap/nmap ] && command -v setcap >/dev/null 2>&1; then setcap -r /usr/lib/nmap/nmap 2>/dev/null || true; fi",
            ],
            user="root",
        )
        result = container.exec_run(
            ["/bin/bash", "-lc", "getcap /usr/lib/nmap/nmap 2>/dev/null || true"]
        )
        output = (result.output or b"").decode("utf-8", errors="replace")
        return "/usr/lib/nmap/nmap" not in output
    except (DockerException, APIError) as exc:
        if settings.ENVIRONMENT == "development":
            print(f"[Sandbox] Kali tool repair skipped for {container.name}: {exc}")
        return True


def _start_sync(session_id: str, scenario_id: str) -> Tuple[str, str]:
    sc_num = scenario_id.lower().replace("-", "")  # sc01, sc02, sc03
    network_name = _get_scenario_network(sc_num)
    container_name = f"kali-{session_id[:8]}"

    try:
        client = _get_client()

        # Mission reset: always recreate the container if it exists
        try:
            existing = client.containers.get(container_name)
            existing.remove(force=True)
        except NotFound:
            pass

        env_vars = {
            "SCENARIO_ID": scenario_id,
            "SESSION_ID": session_id,
        }

        if sc_num == "sc02":
            env_vars.update(
                {
                    "SC_DOMAIN": "nexora.local",
                    "SC_REALM": "NEXORA.LOCAL",
                    "SC_DC_IP": "172.20.2.20",
                    "SC_DC_NAME": "nexora-dc01.nexora.local",
                    "SC_FS_IP": "172.20.2.40",
                }
            )

        container = client.containers.run(
            image=settings.KALI_IMAGE,
            name=container_name,
            detach=True,
            network=network_name,
            hostname="kali",
            environment=env_vars,
            # v2.0 guardrail — hardcoded, not from settings
            cpu_period=_CPU_PERIOD,
            cpu_quota=_CPU_QUOTA,
            mem_limit=_MEM_LIMIT,
            cap_drop=["ALL"],
            security_opt=["no-new-privileges"],
            labels={
                "cybersim_managed": "true",
                "cybersim_role": "kali",
                "cybersim_session": session_id,
                "cybersim_scenario": scenario_id,
                # Canonical labels used by orphan sweep (B7-2)
                "com.cybersim.project": "JUTerminal1",
                "com.cybersim.role": "kali",
                "com.cybersim.session": session_id,
            },
            remove=False,
        )

        if sc_num == "sc02":
            setup_cmd = """cat > /etc/krb5.conf << 'EOF'
[libdefaults]
    default_realm = NEXORA.LOCAL
    rdns = false
    dns_lookup_realm = false
    dns_lookup_kdc = false
    default_tkt_enctypes = rc4-hmac
    default_tgs_enctypes = rc4-hmac
    permitted_enctypes = rc4-hmac
    allow_weak_crypto = true

[realms]
    NEXORA.LOCAL = {
        kdc = 172.20.2.20:88
        admin_server = 172.20.2.20:749
        master_kdc = 172.20.2.20:88
    }

[domain_realm]
    .nexora.local = NEXORA.LOCAL
    nexora.local = NEXORA.LOCAL
EOF
grep -q 'nexora.local' /etc/hosts || cat >> /etc/hosts << 'EOF'
172.20.2.20 nexora-dc01.nexora.local nexora-dc01 nexora.local
172.20.2.40 nexora-fs01.nexora.local nexora-fs01
EOF
"""
            result = container.exec_run(["/bin/bash", "-c", setup_cmd], user="root")
            if result.exit_code != 0:
                print(f"[Sandbox] krb5/hosts setup failed: {result.output[:200]}")

        _repair_kali_tools(container)
        return container.id, network_name

    except (DockerException, APIError, RuntimeError) as exc:
        logger.error(
            f"[Sandbox] Docker unavailable for session {session_id}, container {container_name}: {exc}"
        )
        if settings.ENVIRONMENT == "development":
            print(
                f"[Sandbox] Docker unavailable for session {session_id}, container {container_name}; using mock: {exc}"
            )
            return f"mock-{session_id[:8]}", network_name
        raise


def _ensure_sync(
    session_id: str,
    scenario_id: str,
    container_id: str | None,
) -> Tuple[str, str, bool]:
    sc_num = scenario_id.lower().replace("-", "")
    network_name = _get_scenario_network(sc_num)

    if container_id and not container_id.startswith("mock-"):
        try:
            client = _get_client()
            container = client.containers.get(container_id)
            if container.status != "running":
                container.start()
            if _repair_kali_tools(container):
                return container.id, network_name, False
            container.remove(force=True)
        except (NotFound, DockerException, APIError, RuntimeError) as exc:
            logger.warning(
                f"[Sandbox] Failed to ensure existing container {container_id} for session {session_id}: {exc}"
            )

    new_container_id, new_network_name = _start_sync(session_id, scenario_id)
    return new_container_id, new_network_name, new_container_id != container_id


def _stop_sync(container_id: str) -> None:
    try:
        client = _get_client()
        container = client.containers.get(container_id)
        container.stop(timeout=5)
        container.remove(force=True)
    except (NotFound, DockerException, APIError, RuntimeError) as exc:
        logger.error(f"[Sandbox] Container {container_id} stop error: {exc}")
        if settings.ENVIRONMENT == "development":
            print(f"[Sandbox] Container {container_id} stop error (non-fatal): {exc}")
        else:
            raise


def _exec_sync(container_id: str, command: str) -> str:
    try:
        client = _get_client()
        container = client.containers.get(container_id)
        result = container.exec_run(command, demux=False)
        return (result.output or b"").decode("utf-8", errors="replace")
    except (NotFound, DockerException, APIError, RuntimeError) as exc:
        logger.error(f"[Sandbox] Exec error in container {container_id}: {exc}")
        return f"[exec error] {exc}"


def _get_container_network_ip_sync(
    container_id: str, network_name: str | None
) -> str | None:
    try:
        client = _get_client()
        container = client.containers.get(container_id)
        networks = container.attrs.get("NetworkSettings", {}).get("Networks", {})
        if network_name and network_name in networks:
            ip_address = networks[network_name].get("IPAddress")
            if ip_address:
                return str(ip_address)
        for details in networks.values():
            ip_address = details.get("IPAddress")
            if ip_address:
                return str(ip_address)
    except (NotFound, DockerException, APIError, RuntimeError) as exc:
        logger.warning(
            "[Sandbox] Failed to inspect container %s IP: %s", container_id, exc
        )
    return None
