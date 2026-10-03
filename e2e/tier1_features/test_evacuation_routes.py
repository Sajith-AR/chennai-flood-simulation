"""
Tier 1: Feature Coverage - Safe Evacuation Route Calculation & Non-Inundation Verification
Verifies R2, AC-7, AC-8
Interface Contract: POST /api/simulation/run -> evacuation_routes
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.validators import validate_geojson_feature_collection, validate_route_linestring
from e2e.common.geometry import route_intersects_deep_flood, haversine_km
from e2e.common.config import MAX_PASSABLE_DEPTH_EVACUATION_PEDESTRIAN_METERS


@pytest.mark.tier1
def test_evacuation_routes_returned_as_valid_geojson(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 4.1: Simulation returns evacuation routes as a well-formed GeoJSON FeatureCollection."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("evacuation_routes")
    # If returned at top-level or inside timeline step 0
    if routes is None and "timeline" in data and len(data["timeline"]) > 0:
        routes = data["timeline"][0].get("evacuation_routes")

    assert routes is not None, "Response must include 'evacuation_routes'"
    if isinstance(routes, dict):
        assert validate_geojson_feature_collection(routes, geom_type="LineString")
    elif isinstance(routes, list):
        assert len(routes) > 0, "Evacuation routes array must not be empty"


@pytest.mark.tier1
def test_evacuation_routes_terminate_at_safe_destinations(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 4.2: Evacuation routes specify origin and target shelter destination."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("evacuation_routes")
    if routes is None and "timeline" in data and len(data["timeline"]) > 0:
        routes = data["timeline"][0].get("evacuation_routes")

    features = routes.get("features", []) if isinstance(routes, dict) else routes
    assert len(features) > 0, "Must have at least one evacuation route calculated"

    for route in features:
        props = route.get("properties", route) if isinstance(route, dict) else {}
        dest = props.get("shelter_id", props.get("assigned_shelter_id", props.get("destination_id")))
        assert dest is not None, "Evacuation route must have assigned shelter / destination"


@pytest.mark.tier1
def test_evacuation_routes_avoid_deep_inundation(api_client: SimulationApiClient, baseline_disaster_payload):
    """
    TC 4.3: Crucial Safety Invariant: No evacuation route coordinate traverses flood waters >= 0.5m.
    Opaque-box verification uses independent ray-casting point-in-polygon engine.
    """
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    timeline = data.get("timeline", data.get("timesteps", []))
    routes_obj = data.get("evacuation_routes")
    if routes_obj is None and len(timeline) > 0:
        routes_obj = timeline[0].get("evacuation_routes")

    # Extract all active flood polygons with depth >= 0.5m
    deep_flood_polygons = []
    for step in timeline:
        fc = step.get("flood_polygons", step.get("flooded_zones_geojson", {}))
        for feat in fc.get("features", []):
            depth = feat.get("properties", {}).get("depth_meters", 0.0)
            if depth >= MAX_PASSABLE_DEPTH_EVACUATION_PEDESTRIAN_METERS:
                deep_flood_polygons.append(feat)

    # If routes is a FeatureCollection
    features = routes_obj.get("features", []) if isinstance(routes_obj, dict) else routes_obj
    for feat in features:
        coords = feat.get("geometry", {}).get("coordinates", feat.get("path_geojson", {}).get("coordinates", []))
        if coords:
            has_violation, count = route_intersects_deep_flood(
                coords, deep_flood_polygons, MAX_PASSABLE_DEPTH_EVACUATION_PEDESTRIAN_METERS
            )
            assert not has_violation, (
                f"Evacuation route violates flood avoidance safety invariant: "
                f"{count} nodes traverse flood water >= {MAX_PASSABLE_DEPTH_EVACUATION_PEDESTRIAN_METERS}m"
            )


@pytest.mark.tier1
def test_evacuation_routes_have_positive_distance_and_time(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 4.4: Every evacuation route reports positive physical travel distance and transit time."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("evacuation_routes")
    if routes is None and "timeline" in data and len(data["timeline"]) > 0:
        routes = data["timeline"][0].get("evacuation_routes")

    features = routes.get("features", []) if isinstance(routes, dict) else routes
    for feat in features:
        props = feat.get("properties", feat)
        dist = props.get("distance_km", props.get("travel_distance_km", 0.0))
        time_est = props.get("estimated_time_min", props.get("estimated_evacuation_time_mins", 0.0))

        assert dist > 0.0, f"Route distance must be positive, got {dist}"
        assert time_est > 0.0, f"Estimated time must be positive, got {time_est}"


@pytest.mark.tier1
def test_evacuation_route_safety_status_labels(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 4.5: Route properties contain status indicators (clear, warning, rerouted, or active)."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("evacuation_routes")
    if routes is None and "timeline" in data and len(data["timeline"]) > 0:
        routes = data["timeline"][0].get("evacuation_routes")

    valid_statuses = {"clear", "warning", "rerouted", "active", "CLEAR", "WARNING", "REROUTED"}
    features = routes.get("features", []) if isinstance(routes, dict) else routes
    for feat in features:
        props = feat.get("properties", feat)
        status = props.get("status", props.get("safety_status"))
        if status:
            assert str(status).lower() in [s.lower() for s in valid_statuses], (
                f"Invalid route safety status: {status}"
            )


@pytest.mark.tier1
def test_evacuation_route_continuity(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 4.6: LineString coordinates form a continuous path with no teleportation gaps (>10km)."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("evacuation_routes")
    if routes is None and "timeline" in data and len(data["timeline"]) > 0:
        routes = data["timeline"][0].get("evacuation_routes")

    features = routes.get("features", []) if isinstance(routes, dict) else routes
    for feat in features:
        coords = feat.get("geometry", {}).get("coordinates", feat.get("path_geojson", {}).get("coordinates", []))
        assert len(coords) >= 2
        for i in range(len(coords) - 1):
            p1 = coords[i]
            p2 = coords[i + 1]
            lat1 = p1[0] if (12.0 <= p1[0] <= 14.0) else p1[1]
            lon1 = p1[1] if (12.0 <= p1[0] <= 14.0) else p1[0]
            lat2 = p2[0] if (12.0 <= p2[0] <= 14.0) else p2[1]
            lon2 = p2[1] if (12.0 <= p2[0] <= 14.0) else p2[0]
            hop_km = haversine_km(lat1, lon1, lat2, lon2)
            assert hop_km < 10.0, f"Discontinuous teleportation gap detected along evacuation route: {hop_km} km"
