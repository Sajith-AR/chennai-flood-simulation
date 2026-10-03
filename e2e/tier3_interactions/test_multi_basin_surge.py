"""
Tier 3: Cross-Feature Interactions - Simultaneous Multi-Ward Inundation (Adyar + Cooum Rivers)
Verifies city-wide dual-river basin flash flooding severing major cross-town arterial bridges.
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.geometry import route_intersects_deep_flood
from e2e.common.config import MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS


@pytest.fixture
def dual_river_basin_payload():
    """Simultaneous surge along both Chennai river systems: Adyar River and Cooum River."""
    return {
        "flood_zones": [
            {
                "id": "FZ-ADYAR-BASIN",
                "type": "circle",
                "coordinates": [[13.0250, 80.2150]],  # Saidapet / Jafferkhanpet (Adyar River)
                "radius_meters": 2500.0
            },
            {
                "id": "FZ-COOUM-BASIN",
                "type": "circle",
                "coordinates": [[13.0750, 80.2300]],  # Chetpet / Aminjikarai (Cooum River)
                "radius_meters": 2200.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 140.0,
            "flood_depth_meters": 2.0,
            "spread_rate_meters_hr": 250.0,
            "duration_hours": 10
        }
    }


@pytest.mark.tier3
def test_dual_basin_flood_executes_successfully(api_client: SimulationApiClient, dual_river_basin_payload):
    """TC 3.4.1: Simultaneous Adyar + Cooum flood computes successfully with HTTP 200."""
    response = api_client.run_simulation(dual_river_basin_payload)
    assert response.status_code == 200, f"Expected 200 for dual-river flood, got {response.status_code}"
    data = response.json()
    assert "simulation_id" in data


@pytest.mark.tier3
def test_dual_basin_severs_both_river_corridors(api_client: SimulationApiClient, dual_river_basin_payload):
    """TC 3.4.2: Severed road count reflects bridge closures across both river corridors."""
    response = api_client.run_simulation(dual_river_basin_payload)
    assert response.status_code == 200
    data = response.json()

    timeline = data.get("timeline", data.get("timesteps", []))
    final_step = timeline[-1]
    severed = final_step.get("severed_road_segments_count", final_step.get("blocked_roads", 0))

    assert severed >= 15, f"Expected >= 15 severed road segments across both river basins, got {severed}"


@pytest.mark.tier3
def test_dual_basin_routes_avoid_both_flood_epicenters(api_client: SimulationApiClient, dual_river_basin_payload):
    """TC 3.4.3: Logistics supply routes navigate around both Adyar and Cooum flood polygons."""
    response = api_client.run_simulation(dual_river_basin_payload)
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
            assert not viol, f"Supply route intersects dual-river flood polygon: {cnt} nodes"
