"""Docker container lifecycle manager for scenario sandboxes."""
import asyncio
from typing import Tuple

try:
    import docker
    from docker.errors import DockerException
    _docker_available = True
except ImportError:
    _docker_available = False

from src.config import settings


def _client():
    if not _docker_available:
        raise RuntimeError("docker SDK not installed")
    return docker.from_env()


async def start_scenario_container(session_id: str, scenario_id: str) -> Tuple[str, str]:
    """
    Spin up a Kali container connected to the scenario network.
    Returns (container_id, network_name).
    Runs in a thread pool to avoid blocking the event loop.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _start_sync, session_id, scenario_id)


def _start_sync(session_id: str, scenario_id: str) -> Tuple[str, str]:
    sc_num = scenario_id.lower().replace("-", "")  # sc01
    network_name = f"cybersim-{sc_num}"
    container_name = f"kali-{session_id[:8]}"

    try:
        client = _client()
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
            cpu_period=100000,
            cpu_quota=int(settings.CONTAINER_CPU_LIMIT * 100000),
            mem_limit=settings.CONTAINER_MEMORY_LIMIT,
            cap_drop=["ALL"],
            security_opt=["no-new-privileges"],
            remove=False,
        )
        return container.id, network_name
    except Exception as e:
        # Graceful degradation in dev when Docker isn't set up
        if settings.ENVIRONMENT == "development":
            print(f"[Sandbox] Docker unavailable — mock container: {e}")
            return f"mock-{session_id[:8]}", network_name
        raise


async def stop_scenario_container(container_id: str) -> None:
    if container_id.startswith("mock-"):
        return
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _stop_sync, container_id)


def _stop_sync(container_id: str) -> None:
    try:
        client = _client()
        container = client.containers.get(container_id)
        container.stop(timeout=5)
        container.remove(force=True)
    except Exception as e:
        if settings.ENVIRONMENT == "development":
            print(f"[Sandbox] Container stop error (non-fatal): {e}")
        else:
            raise
