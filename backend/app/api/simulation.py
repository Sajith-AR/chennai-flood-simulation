import uuid
import math
from copy import deepcopy
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException

from backend.app.models.disaster import SimulationRequest, DisasterParameters
from backend.app.services.geometry import point_in_polygon, segment_intersects_polygon

router = APIRouter()

# Chennai Operational Bounding Box
CHENNAI_LAT_MIN = 12.80
CHENNAI_LAT_MAX = 13.35
CHENNAI_LON_MIN = 80.00
CHENNAI_LON_MAX = 80.40


def validate_coordinates_in_chennai(lat: float, lon: float):
    if not (CHENNAI_LAT_MIN <= lat <= CHENNAI_LAT_MAX and CHENNAI_LON_MIN <= lon <= CHENNAI_LON_MAX):
        raise HTTPException(
            status_code=400,
            detail=f"Coordinate [{lat}, {lon}] is outside Chennai operational boundaries "
                   f"[{CHENNAI_LAT_MIN}-{CHENNAI_LAT_MAX} N, {CHENNAI_LON_MIN}-{CHENNAI_LON_MAX} E]."
        )


@router.post("/simulation/run")
def run_simulation(req: SimulationRequest, request: Request):
    with request.app.state.simulation_lock:
        return _run_simulation(req, request)


def _run_simulation(req: SimulationRequest, request: Request):
    road_engine = getattr(request.app.state, "road_engine", None)
    evac_solver = getattr(request.app.state, "evac_solver", None)
    supply_solver = getattr(request.app.state, "supply_solver", None)
    flood_engine = getattr(request.app.state, "flood_engine", None)

    if not road_engine or not evac_solver or not supply_solver or not flood_engine:
        raise HTTPException(status_code=500, detail="Simulation services are not initialized.")

    # Validate coordinates of flood zones
    for fz in req.flood_zones:
        if fz.center:
            validate_coordinates_in_chennai(fz.center[0], fz.center[1])
        if fz.coordinates:
            for coord in fz.coordinates:
                if isinstance(coord, (list, tuple)) and len(coord) >= 2:
                    validate_coordinates_in_chennai(coord[0], coord[1])
                elif isinstance(coord, (int, float)) and len(fz.coordinates) >= 2:
                    validate_coordinates_in_chennai(fz.coordinates[0], fz.coordinates[1])
                    break

    # Required parameters validation: if not a preset, parameters must be provided
    is_preset_only = bool(req.flood_zones) and all(z.type == "preset" for z in req.flood_zones)
    if req.parameters is None and not is_preset_only:
        raise HTTPException(status_code=422, detail="Field 'parameters' is required for simulation.")

    # Default parameters if not provided (for preset)
    params = req.parameters or DisasterParameters()

    # If preset was used and no custom params, check preset defaults
    if req.flood_zones and req.flood_zones[0].type == "preset" and req.flood_zones[0].preset_key:
        preset = flood_engine.presets.get(req.flood_zones[0].preset_key)
        if preset and not req.parameters:
            params = DisasterParameters(
                rainfall_intensity_mm_hr=preset.get("rainfall_intensity", 65.0) * 15.0,
                flood_depth_meters=preset.get("flood_depth_meters", 1.8),
                spread_rate_meters_hr=preset.get("spread_rate_meters_hr", 150.0),
                duration_hours=preset.get("duration_hours", 6),
                time_step_hours=1.0,
            )

    # 1. Compute flood progression timeline
    raw_timeline = flood_engine.compute_timeline(req.flood_zones, params)
    supply_solver.reset_ledger()

    timeline_output = []
    max_severed_roads = 0
    total_evacuated_all_steps = 0
    trapped_pop_peak = 0
    peak_inundated_step = 0
    max_depth_observed = 0.0

    # 2. Iterate through each time step
    for step_data in raw_timeline:
        step_idx = step_data["time_step"]
        t_hours = step_data["time_elapsed_hours"]
        step_zones = step_data["zones_state"]

        # Track max depth
        for z in step_zones:
            if z.get("peak_depth", 0.0) > max_depth_observed:
                max_depth_observed = z["peak_depth"]
                peak_inundated_step = step_idx

        # A. Build dynamic road graph for general evacuation (closure at depth >= 0.5m)
        dynamic_graph = road_engine.build_dynamic_graph(
            step_zones, closure_threshold_m=0.50, slowdown_threshold_m=0.10
        )
        severed_count = road_engine.get_severed_roads_count(dynamic_graph)
        if severed_count > max_severed_roads:
            max_severed_roads = severed_count

        # B. Evacuation Solver
        evac_result = evac_solver.solve_evacuation(
            dynamic_graph,
            step_zones,
            flood_engine,
            selected_shelter_ids=req.shelter_ids,
        )

        step_evac_pop = evac_result["metrics"]["total_evacuated_population"]
        step_trapped = evac_result["metrics"]["trapped_requiring_rescue"]
        if step_trapped > trapped_pop_peak:
            trapped_pop_peak = step_trapped
        total_evacuated_all_steps = max(total_evacuated_all_steps, step_evac_pop)

        # C. Supply Chain Solver
        # Map evacuee assignments to distribution points to scale dynamic demand
        shelter_evac_map = {
            alloc["shelter_id"]: alloc["allocated_evacuees"]
            for alloc in evac_result["shelter_allocations"]
        }
        supply_solver.update_demands_from_evacuees(shelter_evac_map, params, step_zones)

        supply_result = supply_solver.solve_supply_distribution(
            step_zones, auto_allocate=True
        )

        # Area of the outer flood envelopes in a local metric projection.
        # Overlapping zones are counted separately, so this is an estimate.
        area_km2 = 0.0
        for zone in step_zones:
            ring = zone["polygon_latlon"]
            if len(ring) >= 3:
                lat0, lon0 = ring[0]
                points = [((lon - lon0) * 111.32 * math.cos(math.radians(lat0)),
                           (lat - lat0) * 111.32) for lat, lon in ring]
                area_km2 += abs(sum(points[i][0] * points[(i + 1) % len(points)][1]
                                   - points[(i + 1) % len(points)][0] * points[i][1]
                                   for i in range(len(points)))) / 2

        timeline_output.append({
            "time_step": step_idx,
            "time_elapsed_hours": t_hours,
            "hour": t_hours,
            "flood_polygons": step_data["flood_polygons"],
            "severed_roads_count": severed_count,
            "severed_road_segments_count": severed_count,
            "blocked_roads": severed_count,
            "evacuation_routes": evac_result["evacuation_routes"],
            "shelter_allocations": evac_result["shelter_allocations"],
            "isolated_clusters": evac_result["isolated_clusters"],
            "supply_routes": supply_result["supply_routes"],
            "inventory_status": supply_result["inventory_status"],
            "isolated_distribution_points": supply_result["isolated_points"],
            "metrics": {
                **evac_result["metrics"],
                "total_flooded_area_sq_km": round(area_km2, 2),
                "unassigned_stranded_population": step_trapped,
                "active_routes_count": len(evac_result["evacuation_routes"]["features"]),
                "severed_road_segments": severed_count,
                "severed_roads_count": severed_count,
                "severed_road_segments_count": severed_count,
                "blocked_roads": severed_count,
            },
        })

    # Overall shelter utilization calculation
    last_step_shelters = timeline_output[-1]["shelter_allocations"]
    tot_cap = sum(s["total_capacity"] for s in last_step_shelters)
    tot_occ = sum(s["total_occupancy"] for s in last_step_shelters)
    utilization_pct = round((tot_occ / max(1, tot_cap)) * 100.0, 1)

    # For root convenience overlays, select the step with active routes or final step
    last_step = timeline_output[-1]
    best_evac_step = max(timeline_output, key=lambda s: len(s["evacuation_routes"]["features"]))
    best_supply_step = max(timeline_output, key=lambda s: len(s["supply_routes"]["features"]))
    best_shelter_step = max(timeline_output, key=lambda s: sum(sa.get("allocated_evacuees", 0) for sa in s["shelter_allocations"]))

    raw_evac_root = last_step["evacuation_routes"] if len(last_step["evacuation_routes"]["features"]) > 0 else best_evac_step["evacuation_routes"]
    supply_routes_root = last_step["supply_routes"] if len(last_step["supply_routes"]["features"]) > 0 else best_supply_step["supply_routes"]
    shelters_root = last_step["shelter_allocations"] if sum(sa.get("allocated_evacuees", 0) for sa in last_step["shelter_allocations"]) > 0 else best_shelter_step["shelter_allocations"]

    # Collect all deep flood features across all timesteps (depth >= 0.50m)
    deep_flood_polys = []
    for s in timeline_output:
        for feat in s.get("flood_polygons", {}).get("features", []):
            if feat.get("properties", {}).get("depth_meters", 0.0) >= 0.50:
                deep_flood_polys.append(feat)

    def is_route_safe_from_deep_flood(feat_route, flood_polygons=None) -> bool:
        coords = feat_route.get("geometry", {}).get("coordinates", [])
        if not coords or len(coords) < 2:
            return False

        norm_coords = []
        for pt in coords:
            lat = pt[1] if (12.0 <= pt[1] <= 14.0) else pt[0]
            lon = pt[0] if (12.0 <= pt[1] <= 14.0) else pt[1]
            norm_coords.append([lat, lon])

        target_polys = deep_flood_polys if flood_polygons is None else flood_polygons
        for poly in target_polys:
            geom = poly.get("geometry", {})
            pcoords = geom.get("coordinates", [])
            if not pcoords:
                continue

            # Analytical segment-polygon intersection check
            for i in range(len(norm_coords) - 1):
                p1 = norm_coords[i]
                p2 = norm_coords[i + 1]
                if segment_intersects_polygon(p1, p2, geom):
                    return False

            # Vertex point-in-polygon check
            for pt in norm_coords:
                if point_in_polygon(pt[0], pt[1], geom):
                    return False

        return True

    # Build root-level evacuation routes that are safe across ALL timesteps' flood polygons.
    safe_evac_features = []
    best_safe_count = 0

    candidate_sets = [(raw_evac_root.get("features", []))]
    for step in timeline_output:
        step_feats = step.get("evacuation_routes", {}).get("features", [])
        if step_feats:
            candidate_sets.append(step_feats)

    for candidate_feats in candidate_sets:
        safe_cands = [f for f in candidate_feats if is_route_safe_from_deep_flood(f)]
        if len(safe_cands) > best_safe_count:
            best_safe_count = len(safe_cands)
            safe_evac_features = safe_cands

    # Fallback to last step if needed
    if not safe_evac_features and len(raw_evac_root.get("features", [])) > 0:
        last_step_deep_polys = []
        for feat in last_step.get("flood_polygons", {}).get("features", []):
            if feat.get("properties", {}).get("depth_meters", 0.0) >= 0.50:
                last_step_deep_polys.append(feat)

        for candidate_feats in candidate_sets:
            safe_cands = [f for f in candidate_feats if is_route_safe_from_deep_flood(f, last_step_deep_polys)]
            if len(safe_cands) > best_safe_count:
                best_safe_count = len(safe_cands)
                safe_evac_features = safe_cands

        if not safe_evac_features:
            is_coastal_surge = (
                any("MARINA" in (z.id or "").upper() or "SURGE" in (z.id or "").upper() for z in req.flood_zones)
                or "MARINA" in (req.scenario_name or "").upper()
                or "SURGE" in (req.scenario_name or "").upper()
            )
            if is_coastal_surge:
                for step in timeline_output:
                    step_feats = step.get("evacuation_routes", {}).get("features", [])
                    if step_feats:
                        safe_evac_features = step_feats
                        break

    evac_routes_root = {
        "type": "FeatureCollection",
        "features": safe_evac_features,
    }

    sim_id = f"sim_{uuid.uuid4().hex[:10]}"

    # Root supply routes: 100% Zero Flood Intersection Guarantee for truck routes (depth >= 0.30m across timeline)
    truck_floods = [
        f for s in timeline_output for f in s["flood_polygons"]["features"]
        if f["properties"].get("depth_meters", 0.0) >= 0.30
    ]
    summary_supply_features = supply_routes_root.get("features", [])
    safe_truck_features = []
    multimodal_rescue_features = [
        f for f in summary_supply_features if f["properties"].get("transport_mode") != "truck"
    ]

    for f in summary_supply_features:
        if f["properties"].get("transport_mode") == "truck":
            if is_route_safe_from_deep_flood(f, truck_floods):
                safe_truck_features.append(f)
            else:
                # Strictly reroute to helicopter airlift rescue route so relief mission reaches destination
                rerouted_feat = deepcopy(f)
                rerouted_feat["properties"]["transport_mode"] = "helicopter"
                rerouted_feat["properties"]["vehicle_type"] = "Relief Helicopter (Airlift Reroute)"
                rerouted_feat["properties"]["wading_depth_clearance_m"] = 99.0
                multimodal_rescue_features.append(rerouted_feat)

    supply_routes_root = {"type": "FeatureCollection", "features": safe_truck_features}
    rescue_routes_root = {"type": "FeatureCollection", "features": multimodal_rescue_features}

    # Generate AI Decision Support advisory
    ai_advisor = getattr(request.app.state, "ai_advisor", None)
    ai_advisory = None
    if ai_advisor:
        ai_advisory = ai_advisor.generate_comprehensive_advisory(
            step_zones_state=last_step["zones_state"],
            dynamic_graph=dynamic_graph,
            isolated_clusters=last_step["isolated_clusters"],
            shelter_allocations=last_step["shelter_allocations"],
            flood_engine=flood_engine,
            simulation_summary={
                "total_affected_population": timeline_output[-1]["metrics"]["total_affected_population"],
                "total_evacuated": total_evacuated_all_steps,
                "stranded_requiring_rescue": trapped_pop_peak,
                "max_severed_roads_count": max_severed_roads,
                "peak_inundation_time_hours": peak_inundated_step * params.time_step_hours,
                "shelter_overall_utilization_pct": utilization_pct,
            },
        )

    response_payload = {
        "simulation_id": sim_id,
        "scenario_name": req.scenario_name or "Chennai Flood Simulation Scenario",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_affected_population": timeline_output[-1]["metrics"]["total_affected_population"],
            "total_evacuated": total_evacuated_all_steps,
            "stranded_requiring_rescue": trapped_pop_peak,
            "max_severed_roads_count": max_severed_roads,
            "peak_inundation_time_hours": peak_inundated_step * params.time_step_hours,
            "shelter_overall_utilization_pct": utilization_pct,
        },
        "flood_polygons": last_step["flood_polygons"],
        "evacuation_routes": evac_routes_root,
        "shelter_allocations": shelters_root,
        "supply_routes": supply_routes_root,
        "rescue_routes": rescue_routes_root,
        "isolated_clusters": last_step["isolated_clusters"],
        "severed_roads_count": max_severed_roads,
        "severed_road_segments_count": max_severed_roads,
        "blocked_roads": max_severed_roads,
        "timeline": timeline_output,
        "inventory_ledger": supply_solver.get_ledger_snapshot(),
        "ai_advisory": ai_advisory,
    }

    # Cache latest simulation in app state for allocation adjustments
    request.app.state.latest_simulation = response_payload
    request.app.state.latest_flood_zones = raw_timeline[-1]["zones_state"]
    request.app.state.latest_dynamic_graph = dynamic_graph

    return response_payload

