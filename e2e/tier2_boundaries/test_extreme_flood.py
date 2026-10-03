"""
Tier 2: Boundary & Corner Cases - Extreme Catastrophic Flood Depth (3.0m) and Max Radius (5000m)
Verifies resilience against extreme meteorological stress without numerical instability or crashes.
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.validators import validate_shelter_capacity_invariants
from e2e.common.geometry import route_intersects_deep_flood
from e2e.common.config import MAX_PASSABLE_DEPTH_EVACUATION_PEDESTRIAN_METERS


@pytest.fixture
def extreme_catastrophic_payload():
    return {
        "flood_zones": [
            {
                "id": "FZ-CATASTROPHIC",
                "type": "circle",
                "coordinates": [[13.0158, 80.2224]],  # Saidapet Adyar basin epicenter
                "radius_meters": 5000.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 200.0,
            "flood_depth_meters": 3.0,
            "spread_rate_meters_hr": 500.0,
            "duration_hours": 12
        }
    }


@pytest.mark.tier2
def test_extreme_flood_simulation_returns_200(api_client: SimulationApiClient, extreme_catastrophic_payload):
    """TC B2.1: Simulation survives extreme 3.0m depth and 5000m radius without 500 server crash."""
    response = api_client.run_simulation(extreme_catastrophic_payload)
    assert response.status_code == 200, f"Expected 200 for catastrophic scenario, got {response.status_code}: {response.text}"


@pytest.mark.tier2
def test_extreme_flood_marks_severity_catastrophic(api_client: SimulationApiClient, extreme_catastrophic_payload):
    """TC B2.2: Extreme depth >= 2.0m is categorized as catastrophic or critical."""
    response = api_client.run_simulation(extreme_catastrophic_payload)
    assert response.status_code == 200
    data = response.json()

    timeline = data.get("timeline", data.get("timesteps", []))
    severities = []
    for step in timeline:
        fc = step.get("flood_polygons", step.get("flooded_zones_geojson", {}))
        for feat in fc.get("features", []):
            sev = feat.get("properties", {}).get("severity", feat.get("properties", {}).get("severity_level"))
            if sev:
                severities.append(str(sev).lower())

    assert any(s in ["catastrophic", "critical", "severe"] for s in severities), (
        f"Expected catastrophic or critical severity flag in {severities}"
    )


@pytest.mark.tier2
def test_extreme_flood_severs_arterial_network(api_client: SimulationApiClient, extreme_catastrophic_payload):
    """TC B2.3: 3.0m flood severs significant number of road segments."""
    response = api_client.run_simulation(extreme_catastrophic_payload)
    assert response.status_code == 200
    data = response.json()

    timeline = data.get("timeline", data.get("timesteps", []))
    final_step = timeline[-1]
    severed_count = final_step.get("severed_road_segments_count", final_step.get("blocked_roads", 0))

    # In a 5km radius around Saidapet, dozens of road segments cross the Adyar basin
    assert severed_count >= 10, f"Expected >= 10 severed road segments under 5km flood, found {severed_count}"


@pytest.mark.tier2
def test_extreme_flood_no_nan_or_infinite_metrics(api_client: SimulationApiClient, extreme_catastrophic_payload):
    """TC B2.4: Numerical outputs contain no NaN, null, or floating-point overflow values."""
    response = api_client.run_simulation(extreme_catastrophic_payload)
    assert response.status_code == 200
    text = response.text

    assert "NaN" not in text, "Response contains illegal NaN values"
    assert "Infinity" not in text, "Response contains illegal Infinity values"


@pytest.mark.tier2
def test_extreme_flood_evacuation_routes_remain_safe(api_client: SimulationApiClient, extreme_catastrophic_payload):
    """TC B2.5: Active evacuation routes detour around the 5000m catastrophic flood zone."""
    response = api_client.run_simulation(extreme_catastrophic_payload)
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
            has_viol, count = route_intersects_deep_flood(
                coords, deep_floods, MAX_PASSABLE_DEPTH_EVACUATION_PEDESTRIAN_METERS
            )
            assert not has_viol, f"Evacuation route traversed catastrophic flood water: {count} violations"
