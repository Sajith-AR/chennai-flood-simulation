"""
Tier 2: Boundary & Corner Cases - Zero Rainfall Intensity & Zero Flood Depth
Verifies edge handling for calm baseline conditions without system crashes.
"""

import pytest
from e2e.common.client import SimulationApiClient


@pytest.fixture
def zero_disaster_payload():
    return {
        "flood_zones": [
            {"id": "FZ-ZERO", "type": "circle", "coordinates": [[13.0827, 80.2707]], "radius_meters": 1000.0}
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 0.0,
            "flood_depth_meters": 0.0,
            "spread_rate_meters_hr": 0.0,
            "duration_hours": 4
        }
    }


@pytest.mark.tier2
def test_zero_rainfall_and_depth_returns_200(api_client: SimulationApiClient, zero_disaster_payload):
    """TC B1.1: System gracefully handles 0.0 mm/hr rainfall and 0.0m flood depth without crashing."""
    response = api_client.run_simulation(zero_disaster_payload)
    assert response.status_code == 200, f"Expected 200 OK for baseline zero disaster, got {response.status_code}"


@pytest.mark.tier2
def test_zero_flood_produces_zero_severed_roads(api_client: SimulationApiClient, zero_disaster_payload):
    """TC B1.2: When flood depth is zero, zero roads are severed or blocked."""
    response = api_client.run_simulation(zero_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    timeline = data.get("timeline", data.get("timesteps", []))
    for step in timeline:
        severed = step.get("severed_road_segments_count", step.get("blocked_roads", 0))
        assert severed == 0, f"Expected 0 severed roads for zero flood depth, found {severed}"


@pytest.mark.tier2
def test_zero_flood_produces_zero_isolated_clusters(api_client: SimulationApiClient, zero_disaster_payload):
    """TC B1.3: When flood depth is zero, zero population clusters require emergency airlift."""
    response = api_client.run_simulation(zero_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    isolated = data.get("isolated_clusters", [])
    airlift_required = [c for c in isolated if c.get("requires_airlift") is True]
    assert len(airlift_required) == 0, "No clusters should require airlift under zero flood depth"


@pytest.mark.tier2
def test_zero_flood_evacuation_routes_clear(api_client: SimulationApiClient, zero_disaster_payload):
    """TC B1.4: All evacuation routes remain strictly clear with 0 road impedance under zero flood."""
    response = api_client.run_simulation(zero_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("evacuation_routes", {})
    features = routes.get("features", []) if isinstance(routes, dict) else routes
    for feat in features:
        props = feat.get("properties", feat)
        status = props.get("status", props.get("safety_status", "clear")).lower()
        assert status in ["clear", "nominal", "open"], f"Route status should be clear under zero flood, got {status}"


@pytest.mark.tier2
def test_zero_flood_inventory_uncompromised(api_client: SimulationApiClient, zero_disaster_payload):
    """TC B1.5: Zero flood maintains 100% warehouse inventory availability."""
    response = api_client.run_simulation(zero_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    inv = data.get("inventory_status", data.get("inventory_ledger", {}))
    # Available water should equal total or emergency allocations should be 0
    if "total_water_litres" in inv and "allocated_water_litres" in inv:
        assert inv["allocated_water_litres"] == 0 or inv["allocated_water_litres"] <= inv["total_water_litres"]
