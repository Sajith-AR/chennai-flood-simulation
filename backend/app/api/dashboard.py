from fastapi import APIRouter, Request
from typing import Dict, Any

router = APIRouter()


@router.get("/dashboard/stats")
def get_dashboard_stats(request: Request):
    incident_service = getattr(request.app.state, "incident_service", None)
    if not incident_service:
        from backend.app.services.incident_service import IncidentService
        incident_service = IncidentService()
        request.app.state.incident_service = incident_service

    supply_solver = getattr(request.app.state, "supply_solver", None)
    evac_solver = getattr(request.app.state, "evac_solver", None)

    incidents = incident_service.list_incidents()
    critical_count = sum(1 for inc in incidents if inc.get("urgency") == "critical")
    total_affected = sum(inc.get("affected_population", 0) for inc in incidents)

    # Warehouse reserves
    total_water = 235000
    total_food = 48000
    total_meds = 1400
    if supply_solver and getattr(supply_solver, "warehouse_stocks", None):
        stocks = supply_solver.warehouse_stocks
        total_water = sum(w.get("available", {}).get("water_litres", 0) for w in stocks.values())
        total_food = sum(w.get("available", {}).get("food_rations", 0) for w in stocks.values())
        total_meds = sum(w.get("available", {}).get("medical_kits", 0) for w in stocks.values())

    shelters_count = len(evac_solver.shelters) if evac_solver and getattr(evac_solver, "shelters", None) else 12

    return {
        "status": "ok",
        "incidents_count": len(incidents),
        "critical_incidents_count": critical_count,
        "total_affected_population": total_affected,
        "safe_shelters_count": shelters_count,
        "active_depots_count": 5,
        "available_inventory": {
            "water_litres": total_water,
            "food_rations": total_food,
            "medical_kits": total_meds
        },
        "road_network": {
            "total_nodes": 79,
            "total_edges": 222,
            "severed_roads_count": 14,
            "active_routes_count": 28
        },
        "active_field_teams": 4,
        "system_status": "OPERATIONAL",
        "defcon_level": "DEFCON 2 (SEVERE FLOOD WARNING)"
    }
