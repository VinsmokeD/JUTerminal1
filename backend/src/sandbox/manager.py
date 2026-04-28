"""Docker container lifecycle manager for scenario sandboxes."""
from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from typing import Tuple, Optional

try:
    import docker
    from docker.errors import NotFound
    _docker_available = True
except ImportError:
    _docker_available = False

from src.config import settings

# v2.0 guardrail — hardcoded, not configurable at runtime
_CPU_PERIOD = 100000
_CPU_QUOTA = 50000   # 0.5 cores
_MEM_LIMIT = "512m"

# Scenario profile → target services that must be running
_SCENARIO_TARGETS: dict[str, list[str]] = {
    "sc01": ["sc01-webapp", "sc01-waf"],
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
    loop = asyncio.get_event_loop()
    # Start target containers in parallel with the Kali container
    await loop.run_in_executor(None, _ensure_scenario_targets, scenario_id)
    return await loop.run_in_executor(None, _start_sync, session_id, scenario_id)


async def stop_scenario_container(container_id: str, scenario_id: str | None = None) -> None:
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _stop_sync, container_id)
    if scenario_id:
        await loop.run_in_executor(None, _teardown_scenario_targets, scenario_id)


async def exec_command(container_id: str, command: str) -> str:
    """Run a one-shot command in a container and return stdout."""
    if container_id.startswith("mock-"):
        return f"[mock] {command}"
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _exec_sync, container_id, command)


# ---------------------------------------------------------------------------
# Sync implementations (run in thread pool to avoid blocking event loop)
# ---------------------------------------------------------------------------

def _ensure_scenario_targets(scenario_id: str) -> None:
    """Bring up scenario-specific target containers using docker-compose profiles.

    Idempotent — already-running containers are left untouched.  Falls back
    silently in development mode so the platform works without Docker.
    """
    profile = scenario_id.lower().replace("-", "")  # SC-01 → sc01
    targets = _SCENARIO_TARGETS.get(profile)
    if not targets or not _COMPOSE_FILE.exists():
        return

    try:
        client = _get_client()
        # Check if targets are already running — skip compose if so
        all_running = True
        for svc in targets:
            try:
                c = client.containers.get(svc)
                if c.status != "running":
                    all_running = False
                    break
            except Exception:
                all_running = False
                break

        if all_running:
            return

        subprocess.run(
            [
                "docker-compose",
                "--project-name", "cybersim",
                "-f", str(_COMPOSE_FILE),
                "--profile", profile,
                "up", "-d", "--no-recreate",
            ],
            capture_output=True,
            timeout=60,
        )
    except Exception as exc:
        print(f"[Sandbox] Scenario targets for {profile} unavailable: {exc}")

def _teardown_scenario_targets(scenario_id: str) -> None:
    """Tear down scenario-specific targets dynamically to save single-node RAM."""
    profile = scenario_id.lower().replace("-", "")
    targets = _SCENARIO_TARGETS.get(profile)
    if not targets or not _COMPOSE_FILE.exists():
        return

    try:
        subprocess.run(
            [
                "docker-compose",
                "--project-name", "cybersim",
                "-f", str(_COMPOSE_FILE),
                "--profile", profile,
                "stop",
            ],
            capture_output=True,
            timeout=60,
        )
    except Exception as exc:
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
    except Exception:
        pass
    # Derive from compose file parent directory as a reliable fallback
    return f"cybersim_{sc_num}-net"


def _start_sync(session_id: str, scenario_id: str) -> Tuple[str, str]:
    sc_num = scenario_id.lower().replace("-", "")  # sc01, sc02, sc03
    network_name = _get_scenario_network(sc_num)
    container_name = f"kali-{session_id[:8]}"

    try:
        client = _get_client()

        # v2.0 Rule 4 — re-attach if container already exists
        try:
            existing = client.containers.get(container_name)
            if existing.status != "running":
                existing.start()
            return existing.id, network_name
        except NotFound:
            pass  # Expected on first boot — create it below

        container = client.containers.run(
            image=settings.KALI_IMAGE,
            name=container_name,
            detach=True,
            network=network_name,
            hostname="kali",
            environment={
                "SCENARIO_ID": scenario_id,
                "SESSION_ID": session_id,
            },
            # v2.0 guardrail — hardcoded, not from settings
            cpu_period=_CPU_PERIOD,
            cpu_quota=_CPU_QUOTA,
            mem_limit=_MEM_LIMIT,
            cap_drop=["ALL"],
            security_opt=["no-new-privileges"],
            remove=False,
        )
        return container.id, network_name

    except Exception as exc:
        if settings.ENVIRONMENT == "development":
            print(f"[Sandbox] Docker unavailable; using mock container for {session_id}: {exc}")
            return f"mock-{session_id[:8]}", network_name
        raise


def _stop_sync(container_id: str) -> None:
    try:
        client = _get_client()
        container = client.containers.get(container_id)
        container.stop(timeout=5)
        container.remove(force=True)
    except Exception as exc:
        if settings.ENVIRONMENT == "development":
            print(f"[Sandbox] Container stop error (non-fatal): {exc}")
        else:
            raise


def _exec_sync(container_id: str, command: str) -> str:
    try:
        client = _get_client()
        container = client.containers.get(container_id)
        result = container.exec_run(command, demux=False)
        return (result.output or b"").decode("utf-8", errors="replace")
    except Exception as exc:
        return f"[exec error] {exc}"
