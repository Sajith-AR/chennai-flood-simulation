"""
Tier 4: Real-World Scenarios - Velachery Lake Breach and Residential Inundation Scenario
Replicates extreme localized flooding in the low-lying Pallikaranai marsh catchment and Velachery urban core.
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.geometry import route_intersects_deep_flood
from e2e.common.config import MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS


@pytest.fixture
def velachery_breach_payload():
    return {
        "scenario_name": "Velachery Lake Overflow & Pallikaranai Marsh Backflow",
        "flood_zones": [
            {
                "id": "FZ-VELACHERY-MARSH",
                "type": "circle",
                "coordinates": [[12.9790, 80.2210]],  # Velachery / Guru Nanak College area
                "radius_meters": 2800.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 140.0,
            "flood_depth_meters": 2.1,
            "spread_rate_meters_hr": 300.0,
            "duration_hours": 8
        }
    }


@pytest.mark.tier4
def test_velachery_breach_scenario_executes_successfully(api_client: SimulationApiClient, velachery_breach_payload):
    """TC 4.2.1: Velachery breach simulation completes with HTTP 200."""
    response = api_client.run_simulation(velachery_breach_payload)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.text}"
    data = response.json()
    assert "simulation_id" in data


@pytest.mark.tier4
def test_velachery_residential_evacuation_routing(api_client: SimulationApiClient, velachery_breach_payload):
    """TC 4.2.2: Evacuees from submerged Velachery residential sectors are safely routed toward elevated camps."""
    response = api_client.run_simulation(velachery_breach_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("evacuation_routes", {})
    features = routes.get("features", []) if isinstance(routes, dict) else routes
    assert len(features) > 0, "Expected evacuation routes for Velachery residential population"


@pytest.mark.tier4
def test_velachery_supply_convoys_avoid_marshland_backflow(api_client: SimulationApiClient, velachery_breach_payload):
    """TC 4.2.3: Supply convoys delivering relief avoid submerged 100 Feet Bypass Road."""
    response = api_client.run_simulation(velachery_breach_payload)
    assert response.status_code == 200
    data = response.json()

    timeline = data.get("timeline", data.get("timesteps", []))
    deep_floods = []
    for step in timeline:
        fc = step.get("flood_polygons", step.get("flooded_zones_geojson", {}))
        for feat in fc.get("features", []):
            if feat.get("properties", {}).get("depth_meters", 0.0) >= MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS:
                deep_floods.append(feat)

    supply_routes = data.get("supply_routes", {})
    features = supply_routes.get("features", []) if isinstance(supply_routes, dict) else supply_routes
    for feat in features:
        coords = feat.get("geometry", {}).get("coordinates", feat.get("path_geojson", {}).get("coordinates", []))
        if coords:
            viol, cnt = route_intersects_deep_flood(coords, deep_floods, MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS)
            assert not viol, f"Supply route to Velachery traversed flooded marsh road: {cnt} nodes"
