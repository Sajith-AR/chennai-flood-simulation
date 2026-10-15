from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

router = APIRouter()


class OptimizeAllocationRequest(BaseModel):
    incident_ids: Optional[List[str]] = None
    use_current_incidents: bool = True
    custom_incidents: Optional[List[Dict[str, Any]]] = None


@router.post("/allocation/optimize")
def run_resource_allocation(req: OptimizeAllocationRequest, request: Request):
    allocation_optimizer = getattr(request.app.state, "allocation_optimizer", None)
    if not allocation_optimizer:
        from backend.app.services.allocation_optimizer import AllocationOptimizer
        allocation_optimizer = AllocationOptimizer(
            supply_solver=getattr(request.app.state, "supply_solver", None)
        )
        request.app.state.allocation_optimizer = allocation_optimizer

    incidents = []
    if req.custom_incidents:
        incidents = req.custom_incidents
    else:
        incident_service = getattr(request.app.state, "incident_service", None)
        if not incident_service:
            from backend.app.services.incident_service import IncidentService
            incident_service = IncidentService()
            request.app.state.incident_service = incident_service

        all_inc = incident_service.list_incidents()
        if req.incident_ids:
            incidents = [inc for inc in all_inc if inc["id"] in req.incident_ids]
        else:
            incidents = all_inc

    # Ensure priority scores are attached
    vulnerability_scorer = getattr(request.app.state, "vulnerability_scorer", None)
    if not vulnerability_scorer:
        from backend.app.services.vulnerability_scorer import VulnerabilityScorer
        vulnerability_scorer = VulnerabilityScorer()
        request.app.state.vulnerability_scorer = vulnerability_scorer

    scored_incidents = vulnerability_scorer.score_all_incidents(incidents)

    result = allocation_optimizer.optimize(scored_incidents)
    return {
        "status": "ok",
        "result": result
    }


@router.get("/allocation/warehouses")
def get_depot_inventories(request: Request):
    supply_solver = getattr(request.app.state, "supply_solver", None)
    if supply_solver and getattr(supply_solver, "warehouse_stocks", None):
        warehouses = list(supply_solver.warehouse_stocks.values())
    else:
        warehouses = [
            {"id": "WH-01", "name": "GCC Central Logistics Depot", "location": [13.0827, 80.2707], "available": {"water_litres": 65000, "food_rations": 12000, "medical_kits": 400, "blankets": 2500, "rescue_boats": 12}},
            {"id": "WH-02", "name": "Tambaram Regional Supply Hub", "location": [12.9229, 80.1275], "available": {"water_litres": 50000, "food_rations": 10000, "medical_kits": 300, "blankets": 2000, "rescue_boats": 10}},
            {"id": "WH-03", "name": "Anna Nagar Civil Defense Depot", "location": [13.0850, 80.2100], "available": {"water_litres": 45000, "food_rations": 9000, "medical_kits": 250, "blankets": 1500, "rescue_boats": 8}},
            {"id": "WH-04", "name": "Guindy Industrial Estate Transit Hub", "location": [13.0125, 80.2355], "available": {"water_litres": 40000, "food_rations": 8500, "medical_kits": 220, "blankets": 1200, "rescue_boats": 6}},
            {"id": "WH-05", "name": "Madhavaram Strategic Stockpile", "location": [13.1480, 80.2310], "available": {"water_litres": 35000, "food_rations": 8500, "medical_kits": 230, "blankets": 1300, "rescue_boats": 6}}
        ]
    return {
        "status": "ok",
        "warehouses": warehouses
    }
