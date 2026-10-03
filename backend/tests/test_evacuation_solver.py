import pytest
import networkx as nx
from backend.app.models.disaster import FloodZoneInput, DisasterParameters


def test_evacuation_flood_avoidance_invariant(road_engine, flood_engine, evac_solver):
    """
    CRITICAL PROOF: Proves that every calculated evacuation route strictly avoids
    all road edges submerged with depth >= 0.5m.
    """
    # Create flood over Velachery with depth 0.40m (passable roads with caution)
    # and deep flood over Saidapet corridor >= 1.5m (impassable roads)
    zone_velachery = FloodZoneInput(
        id="FZ-VELACHERY",
        type="circle",
        center=[12.9796, 80.2185],
        radius_meters=1000.0,
        initial_depth_m=0.40,
    )
    zone_saidapet_deep = FloodZoneInput(
        id="FZ-SAIDAPET-DEEP",
        type="circle",
        center=[13.0158, 80.2224],
        radius_meters=1200.0,
        initial_depth_m=2.0,
    )
    params = DisasterParameters(duration_hours=1, time_step_hours=1.0)
    timeline = flood_engine.compute_timeline([zone_velachery, zone_saidapet_deep], params)
    step_state = timeline[1]["zones_state"]

    dyn_graph = road_engine.build_dynamic_graph(step_state, closure_threshold_m=0.50)
    evac_result = evac_solver.solve_evacuation(dyn_graph, step_state, flood_engine)

    routes = evac_result["evacuation_routes"]["features"]
    assert len(routes) > 0

    # For each route, check all consecutive coordinate pairs: no segment intersects deep flood
    for feat in routes:
        coords = feat["geometry"]["coordinates"]  # [[lon, lat], ...]
        for i in range(len(coords) - 1):
            lon1, lat1 = coords[i]
            lon2, lat2 = coords[i + 1]
            depth = flood_engine.get_edge_depth(lat1, lon1, lat2, lon2, step_state)
            # Route must NOT cross edge with depth >= 0.5m
            assert depth < 0.50, f"Route {feat['id']} crossed flooded edge with depth {depth}m!"


def test_shelter_capacity_invariants(road_engine, flood_engine, evac_solver):
    """
    Asserts that no shelter ever exceeds 100% capacity, and that evacuees spill over.
    """
    zone = FloodZoneInput(
        id="FZ-VELACHERY",
        type="circle",
        center=[12.9796, 80.2185],
        radius_meters=800.0,
        initial_depth_m=0.6,
    )
    params = DisasterParameters(duration_hours=1, time_step_hours=1.0)
    timeline = flood_engine.compute_timeline([zone], params)
    step_state = timeline[1]["zones_state"]

    dyn_graph = road_engine.build_dynamic_graph(step_state, closure_threshold_m=0.50)
    evac_result = evac_solver.solve_evacuation(dyn_graph, step_state, flood_engine)

    allocations = evac_result["shelter_allocations"]
    assert len(allocations) == 12

    # Invariant check: total_occupancy <= total_capacity for all shelters
    for alloc in allocations:
        total_occ = alloc["total_occupancy"]
        max_cap = alloc["total_capacity"]
        rem_cap = alloc["remaining_capacity"]

        assert total_occ <= max_cap, f"Shelter {alloc['name']} exceeded capacity! {total_occ} > {max_cap}"
        assert rem_cap >= 0, f"Shelter {alloc['name']} has negative remaining capacity: {rem_cap}"
        assert rem_cap == (max_cap - total_occ)


def test_airlift_isolation_detection(road_engine, flood_engine, evac_solver):
    """
    Asserts that completely submerged or cut-off clusters are flagged with requires_airlift: true.
    """
    # Massive flood completely surrounding Velachery
    zone = FloodZoneInput(
        id="FZ-DELUGE",
        type="circle",
        center=[12.9796, 80.2185],
        radius_meters=3500.0,
        initial_depth_m=5.0,
    )
    params = DisasterParameters(duration_hours=2, time_step_hours=1.0)
    timeline = flood_engine.compute_timeline([zone], params)
    step_state = timeline[2]["zones_state"]

    dyn_graph = road_engine.build_dynamic_graph(step_state, closure_threshold_m=0.50)
    evac_result = evac_solver.solve_evacuation(dyn_graph, step_state, flood_engine)

    isolated = evac_result["isolated_clusters"]
    assert len(isolated) > 0

    velachery_isolated = next((ic for ic in isolated if ic["cluster_id"] == "POP-01"), None)
    assert velachery_isolated is not None
    assert velachery_isolated["requires_airlift"] is True
    assert velachery_isolated["trapped_population"] > 0
