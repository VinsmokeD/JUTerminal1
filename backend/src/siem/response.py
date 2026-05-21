from __future__ import annotations

from datetime import datetime, timezone

from src.db.database import ContainmentAction, AsyncSessionLocal
from src.sandbox.manager import _SCENARIO_TARGETS
from src.activity.service import record_activity


async def execute_containment(
    session_id: str,
    user_id: str,
    scenario_id: str,
    action_type: str,
    target_value: str,
) -> dict:
    """
    Record a deterministic simulated containment action.

    The scenario containers intentionally do not grant NET_ADMIN. For the
    graduation demo, containment is represented as an auditable analyst action
    instead of mutating container firewalls/processes.
    """
    profile = scenario_id.lower().replace("-", "")
    targets = _SCENARIO_TARGETS.get(profile, [])

    status, detail = _simulate_containment(action_type, target_value, targets)

    # Log to DB
    try:
        async with AsyncSessionLocal() as db:
            action = ContainmentAction(
                session_id=session_id,
                user_id=user_id,
                action_type=action_type,
                target_value=target_value,
                status=status,
                created_at=datetime.now(timezone.utc),
            )
            db.add(action)
            await record_activity(
                db,
                user_id,
                "containment_action",
                session_id,
                {
                    "type": action_type,
                    "target": target_value,
                    "status": status,
                    "detail": detail,
                    "simulated": True,
                },
            )
            await db.commit()
    except Exception as exc:
        return {
            "status": "failed",
            "detail": f"Simulated containment prepared but audit logging failed: {exc}",
            "simulated": True,
        }

    return {"status": status, "detail": detail, "simulated": True}


def _simulate_containment(
    action_type: str, target_value: str, targets: list[str]
) -> tuple[str, str]:
    if not targets:
        return "failed", "No scenario targets are registered for this session."

    if action_type == "block_ip":
        if not target_value:
            return "failed", "No source IP was supplied for simulated blocking."
        return (
            "success",
            "Simulated containment: source "
            f"{target_value} would be blocked at ingress for {', '.join(targets)}. "
            "No container firewall was changed.",
        )

    if action_type == "kill_pid":
        if ":" not in target_value:
            return "failed", "Use 'container_name:pid' for simulated process containment."
        target_name, pid = target_value.split(":", 1)
        if target_name not in targets or not pid.isdigit():
            return "failed", "The simulated process target is not valid for this scenario."
        return (
            "success",
            f"Simulated containment: PID {pid} would be terminated on {target_name}.",
        )

    if action_type == "isolate_host":
        if target_value not in targets:
            return "failed", "The simulated host target is not valid for this scenario."
        return (
            "success",
            f"Simulated containment: {target_value} would be isolated from scenario traffic.",
        )

    return "failed", f"Unknown simulated containment action type: {action_type}"
