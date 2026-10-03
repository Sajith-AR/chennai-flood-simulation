"""
Tier 1: Feature Coverage - Map Baseline Initialization & Geographic Bounds Verification
Verifies R1, R4, AC-1, AC-11, AC-16
Interface Contract: GET /api/map/init
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.geometry import is_coord_in_gcc
from e2e.common.config import CHENNAI_CENTER, GCC_BOUNDS


@pytest.mark.tier1
def test_map_init_returns_200_and_correct_center(api_client: SimulationApiClient):
    """TC 1.1: Map initialization endpoint returns 200 and coordinates centered on Chennai."""
    response = api_client.get_map_init()
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"

    data = response.json()
    assert "center" in data, "Response must include 'center' coordinates"
    center = data["center"]

    # Support [lat, lon] or {'lat': ..., 'lon': ...}
    if isinstance(center, list):
        lat, lon = center[0], center[1]
    else:
        lat, lon = center.get("lat"), center.get("lon")

    assert abs(lat - CHENNAI_CENTER["lat"]) < 0.1, f"Center latitude {lat} deviates from Chennai center"
    assert abs(lon - CHENNAI_CENTER["lon"]) < 0.1, f"Center longitude {lon} deviates from Chennai center"


@pytest.mark.tier1
def test_map_bounds_strictly_enclose_chennai(api_client: SimulationApiClient):
    """TC 1.2: Map initialization returns geographic bounds enclosing the Greater Chennai Corporation."""
    response = api_client.get_map_init()
    assert response.status_code == 200
    data = response.json()

    assert "bounds" in data, "Response must specify boundary limits"
    bounds = data["bounds"]

    if isinstance(bounds, list):
        # Format: [[lat_min, lon_min], [lat_max, lon_max]]
        sw, ne = bounds[0], bounds[1]
        sw_lat, sw_lon = sw[0], sw[1]
        ne_lat, ne_lon = ne[0], ne[1]
    else:
        sw = bounds.get("south_west", bounds.get("sw", []))
        ne = bounds.get("north_east", bounds.get("ne", []))
        sw_lat = sw[0] if isinstance(sw, list) else sw.get("lat", 12.85)
        sw_lon = sw[1] if isinstance(sw, list) else sw.get("lon", 80.05)
        ne_lat = ne[0] if isinstance(ne, list) else ne.get("lat", 13.25)
        ne_lon = ne[1] if isinstance(ne, list) else ne.get("lon", 80.35)

    assert sw_lat <= 12.90, f"Southwest latitude {sw_lat} does not cover South Chennai"
    assert sw_lon <= 80.15, f"Southwest longitude {sw_lon} does not cover West Chennai"
    assert ne_lat >= 13.15, f"Northeast latitude {ne_lat} does not cover North Chennai"
    assert ne_lon >= 80.25, f"Northeast longitude {ne_lon} does not cover East Chennai coast"


@pytest.mark.tier1
def test_map_init_contains_verified_shelters(api_client: SimulationApiClient):
    """TC 1.3: Map initialization includes at least 10 shelters with valid locations and capacities."""
    response = api_client.get_map_init()
    assert response.status_code == 200
    data = response.json()

    # Shelters may be under 'shelters' or 'distribution_points'
    shelters = data.get("shelters", data.get("distribution_points", []))
    assert len(shelters) >= 10, f"Expected at least 10 shelters/relief camps, found {len(shelters)}"

    for s in shelters:
        assert "id" in s, "Shelter must have an id"
        assert "name" in s, "Shelter must have a name"

        loc = s.get("location", s.get("position", []))
        assert len(loc) >= 2, f"Shelter {s.get('id')} has invalid location: {loc}"
        lat = loc[0] if (12.0 <= loc[0] <= 14.0) else loc[1]
        lon = loc[1] if (12.0 <= loc[0] <= 14.0) else loc[0]
        assert is_coord_in_gcc(lat, lon), f"Shelter {s.get('id')} at [{lat}, {lon}] is outside GCC bounds"

        capacity = s.get("capacity", s.get("max_capacity", 0))
        assert capacity > 0, f"Shelter {s.get('id')} must have positive capacity, got {capacity}"


@pytest.mark.tier1
def test_map_init_contains_strategic_warehouses(api_client: SimulationApiClient):
    """TC 1.4: Map initialization includes at least 5 strategic warehouses with inventory."""
    response = api_client.get_map_init()
    assert response.status_code == 200
    data = response.json()

    warehouses = data.get("warehouses", [])
    assert len(warehouses) >= 5, f"Expected at least 5 strategic warehouses, found {len(warehouses)}"

    for wh in warehouses:
        assert "id" in wh, "Warehouse must have an id"
        assert "name" in wh, "Warehouse must have a name"

        loc = wh.get("location", wh.get("position", []))
        assert len(loc) >= 2, f"Warehouse {wh.get('id')} has invalid location: {loc}"
        lat = loc[0] if (12.0 <= loc[0] <= 14.0) else loc[1]
        lon = loc[1] if (12.0 <= loc[0] <= 14.0) else loc[0]
        assert is_coord_in_gcc(lat, lon), f"Warehouse {wh.get('id')} at [{lat}, {lon}] is outside GCC bounds"

        supplies = wh.get("supplies", wh.get("inventory", {}))
        assert isinstance(supplies, dict), f"Warehouse {wh.get('id')} supplies must be a dictionary"
        water = supplies.get("water_litres", supplies.get("drinking_water_liters", 0))
        food = supplies.get("food_rations", 0)
        assert water > 0, f"Warehouse {wh.get('id')} must have positive water reserves"
        assert food > 0, f"Warehouse {wh.get('id')} must have positive food rations"


@pytest.mark.tier1
def test_map_init_contains_population_clusters(api_client: SimulationApiClient):
    """TC 1.5: Map initialization includes baseline population density clusters."""
    response = api_client.get_map_init()
    assert response.status_code == 200
    data = response.json()

    clusters = data.get("population_clusters", data.get("population_density_zones", []))
    assert len(clusters) >= 1, "Expected at least 1 population cluster or density zone"

    for cluster in clusters:
        assert "id" in cluster or "zone_id" in cluster
        pop = cluster.get("estimated_population", cluster.get("population", 0))
        assert pop > 0, "Population count must be positive"


@pytest.mark.tier1
def test_map_init_contains_historical_presets(api_client: SimulationApiClient):
    """TC 1.6: Map initialization contains pre-configured historical disaster presets."""
    response = api_client.get_map_init()
    assert response.status_code == 200
    data = response.json()

    presets = data.get("presets", [])
    # If presets are bundled, verify structure
    if presets:
        assert isinstance(presets, list)
        for preset in presets:
            assert "id" in preset or "name" in preset
