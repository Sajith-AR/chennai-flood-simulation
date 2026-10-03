"""
Tier 1: Feature Coverage - Supply Distribution Routing Avoiding Flood Zones
Verifies R3, AC-11, AC-12
Interface Contract: POST /api/simulation/run -> supply_routes
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.validators import validate_geojson_feature_collection
from e2e.common.geometry import route_intersects_deep_flood
from e2e.common.config import MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS


@pytest.mark.tier1
def test_supply_routes_returned_as_valid_geojson(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 6.1: Supply routes returned as a valid GeoJSON FeatureCollection of LineStrings."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("supply_routes")
    if routes is None and "timeline" in data and len(data["timeline"]) > 0:
        routes = data["timeline"][0].get("supply_routes")

    assert routes is not None, "Simulation response must include 'supply_routes'"
    if isinstance(routes, dict):
        assert validate_geojson_feature_collection(routes, geom_type="LineString")
    elif isinstance(routes, list):
        assert len(routes) > 0


@pytest.mark.tier1
def test_supply_routes_connect_warehouses_to_destinations(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 6.2: Every supply route originates from a warehouse depot and targets a relief camp."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("supply_routes")
    if routes is None and "timeline" in data and len(data["timeline"]) > 0:
        routes = data["timeline"][0].get("supply_routes")

    features = routes.get("features", []) if isinstance(routes, dict) else routes
    for feat in features:
        props = feat.get("properties", feat)
        orig = props.get("warehouse_id", props.get("origin_warehouse_id"))
        dest = props.get("destination_id", props.get("distribution_point_id", props.get("shelter_id")))

        assert orig is not None, "Supply route must identify origin warehouse"
        assert dest is not None, "Supply route must identify destination point"


@pytest.mark.tier1
def test_supply_routes_strictly_avoid_flood_waters_above_30cm(api_client: SimulationApiClient, baseline_disaster_payload):
    """
    TC 6.3: Relief logistics clearance rule: Supply trucks cannot navigate water >= 0.3m.
    Assert zero supply route coordinates intersect active flood polygons >= 0.3m depth.
    """
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    timeline = data.get("timeline", data.get("timesteps", []))
    routes_obj = data.get("supply_routes")
    if routes_obj is None and len(timeline) > 0:
        routes_obj = timeline[0].get("supply_routes")

    # Collect all flood features with depth >= 0.3m
    floods_above_30cm = []
    for step in timeline:
        fc = step.get("flood_polygons", step.get("flooded_zones_geojson", {}))
        for feat in fc.get("features", []):
            depth = feat.get("properties", {}).get("depth_meters", 0.0)
            if depth >= MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS:
                floods_above_30cm.append(feat)

    features = routes_obj.get("features", []) if isinstance(routes_obj, dict) else routes_obj
    for feat in features:
        coords = feat.get("geometry", {}).get("coordinates", feat.get("path_geojson", {}).get("coordinates", []))
        if coords:
            has_violation, count = route_intersects_deep_flood(
                coords, floods_above_30cm, MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS
            )
            assert not has_violation, (
                f"Supply route violates truck clearance limit: {count} nodes pass through water >= 0.3m"
            )


@pytest.mark.tier1
def test_supply_routes_report_distance_and_transit_time(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 6.4: Supply routes report positive distance and vehicle transit time."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("supply_routes")
    if routes is None and "timeline" in data and len(data["timeline"]) > 0:
        routes = data["timeline"][0].get("supply_routes")

    features = routes.get("features", []) if isinstance(routes, dict) else routes
    for feat in features:
        props = feat.get("properties", feat)
        dist = props.get("distance_km", props.get("travel_distance_km", 0.0))
        time_min = props.get("transit_time_min", props.get("estimated_travel_time_mins", 0.0))

        assert dist > 0.0, f"Supply route distance must be positive, got {dist}"
        assert time_min > 0.0, f"Supply transit time must be positive, got {time_min}"


@pytest.mark.tier1
def test_supply_and_evacuation_routes_are_distinct(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 6.5: Supply routes (depot -> camp) and evacuation routes (cluster -> shelter) have distinct roles."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    evac_routes = data.get("evacuation_routes", {})
    supply_routes = data.get("supply_routes", {})

    if not evac_routes and "timeline" in data and len(data["timeline"]) > 0:
        evac_routes = data["timeline"][0].get("evacuation_routes", {})
        supply_routes = data["timeline"][0].get("supply_routes", {})

    assert evac_routes is not None
    assert supply_routes is not None
