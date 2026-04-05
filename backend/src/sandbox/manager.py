"""Docker container lifecycle manager for scenario sandboxes."""
from __future__ import annotations

import asyncio
from typing import Tuple

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


def _client() -> "docker.DockerClient":
    if not _docker_available:
        raise RuntimeError("docker SDK not installed")
    return docker.from_env()


# ---------------------------------------------------------------------------
# Public async API
# ---------------------------------------------------------------------------

async def start_scenario_container(
    session_id: str,
    scenario_id: str,
) -> Tuple[str, str]:
    """
    Provision a Kali container on the scenario network.
    If a container for this session_id already exists (browser refresh re-attach),
    returns its existing ID without creating a duplicate.
    Returns (container_id, network_name).
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _start_sync, session_id, scenario_id)


async def stop_scenario_container(container_id: str) -> None:
    if container_id.startswith("mock-"):
        return
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _stop_sync, container_id)


async def exec_command(container_id: str, command: str) -> str:
    """Run a one-shot command in a container and return stdout."""
    if container_id.startswith("mock-"):
        return f"[mock] {command}"
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _exec_sync, container_id, command)


# ---------------------------------------------------------------------------
# Sync implementations (run in thread pool to avoid blocking event loop)
# ---------------------------------------------------------------------------

def _start_sync(session_id: str, scenario_id: str) -> Tuple[str, str]:
    sc_num = scenario_id.lower().replace("-", "")  # sc01, sc02, sc03
    network_name = f"cybersim-{sc_num}"
    container_name = f"kali-{session_id[:8]}"

    try:
        client = _client()

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
            print(f"[Sandbox] Docker unavailable — mock container: {exc}")
            return f"mock-{session_id[:8]}", network_name
        raise


def _stop_sync(container_id: str) -> None:
    try:
        client = _client()
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
        client = _client()
        container = client.containers.get(container_id)
        result = container.exec_run(command, demux=False)
        return (result.output or b"").decode("utf-8", errors="replace")
    except Exception as exc:
        return f"[exec error] {exc}"
