from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

router = APIRouter()


class RouteOptimizeRequest(BaseModel):
    source_coords: List[float]
    destination_coords: List[float]
    source_name: Optional[str] = "Depot"
    destination_name: Optional[str] = "Disaster Area"
    cargo: Optional[Dict[str, int]] = None
    blocked_nodes: Optional[List[str]] = None
    preferred_mode: Optional[str] = None


@router.post("/routes/optimize")
def optimize_route(req: RouteOptimizeRequest, request: Request):
    road_engine = getattr(request.app.state, "road_engine", None)
    if not road_engine:
        from backend.app.services.road_network import RoadNetworkEngine
        road_engine = RoadNetworkEngine()
        request.app.state.road_engine = road_engine

    from backend.app.services.route_optimizer import RouteOptimizer
    route_optimizer = RouteOptimizer(road_engine)

    result = route_optimizer.optimize_route(
        source_coords=req.source_coords,
        dest_coords=req.destination_coords,
        source_name=req.source_name or "Depot",
        dest_name=req.destination_name or "Disaster Area",
        cargo=req.cargo,
        blocked_nodes=req.blocked_nodes,
        preferred_mode=req.preferred_mode
    )

    return {
        "status": "ok",
        "route": result
    }
