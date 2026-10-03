"""
Tier 1: Feature Coverage - Disaster Parameter Schema and Range Validation
Verifies R1, R4, AC-3, AC-16
Interface Contract: POST /api/simulation/run
"""

import pytest
from e2e.common.client import SimulationApiClient


@pytest.mark.tier1
def test_valid_parameters_return_200_and_simulation_id(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 2.1: Nominal disaster parameters successfully generate simulation with 200 OK."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()
    assert "simulation_id" in data, "Response must contain unique simulation_id"
    assert isinstance(data["simulation_id"], str)
    assert len(data["simulation_id"]) > 0


@pytest.mark.tier1
def test_negative_rainfall_intensity_rejected(api_client: SimulationApiClient):
    """TC 2.2: Negative rainfall intensity must be rejected with 400/422 status."""
    payload = {
        "flood_zones": [
            {"id": "FZ-01", "type": "circle", "coordinates": [[13.0158, 80.2224]], "radius_meters": 1000.0}
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": -50.0,
            "flood_depth_meters": 1.0,
            "spread_rate_meters_hr": 100.0,
            "duration_hours": 6
        }
    }
    response = api_client.run_simulation(payload)
    assert response.status_code in [400, 422], (
        f"Expected 400/422 validation failure for negative rainfall, got {response.status_code}"
    )


@pytest.mark.tier1
def test_negative_flood_depth_rejected(api_client: SimulationApiClient):
    """TC 2.3: Negative flood depth must be rejected with 400/422 status."""
    payload = {
        "flood_zones": [
            {"id": "FZ-01", "type": "circle", "coordinates": [[13.0158, 80.2224]], "radius_meters": 1000.0}
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 50.0,
            "flood_depth_meters": -2.5,
            "spread_rate_meters_hr": 100.0,
            "duration_hours": 6
        }
    }
    response = api_client.run_simulation(payload)
    assert response.status_code in [400, 422], (
        f"Expected 400/422 validation failure for negative flood depth, got {response.status_code}"
    )


@pytest.mark.tier1
def test_negative_or_zero_radius_rejected(api_client: SimulationApiClient):
    """TC 2.4: Circle flood zone with non-positive radius must be rejected."""
    payload = {
        "flood_zones": [
            {"id": "FZ-01", "type": "circle", "coordinates": [[13.0158, 80.2224]], "radius_meters": 0.0}
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 50.0,
            "flood_depth_meters": 1.0,
            "spread_rate_meters_hr": 100.0,
            "duration_hours": 6
        }
    }
    response = api_client.run_simulation(payload)
    assert response.status_code in [400, 422], (
        f"Expected 400/422 for non-positive radius, got {response.status_code}"
    )


@pytest.mark.tier1
def test_coordinates_outside_chennai_bounds_rejected(api_client: SimulationApiClient):
    """TC 2.5: Coordinates far outside Greater Chennai Corporation must be rejected."""
    payload = {
        "flood_zones": [
            # Mumbai / Delhi coordinates
            {"id": "FZ-OOB", "type": "circle", "coordinates": [[19.0760, 72.8777]], "radius_meters": 2000.0}
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 60.0,
            "flood_depth_meters": 1.0,
            "spread_rate_meters_hr": 100.0,
            "duration_hours": 6
        }
    }
    response = api_client.run_simulation(payload)
    assert response.status_code in [400, 422], (
        f"Expected 400/422 for coordinates outside Chennai, got {response.status_code}"
    )


@pytest.mark.tier1
def test_missing_required_parameters_rejected(api_client: SimulationApiClient):
    """TC 2.6: Payload missing required 'parameters' block must be rejected with 422."""
    payload = {
        "flood_zones": [
            {"id": "FZ-01", "type": "circle", "coordinates": [[13.0158, 80.2224]], "radius_meters": 1000.0}
        ]
    }
    response = api_client.run_simulation(payload)
    assert response.status_code in [400, 422], (
        f"Expected 400/422 for missing parameters, got {response.status_code}"
    )
