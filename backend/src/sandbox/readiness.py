"""Readiness diagnostics and self-healing engine for Parallax scenario workspaces."""

from __future__ import annotations

import asyncio
import socket
import subprocess
from pathlib import Path
from typing import Any, Dict, Tuple, Optional

import httpx
import docker
from docker.errors import NotFound
from sqlalchemy import text

from src.config import settings
from src.db.database import AsyncSessionLocal
from src.cache.redis import _get as _get_redis

_COMPOSE_FILE = Path("/project/docker-compose.yml")

# Mapping of scenario ID prefix to docker-compose service names and ports to probe internally
_SCENARIO_PROBES: dict[str, dict[str, int]] = {
    "sc01": {
        "sc01-db": 3306,
        "sc01-php": 80,
        "sc01-webapp": 80,
        "sc01-waf": 80,
    },
    "sc02": {
        "sc02-dc": 445,
        "sc02-fileserver": 445,
    },
    "sc03": {
        "sc03-mailrelay": 25,
        "sc03-phish": 3333,
        "sc03-victim": 8080,
    },
}


def _get_docker_client() -> docker.DockerClient:
    """Initialize or return the Docker client."""
    return docker.from_env()


async def check_port_internal(container: Any, port: int) -> bool:
    """Probe a port inside the target container using various fallback utilities."""
    # We try different commands. If any command returns 0, the port is listening.
    cmds = [
        f"nc -z 127.0.0.1 {port}",
        f"python3 -c \"import socket; s = socket.socket(); s.settimeout(0.5); s.connect(('127.0.0.1', {port}))\"",
        f"python -c \"import socket; s = socket.socket(); s.settimeout(0.5); s.connect(('127.0.0.1', {port}))\"",
        f"curl -s -I http://127.0.0.1:{port}",
        f"wget -q --spider http://127.0.0.1:{port}",
        f'bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/{port}"',
    ]

    # Special probe for MariaDB
    if port == 3306:
        cmds.insert(0, "mariadb-admin ping -h 127.0.0.1 -uroot -pNovaMedRoot2024!")
        cmds.insert(1, "mysqladmin ping -h 127.0.0.1 -uroot -pNovaMedRoot2024!")

    for cmd in cmds:
        try:
            # We run the command synchronously in an executor
            loop = asyncio.get_running_loop()
            exit_code, _ = await loop.run_in_executor(
                None, lambda: container.exec_run(cmd, timeout=1.5)
            )
            if exit_code == 0:
                return True
        except Exception:
            continue

    # Default fallback: check if container says it is running and let it pass if no shell tools succeed
    return False


async def self_heal_target(service_name: str) -> bool:
    """Attempt to self-heal a target container by running docker-compose restart."""
    if not _COMPOSE_FILE.exists():
        return False
    try:
        cmd = [
            "docker-compose",
            "--project-name",
            "parallax",
            "-f",
            str(_COMPOSE_FILE),
            "restart",
            service_name,
        ]
        loop = asyncio.get_running_loop()
        process = await loop.run_in_executor(
            None, lambda: subprocess.run(cmd, capture_output=True, timeout=30)
        )
        return process.returncode == 0
    except Exception as exc:
        print(f"[Readiness] Self-heal failed for {service_name}: {exc}")
        return False


async def get_session_readiness(session_id: str, scenario_id: str) -> dict[str, Any]:
    """
    Check the readiness of all components required for a session.
    Triggers self-healing for Kali and target containers if degraded.
    """
    checks: dict[str, Any] = {}
    client = _get_docker_client()
    sc_key = scenario_id.lower().replace("-", "")

    # 1. Kali Container check & self-heal
    kali_name = f"kali-{session_id[:8]}"
    try:
        loop = asyncio.get_running_loop()
        kali_container = await loop.run_in_executor(None, lambda: client.containers.get(kali_name))
        kali_status = kali_container.status

        # Self-heal if stopped/exited
        if kali_status not in ("running", "restarting"):
            print(f"[Readiness] Kali container {kali_name} is {kali_status}. Restarting...")
            await loop.run_in_executor(None, kali_container.start)
            kali_status = "running"

        checks["kali"] = {
            "status": "ok" if kali_status == "running" else "error",
            "detail": f"Container status: {kali_status}",
            "container_id": kali_container.id[:12],
        }
    except NotFound:
        checks["kali"] = {
            "status": "error",
            "detail": "Kali container not found. Re-attach or restart session to provision.",
        }
    except Exception as exc:
        checks["kali"] = {
            "status": "error",
            "detail": f"Error querying Kali container: {str(exc)[:100]}",
        }

    # 2. Target Containers check & self-heal
    target_probes = _SCENARIO_PROBES.get(sc_key, {})
    targets_status = "ok"
    targets_detail: dict[str, Any] = {}

    for service_name, port in target_probes.items():
        container_name = f"parallax-{service_name}-1"
        try:
            loop = asyncio.get_running_loop()
            container = await loop.run_in_executor(
                None, lambda: client.containers.get(container_name)
            )
            c_status = container.status

            # If not running, attempt self-healing
            if c_status not in ("running", "restarting"):
                print(
                    f"[Readiness] Target container {container_name} is {c_status}. Attempting self-heal..."
                )
                healed = await self_heal_target(service_name)
                if healed:
                    container = await loop.run_in_executor(
                        None, lambda: client.containers.get(container_name)
                    )
                    c_status = container.status

            # Check port inside container
            port_open = False
            if c_status == "running":
                port_open = await check_port_internal(container, port)

            # If port is closed but container is running, we might still count it ok if no other options,
            # but let's be strict: if container is running and healthy (or status is running), we check port_open
            # Let's say: status ok if running, and warning if port check fails.
            if c_status == "running":
                if port_open:
                    status = "ok"
                    detail = "Running & Responsive"
                else:
                    # Port probe failed. Let's check docker health status
                    health = container.attrs.get("State", {}).get("Health", {})
                    if health.get("Status") == "healthy":
                        status = "ok"
                        detail = "Running & Healthy (Docker Healthcheck)"
                    else:
                        status = "error"
                        detail = f"Running but Port {port} unresponsive"
                        targets_status = "degraded"
            else:
                status = "error"
                detail = f"Status: {c_status}"
                targets_status = "degraded"

            targets_detail[service_name] = {
                "status": status,
                "detail": detail,
                "port": port,
                "container_id": container.id[:12],
            }
        except NotFound:
            # Self-heal missing container by recreating it via docker-compose
            print(f"[Readiness] Target container {container_name} not found. Re-creating...")
            healed = await self_heal_target(service_name)
            if healed:
                try:
                    container = await loop.run_in_executor(
                        None, lambda: client.containers.get(container_name)
                    )
                    targets_detail[service_name] = {
                        "status": "ok",
                        "detail": "Recreated & Running",
                        "port": port,
                        "container_id": container.id[:12],
                    }
                    continue
                except Exception:
                    pass
            targets_status = "degraded"
            targets_detail[service_name] = {
                "status": "error",
                "detail": "Container not found and recreation failed",
                "port": port,
            }
        except Exception as exc:
            targets_status = "degraded"
            targets_detail[service_name] = {
                "status": "error",
                "detail": f"Error: {str(exc)[:100]}",
                "port": port,
            }

    checks["targets"] = {
        "status": targets_status,
        "containers": targets_detail,
    }

    # 3. Redis check
    try:
        r = _get_redis()
        await r.ping()
        checks["redis"] = {"status": "ok", "detail": "PONG"}
    except Exception as exc:
        checks["redis"] = {"status": "error", "detail": f"Error: {str(exc)[:100]}"}

    # 4. Elasticsearch check
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get("http://elasticsearch:9200/_cluster/health", timeout=2.0)
            es_data = resp.json()
        es_status = es_data.get("status", "unknown")
        checks["elasticsearch"] = {
            "status": "ok" if es_status in ("green", "yellow") else "error",
            "detail": f"Cluster: {es_status}",
        }
    except Exception as exc:
        checks["elasticsearch"] = {"status": "error", "detail": f"Error: {str(exc)[:100]}"}

    # 5. OpenRouter status check
    if not settings.OPENROUTER_API_KEY:
        checks["openrouter"] = {
            "status": "ok",
            "detail": "Configured (Offline Fallback Mode)",
            "configured": False,
        }
    else:
        try:
            # Check Redis cache first
            cached_status = None
            if checks.get("redis", {}).get("status") == "ok":
                cached_status = await r.get("health:openrouter:status")

            if cached_status:
                checks["openrouter"] = {
                    "status": "ok",
                    "detail": "Active (Cached)",
                    "configured": True,
                }
            else:
                async with httpx.AsyncClient() as http_client:
                    resp = await http_client.get(
                        "https://openrouter.ai/api/v1/auth/key",
                        headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
                        timeout=2.0,
                    )
                    resp.raise_for_status()
                checks["openrouter"] = {
                    "status": "ok",
                    "detail": "Active",
                    "configured": True,
                }
                if checks.get("redis", {}).get("status") == "ok":
                    await r.setex("health:openrouter:status", 60, "ok")
        except Exception as exc:
            checks["openrouter"] = {
                "status": "error",
                "detail": f"API error: {str(exc)[:100]}",
                "configured": True,
            }

    # Overall system status
    overall_status = "ready"
    if checks.get("kali", {}).get("status") == "error":
        overall_status = "initializing"

    return {
        "status": overall_status,
        "session_id": session_id,
        "scenario_id": scenario_id,
        "checks": checks,
    }
