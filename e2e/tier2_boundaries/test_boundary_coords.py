"""
Tier 2: Boundary & Corner Cases - Coordinates Right at the Edge of Chennai GCC Boundary
Verifies boundary clipping, edge-case tolerance within GCC limits, and out-of-bounds rejection.
"""

import pytest
from e2e.common.client import SimulationApiClient


@pytest.mark.tier2
def test_southern_boundary_coordinate_accepted(api_client: SimulationApiClient):
    """TC B7.1: Coordinate at southern limit of GCC (Lat 12.86) is accepted."""
    payload = {
        "flood_zones": [
            {"id": "FZ-SOUTH-BORDER", "type": "circle", "coordinates": [[12.8600, 80.1500]], "radius_meters": 1000.0}
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 70.0,
            "flood_depth_meters": 1.0,
            "spread_rate_meters_hr": 100.0,
            "duration_hours": 4
        }
    }
    response = api_client.run_simulation(payload)
    assert response.status_code == 200, f"Southern border coordinate should be accepted, got {response.status_code}"


@pytest.mark.tier2
def test_northern_boundary_coordinate_accepted(api_client: SimulationApiClient):
    """TC B7.2: Coordinate at northern limit of GCC (Lat 13.24) is accepted."""
    payload = {
        "flood_zones": [
            {"id": "FZ-NORTH-BORDER", "type": "circle", "coordinates": [[13.2400, 80.2500]], "radius_meters": 1000.0}
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 70.0,
            "flood_depth_meters": 1.0,
            "spread_rate_meters_hr": 100.0,
            "duration_hours": 4
        }
    }
    response = api_client.run_simulation(payload)
    assert response.status_code == 200, f"Northern border coordinate should be accepted, got {response.status_code}"


@pytest.mark.tier2
def test_western_boundary_coordinate_accepted(api_client: SimulationApiClient):
    """TC B7.3: Coordinate at western limit of GCC (Lon 80.06 near Poonamallee) is accepted."""
    payload = {
        "flood_zones": [
            {"id": "FZ-WEST-BORDER", "type": "circle", "coordinates": [[13.0500, 80.0600]], "radius_meters": 1000.0}
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 70.0,
            "flood_depth_meters": 1.0,
            "spread_rate_meters_hr": 100.0,
            "duration_hours": 4
        }
    }
    response = api_client.run_simulation(payload)
    assert response.status_code == 200, f"Western border coordinate should be accepted, got {response.status_code}"


@pytest.mark.tier2
def test_coordinate_outside_southern_boundary_rejected(api_client: SimulationApiClient):
    """TC B7.4: Coordinate south of GCC boundary (Lat 12.70 N, Chengalpattu) rejected with 400/422."""
    payload = {
        "flood_zones": [
            {"id": "FZ-OOB-SOUTH", "type": "circle", "coordinates": [[12.7000, 80.0000]], "radius_meters": 1000.0}
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 70.0,
            "flood_depth_meters": 1.0,
            "spread_rate_meters_hr": 100.0,
            "duration_hours": 4
        }
    }
    response = api_client.run_simulation(payload)
    assert response.status_code in [400, 422], (
        f"Expected 400/422 rejection for coordinate south of GCC, got {response.status_code}"
    )


@pytest.mark.tier2
def test_deep_bay_of_bengal_coordinate_handled_safely(api_client: SimulationApiClient):
    """TC B7.5: Coordinate far out in the Bay of Bengal (Lon 80.55 E) rejected or returns 0 impacted roads."""
    payload = {
        "flood_zones": [
            {"id": "FZ-OCEAN", "type": "circle", "coordinates": [[13.0827, 80.5500]], "radius_meters": 1000.0}
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 70.0,
            "flood_depth_meters": 1.0,
            "spread_rate_meters_hr": 100.0,
            "duration_hours": 4
        }
    }
    response = api_client.run_simulation(payload)
    # Either rejected as out-of-bounds or processed with 0 impacted roads
    if response.status_code == 200:
        data = response.json()
        timeline = data.get("timeline", data.get("timesteps", []))
        if timeline:
            severed = timeline[0].get("severed_road_segments_count", 0)
            assert severed == 0, f"Ocean coordinate should sever 0 land roads, found {severed}"
    else:
        assert response.status_code in [400, 422]
