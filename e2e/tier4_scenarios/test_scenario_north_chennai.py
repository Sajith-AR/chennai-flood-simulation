"""
Tier 4: Real-World Scenarios - North Chennai Ennore/Manali Industrial Drainage Failure Scenario
Replicates severe drainage bottlenecks along Buckingham Canal and industrial zones in North Chennai.
"""

import pytest
from e2e.common.client import SimulationApiClient


@pytest.fixture
def north_chennai_payload():
    return {
        "scenario_name": "North Chennai Ennore-Manali Industrial Drainage Collapse",
        "flood_zones": [
            {
                "id": "FZ-MANALI-ENNORE",
                "type": "circle",
                "coordinates": [[13.1800, 80.2600]],  # Manali / Ennore creek
                "radius_meters": 3000.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 135.0,
            "flood_depth_meters": 2.2,
            "spread_rate_meters_hr": 250.0,
            "duration_hours": 8
        }
    }


@pytest.mark.tier4
def test_north_chennai_scenario_executes_successfully(api_client: SimulationApiClient, north_chennai_payload):
    """TC 4.3.1: North Chennai industrial flood simulation completes with HTTP 200."""
    response = api_client.run_simulation(north_chennai_payload)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
    data = response.json()
    assert "simulation_id" in data


@pytest.mark.tier4
def test_north_chennai_industrial_severed_roads(api_client: SimulationApiClient, north_chennai_payload):
    """TC 4.3.2: Drainage failure severs vulnerable low-lying industrial access routes."""
    response = api_client.run_simulation(north_chennai_payload)
    assert response.status_code == 200
    data = response.json()

    timeline = data.get("timeline", data.get("timesteps", []))
    final_step = timeline[-1]
    severed = final_step.get("severed_road_segments_count", final_step.get("blocked_roads", 0))
    assert severed >= 5, f"Expected severed roads in industrial basin, got {severed}"


@pytest.mark.tier4
def test_north_chennai_ambattur_depot_deployment(api_client: SimulationApiClient, north_chennai_payload):
    """TC 4.3.3: Ambattur logistics depot (WH-05) supplies North Chennai relief distribution points."""
    response = api_client.run_simulation(north_chennai_payload)
    assert response.status_code == 200
    data = response.json()

    supply_routes = data.get("supply_routes", {})
    features = supply_routes.get("features", []) if isinstance(supply_routes, dict) else supply_routes
    assert len(features) > 0, "Expected supply routes to be calculated for North Chennai relief"
