"""
Tier 4: Real-World Scenarios - 2015 Chennai Adyar River Catastrophic Flood Benchmark
Emulates the historic December 2015 Chembarambakkam reservoir surplus outflow into the Adyar River basin.
Historical Reference: 29,000 cusecs release, 2.5m+ flood depth across Saidapet, Kotturpuram, and Jafferkhanpet.
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.validators import (
    validate_inventory_ledger_invariants,
    validate_shelter_capacity_invariants,
    validate_sphere_demand_standards
)
from e2e.common.geometry import route_intersects_deep_flood
from e2e.common.config import MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS, MAX_PASSABLE_DEPTH_EVACUATION_PEDESTRIAN_METERS


@pytest.fixture
def adyar_2015_benchmark_payload():
    return {
        "scenario_name": "2015 Chennai Flood - Chembarambakkam Outflow Benchmark",
        "flood_zones": [
            {
                "id": "FZ-2015-ADYAR-RIVER",
                "type": "circle",
                "coordinates": [[13.0158, 80.2224]],  # Maraimalai Adigal Bridge / Saidapet
                "radius_meters": 3500.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 160.0,
            "flood_depth_meters": 2.8,
            "spread_rate_meters_hr": 350.0,
            "duration_hours": 12
        }
    }


@pytest.mark.tier4
def test_2015_adyar_benchmark_computes_successfully(api_client: SimulationApiClient, adyar_2015_benchmark_payload):
    """TC 4.1.1: 2015 Benchmark scenario executes with HTTP 200 OK and completes in full."""
    response = api_client.run_simulation(adyar_2015_benchmark_payload)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.text}"
    data = response.json()
    assert "simulation_id" in data


@pytest.mark.tier4
def test_2015_adyar_severed_road_corridors(api_client: SimulationApiClient, adyar_2015_benchmark_payload):
    """TC 4.1.2: Adyar river bridges (Saidapet, Kotturpuram) are correctly detected as severed."""
    response = api_client.run_simulation(adyar_2015_benchmark_payload)
    assert response.status_code == 200
    data = response.json()

    timeline = data.get("timeline", data.get("timesteps", []))
    assert len(timeline) >= 12, "Expected 12-hour simulation timeline"

    # Peak hour (t=12) must show major bridge severing
    final_step = timeline[-1]
    severed = final_step.get("severed_road_segments_count", final_step.get("blocked_roads", 0))
    assert severed >= 20, f"Catastrophic Adyar overflow should sever >= 20 arterial road segments, got {severed}"


@pytest.mark.tier4
def test_2015_adyar_evacuation_routes_avoid_submerged_riverbanks(api_client: SimulationApiClient, adyar_2015_benchmark_payload):
    """TC 4.1.3: Evacuees are routed strictly away from submerged riverbanks to safe elevated shelters."""
    response = api_client.run_simulation(adyar_2015_benchmark_payload)
    assert response.status_code == 200
    data = response.json()

    timeline = data.get("timeline", data.get("timesteps", []))
    deep_floods = []
    for step in timeline:
        fc = step.get("flood_polygons", step.get("flooded_zones_geojson", {}))
        for feat in fc.get("features", []):
            if feat.get("properties", {}).get("depth_meters", 0.0) >= MAX_PASSABLE_DEPTH_EVACUATION_PEDESTRIAN_METERS:
                deep_floods.append(feat)

    routes = data.get("evacuation_routes", {})
    features = routes.get("features", []) if isinstance(routes, dict) else routes
    for feat in features:
        coords = feat.get("geometry", {}).get("coordinates", feat.get("path_geojson", {}).get("coordinates", []))
        if coords:
            viol, cnt = route_intersects_deep_flood(coords, deep_floods, MAX_PASSABLE_DEPTH_EVACUATION_PEDESTRIAN_METERS)
            assert not viol, f"Evacuation route in 2015 benchmark intersects submerged Adyar basin: {cnt} nodes"


@pytest.mark.tier4
def test_2015_adyar_relief_logistics_and_inventory_conservation(api_client: SimulationApiClient, adyar_2015_benchmark_payload):
    """TC 4.1.4: Multi-depot supply logistics dispatches emergency relief while conserving citywide stock."""
    response = api_client.run_simulation(adyar_2015_benchmark_payload)
    assert response.status_code == 200
    data = response.json()

    inventory = data.get("inventory_status", data.get("inventory_ledger", {}))
    validate_inventory_ledger_invariants(inventory)

    allocs = data.get("shelter_allocations", [])
    validate_shelter_capacity_invariants(allocs)
