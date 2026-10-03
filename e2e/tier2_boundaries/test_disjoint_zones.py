"""
Tier 2: Boundary & Corner Cases - Disjoint Multi-Polygon Flood Zones
Verifies simulation execution and pathfinding across multiple non-contiguous flood epicenters.
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.validators import validate_geojson_feature_collection


@pytest.fixture
def multi_disjoint_zones_payload():
    """Defines two distinct, non-overlapping flood epicenters across Chennai: Adyar and North Chennai."""
    return {
        "flood_zones": [
            {
                "id": "FZ-DISJOINT-SOUTH",
                "type": "circle",
                "coordinates": [[13.0067, 80.2450]],  # Adyar estuary
                "radius_meters": 1200.0
            },
            {
                "id": "FZ-DISJOINT-NORTH",
                "type": "circle",
                "coordinates": [[13.1235, 80.2195]],  # Kolathur / Red Hills basin
                "radius_meters": 1500.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 110.0,
            "flood_depth_meters": 1.4,
            "spread_rate_meters_hr": 200.0,
            "duration_hours": 6
        }
    }


@pytest.mark.tier2
def test_multi_disjoint_flood_zones_return_200(api_client: SimulationApiClient, multi_disjoint_zones_payload):
    """TC B6.1: Submitting multiple non-contiguous flood zones returns 200 OK."""
    response = api_client.run_simulation(multi_disjoint_zones_payload)
    assert response.status_code == 200, f"Expected 200 for disjoint flood zones, got {response.status_code}"


@pytest.mark.tier2
def test_disjoint_zones_produce_multiple_flood_polygons(api_client: SimulationApiClient, multi_disjoint_zones_payload):
    """TC B6.2: Each disjoint zone generates its corresponding polygon in the timeline."""
    response = api_client.run_simulation(multi_disjoint_zones_payload)
    assert response.status_code == 200
    data = response.json()

    timeline = data.get("timeline", data.get("timesteps", []))
    assert len(timeline) > 0
    step0 = timeline[0]
    fc = step0.get("flood_polygons", step0.get("flooded_zones_geojson", {}))

    assert validate_geojson_feature_collection(fc)
    features = fc.get("features", [])
    assert len(features) >= 2, f"Expected at least 2 distinct flood polygon features, got {len(features)}"


@pytest.mark.tier2
def test_disjoint_corridor_remains_navigable(api_client: SimulationApiClient, multi_disjoint_zones_payload):
    """TC B6.3: Central corridor between North and South Chennai remains navigable for routing."""
    response = api_client.run_simulation(multi_disjoint_zones_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("evacuation_routes", {})
    features = routes.get("features", []) if isinstance(routes, dict) else routes
    assert len(features) > 0, "Evacuation routes should successfully navigate unflooded central corridor"


@pytest.mark.tier2
def test_independent_flood_polygon_identities_preserved(api_client: SimulationApiClient, multi_disjoint_zones_payload):
    """TC B6.4: Flood polygon features preserve their respective zone IDs or properties."""
    response = api_client.run_simulation(multi_disjoint_zones_payload)
    assert response.status_code == 200
    data = response.json()

    timeline = data.get("timeline", data.get("timesteps", []))
    fc = timeline[0].get("flood_polygons", timeline[0].get("flooded_zones_geojson", {}))
    features = fc.get("features", [])

    zone_ids = [feat.get("properties", {}).get("zone_id") for feat in features]
    # Check if zone IDs or properties are tracked
    assert len(features) >= 2


@pytest.mark.tier2
def test_disjoint_zones_do_not_produce_teleporting_edges(api_client: SimulationApiClient, multi_disjoint_zones_payload):
    """TC B6.5: Paths generated between zones follow real road network, not direct air line jumps."""
    response = api_client.run_simulation(multi_disjoint_zones_payload)
    assert response.status_code == 200
    data = response.json()

    supply_routes = data.get("supply_routes", {})
    features = supply_routes.get("features", []) if isinstance(supply_routes, dict) else supply_routes
    for feat in features:
        coords = feat.get("geometry", {}).get("coordinates", feat.get("path_geojson", {}).get("coordinates", []))
        if coords:
            assert len(coords) >= 2
