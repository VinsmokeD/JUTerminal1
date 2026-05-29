from fastapi import APIRouter, HTTPException
from src.scenarios.loader import list_scenarios, load_scenario

router = APIRouter()


@router.get("", include_in_schema=False)
@router.get("/")
async def list_all_scenarios() -> list[dict]:
    """Return metadata for all 3 MVP scenarios."""
    return list_scenarios()


@router.get("/{scenario_id}")
async def get_scenario(scenario_id: str) -> dict:
    try:
        return load_scenario(scenario_id.upper())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{scenario_id}/phases")
async def get_scenario_phases(scenario_id: str) -> list[dict]:
    """Return phase definitions for a specific scenario."""
    try:
        scenario = load_scenario(scenario_id.upper())
        phases = scenario.get("phases", {})
        result = []
        for p_id, p_data in sorted(phases.items(), key=lambda x: int(x[0])):
            result.append({
                "phase": int(p_id),
                "name": p_data.get("name", ""),
                "mitre": p_data.get("mitre", [])
            })
        return result
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
