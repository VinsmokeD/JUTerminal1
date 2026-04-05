from fastapi import APIRouter, HTTPException
from src.scenarios.loader import list_scenarios, load_scenario

router = APIRouter()


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
