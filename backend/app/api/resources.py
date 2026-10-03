from fastapi import APIRouter, Request, HTTPException
from backend.app.models.logistics import (
    AllocationRequest,
    AllocationResponse,
    AllocationTransfer,
    SupplyStock,
)

router = APIRouter()


@router.post("/resources/allocate")
def allocate_resources(req: AllocationRequest, request: Request):
    with request.app.state.simulation_lock:
        return _allocate_resources(req, request)


def _allocate_resources(req: AllocationRequest, request: Request):
    supply_solver = getattr(request.app.state, "supply_solver", None)
    road_engine = getattr(request.app.state, "road_engine", None)

    if not supply_solver or not road_engine:
        raise HTTPException(status_code=500, detail="Logistics solver services are not initialized.")

    transfers = req.transfers or []

    # If single shelter_or_point_id + supplies provided
    if req.shelter_or_point_id and req.supplies:
        dest_id = req.shelter_or_point_id
        if dest_id not in supply_solver.point_demands:
            raise HTTPException(
                status_code=400,
                detail=f"Target distribution point / shelter '{dest_id}' was not found."
            )

        # Find a warehouse with sufficient available stock
        needed_water = req.supplies.water_litres
        needed_food = req.supplies.food_rations
        needed_med = req.supplies.medical_kits

        selected_wh_id = None
        for wid, w in supply_solver.warehouse_stocks.items():
            if req.warehouse_id and wid != req.warehouse_id:
                continue
            avail = w["available"]
            if (avail["water_litres"] >= needed_water and
                avail["food_rations"] >= needed_food and
                avail["medical_kits"] >= needed_med):
                selected_wh_id = wid
                break

        if not selected_wh_id:
            # Aggregate available supplies to produce helpful error
            tot_avail_w = sum(w["available"]["water_litres"] for w in supply_solver.warehouse_stocks.values())
            tot_avail_f = sum(w["available"]["food_rations"] for w in supply_solver.warehouse_stocks.values())
            tot_avail_m = sum(w["available"]["medical_kits"] for w in supply_solver.warehouse_stocks.values())
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient inventory across warehouses. "
                       f"Requested: {needed_water}L water, {needed_food} rations, {needed_med} kits. "
                       f"Available in any single warehouse: max available water {tot_avail_w}L."
            )

        transfers.append(
            AllocationTransfer(
                source_warehouse_id=selected_wh_id,
                destination_point_id=dest_id,
                supplies=req.supplies
            )
        )

    if not transfers:
        raise HTTPException(
            status_code=400,
            detail="No valid resource transfers specified in request payload."
        )

    active_zones = getattr(request.app.state, "latest_flood_zones", None)
    try:
        alloc_result = supply_solver.allocate_supplies(transfers, step_zones_state=active_zones)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Verify zero flood intersection guarantee for allocated routes
    verified_truck_routes = []
    verified_rescue_routes = list(alloc_result.get("updated_rescue_routes", []))
    for f in alloc_result.get("updated_supply_routes", []):
        mode = f.get("properties", {}).get("transport_mode", "truck")
        coords = f.get("geometry", {}).get("coordinates", [])
        latlon_coords = [[c[1], c[0]] for c in coords]
        if mode == "truck" and supply_solver.is_route_safe(latlon_coords, active_zones or [], depth_threshold_m=0.30):
            verified_truck_routes.append(f)
        else:
            f["properties"]["transport_mode"] = "helicopter"
            f["properties"]["vehicle_type"] = "Relief Helicopter (Airlift Reroute)"
            f["properties"]["wading_depth_clearance_m"] = 99.0
            verified_rescue_routes.append(f)

    return {
        "success": True,
        "simulation_id": req.simulation_id,
        "message": alloc_result["message"],
        "updated_inventory": alloc_result["updated_inventory"],
        "allocation_details": {
            "transfers_executed": len(transfers),
            "transfers": [t.model_dump() for t in transfers],
        },
        "updated_supply_routes": verified_truck_routes,
        "updated_rescue_routes": verified_rescue_routes,
        "ledger": alloc_result["ledger"],
        "warnings": alloc_result["warnings"],
    }


@router.get("/resources/advisory")
@router.post("/resources/advisory")
def get_resources_advisory(request: Request):
    """
    Returns logistics-focused AI Decision Support advisory:
    Warehouse depletion rates, high-risk ward supply deficits, and multimodal airlift assignments.
    """
    ai_advisor = getattr(request.app.state, "ai_advisor", None)
    flood_engine = getattr(request.app.state, "flood_engine", None)
    supply_solver = getattr(request.app.state, "supply_solver", None)

    if not ai_advisor or not flood_engine or not supply_solver:
        raise HTTPException(status_code=500, detail="Logistics advisory services not initialized.")

    latest_sim = getattr(request.app.state, "latest_simulation", None)
    latest_flood_zones = getattr(request.app.state, "latest_flood_zones", None) or []
    dynamic_graph = getattr(request.app.state, "latest_dynamic_graph", None)

    advisory = ai_advisor.generate_comprehensive_advisory(
        step_zones_state=latest_flood_zones,
        dynamic_graph=dynamic_graph,
        isolated_clusters=latest_sim.get("isolated_clusters", []) if latest_sim else [],
        shelter_allocations=latest_sim.get("shelter_allocations", []) if latest_sim else [],
        flood_engine=flood_engine,
    )

    return {
        "status": "success",
        "inventory_ledger": supply_solver.get_ledger_snapshot(),
        "logistics_advisory": advisory,
    }
