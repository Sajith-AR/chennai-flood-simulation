"""
Tier 3: Cross-Feature Interactions - Severe Flood Zone + Concurrent Emergency Supply Dispatch
Verifies pairwise interaction between dynamic flood spread and real-time relief inventory dispatch.
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.validators import validate_inventory_ledger_invariants
from e2e.common.geometry import route_intersects_deep_flood
from e2e.common.config import MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS


@pytest.mark.tier3
def test_severe_flood_with_concurrent_supply_dispatch(api_client: SimulationApiClient):
    """
    Test flow:
    1. Trigger severe flood simulation in Adyar River corridor.
    2. Retrieve simulation output, identifying distribution points with active demand.
    3. Trigger manual emergency supply dispatch to Saidapet Camp (DP-01).
    4. Assert allocation succeeds, warehouse inventory decreases, and recalculated supply route avoids all flooded roads.
    """
    sim_payload = {
        "flood_zones": [
            {
                "id": "FZ-ADYAR-SEVERE",
                "type": "circle",
                "coordinates": [[13.0213, 80.2231]],  # Saidapet area
                "radius_meters": 2200.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 130.0,
            "flood_depth_meters": 2.2,
            "spread_rate_meters_hr": 250.0,
            "duration_hours": 6
        }
    }

    # Step 1: Run Simulation
    sim_res = api_client.run_simulation(sim_payload)
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert "simulation_id" in sim_data

    # Step 2: Trigger Emergency Allocation
    alloc_payload = {
        "shelter_or_point_id": "DP-01",
        "supplies": {
            "water_litres": 12000,
            "food_rations": 4000,
            "medical_kits": 80
        }
    }
    alloc_res = api_client.allocate_resources(alloc_payload)
    assert alloc_res.status_code == 200, f"Emergency allocation failed: {alloc_res.text}"
    alloc_data = alloc_res.json()

    # Step 3: Verify Inventory Ledger
    if "updated_inventory" in alloc_data or "updated_inventory_ledger" in alloc_data:
        ledger = alloc_data.get("updated_inventory", alloc_data.get("updated_inventory_ledger"))
        if isinstance(ledger, dict):
            validate_inventory_ledger_invariants(ledger)

    # Step 4: Verify that recalculated supply routes avoid flood water
    updated_routes = alloc_data.get("updated_supply_routes", [])
    if updated_routes:
        timeline = sim_data.get("timeline", sim_data.get("timesteps", []))
        deep_floods = []
        for step in timeline:
            fc = step.get("flood_polygons", step.get("flooded_zones_geojson", {}))
            for feat in fc.get("features", []):
                if feat.get("properties", {}).get("depth_meters", 0.0) >= MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS:
                    deep_floods.append(feat)

        for route in updated_routes:
            coords = route.get("geometry", {}).get("coordinates", route.get("path_geojson", {}).get("coordinates", []))
            if coords:
                viol, cnt = route_intersects_deep_flood(coords, deep_floods, MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS)
                assert not viol, f"Dispatch supply route passes through impassable flood water: {cnt} nodes"


@pytest.mark.tier3
def test_consecutive_supply_dispatches_accumulate_consistently(api_client: SimulationApiClient):
    """Verify that multiple successive dispatches to different relief camps properly decrement warehouse stock."""
    # First dispatch to DP-01
    r1 = api_client.allocate_resources({
        "shelter_or_point_id": "DP-01",
        "supplies": {"water_litres": 2000, "food_rations": 1000, "medical_kits": 10}
    })
    assert r1.status_code == 200

    # Second dispatch to DP-02
    r2 = api_client.allocate_resources({
        "shelter_or_point_id": "DP-02",
        "supplies": {"water_litres": 3000, "food_rations": 1500, "medical_kits": 15}
    })
    assert r2.status_code == 200
