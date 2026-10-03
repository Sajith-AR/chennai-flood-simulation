from fastapi import APIRouter, Request, HTTPException
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from backend.app.services.ai_advisor import AIAdvisorService

router = APIRouter()


class AdvisoryEvaluationRequest(BaseModel):
    simulation_id: Optional[str] = None


@router.get("/advisory")
def get_latest_advisory(request: Request):
    """
    Returns real-time AI Decision Support advisory for current disaster state:
    - Critical Ward Vulnerability Index (ranked)
    - Casualty prevention & bottleneck warning indicators
    - Optimal airlift drop zones
    - Bilingual (Tamil & English) siren alerts & bulletins
    """
    ai_advisor: Optional[AIAdvisorService] = getattr(request.app.state, "ai_advisor", None)
    flood_engine = getattr(request.app.state, "flood_engine", None)
    road_engine = getattr(request.app.state, "road_engine", None)

    if not ai_advisor or not flood_engine:
        raise HTTPException(status_code=500, detail="AI Advisor services not initialized.")

    latest_sim = getattr(request.app.state, "latest_simulation", None)
    latest_flood_zones = getattr(request.app.state, "latest_flood_zones", None)

    # If simulation was already run, retrieve cached or computed advisory
    if latest_sim and "ai_advisory" in latest_sim:
        return latest_sim["ai_advisory"]

    step_zones = latest_flood_zones or []
    isolated_clusters = latest_sim.get("isolated_clusters", []) if latest_sim else []
    shelters = latest_sim.get("shelter_allocations", []) if latest_sim else []
    dynamic_graph = getattr(request.app.state, "latest_dynamic_graph", None)

    advisory = ai_advisor.generate_comprehensive_advisory(
        step_zones_state=step_zones,
        dynamic_graph=dynamic_graph,
        isolated_clusters=isolated_clusters,
        shelter_allocations=shelters,
        flood_engine=flood_engine,
    )
    return advisory


@router.get("/advisory/wards")
def get_ward_vulnerability_rankings(request: Request):
    """
    Returns specifically the ranked Critical Ward Vulnerability Index for Chennai's 15 GCC Zones.
    """
    ai_advisor: Optional[AIAdvisorService] = getattr(request.app.state, "ai_advisor", None)
    flood_engine = getattr(request.app.state, "flood_engine", None)
    if not ai_advisor or not flood_engine:
        raise HTTPException(status_code=500, detail="AI Advisor services not initialized.")

    latest_flood_zones = getattr(request.app.state, "latest_flood_zones", None) or []
    return {
        "status": "success",
        "ward_rankings": ai_advisor.compute_ward_vulnerability_index(
            step_zones_state=latest_flood_zones,
            flood_engine=flood_engine,
        )
    }


@router.get("/advisory/airlift")
def get_optimal_airlift_zones(request: Request):
    """
    Returns optimal airlift drop zone coordinates for currently isolated clusters.
    """
    ai_advisor: Optional[AIAdvisorService] = getattr(request.app.state, "ai_advisor", None)
    flood_engine = getattr(request.app.state, "flood_engine", None)
    if not ai_advisor or not flood_engine:
        raise HTTPException(status_code=500, detail="AI Advisor services not initialized.")

    latest_sim = getattr(request.app.state, "latest_simulation", None)
    isolated = latest_sim.get("isolated_clusters", []) if latest_sim else []
    latest_flood_zones = getattr(request.app.state, "latest_flood_zones", None) or []

    return {
        "status": "success",
        "optimal_airlift_drop_zones": ai_advisor.compute_optimal_airlift_drop_zones(
            isolated_clusters=isolated,
            step_zones_state=latest_flood_zones,
            flood_engine=flood_engine,
        )
    }


@router.get("/advisory/broadcast")
def get_bilingual_broadcasts(request: Request):
    """
    Returns Tamil & English emergency alert bulletins for citizen warning sirens and SMS.
    """
    ai_advisor: Optional[AIAdvisorService] = getattr(request.app.state, "ai_advisor", None)
    flood_engine = getattr(request.app.state, "flood_engine", None)
    if not ai_advisor or not flood_engine:
        raise HTTPException(status_code=500, detail="AI Advisor services not initialized.")

    latest_sim = getattr(request.app.state, "latest_simulation", None)
    latest_flood_zones = getattr(request.app.state, "latest_flood_zones", None) or []

    ward_rankings = ai_advisor.compute_ward_vulnerability_index(
        step_zones_state=latest_flood_zones,
        flood_engine=flood_engine,
    )
    peak_depth = max([w["peak_flood_depth_m"] for w in ward_rankings] + [0.0])
    total_stranded = sum(ic.get("trapped_population", 0) for ic in (latest_sim.get("isolated_clusters", []) if latest_sim else []))
    overall_sev = "Catastrophic" if peak_depth >= 1.20 else ("Severe" if peak_depth >= 0.60 else "Moderate")

    return {
        "status": "success",
        "emergency_broadcasts": ai_advisor.generate_bilingual_emergency_broadcasts(
            overall_severity=overall_sev,
            top_vulnerable_wards=ward_rankings,
            peak_observed_depth=peak_depth,
            total_stranded=total_stranded,
        )
    }
