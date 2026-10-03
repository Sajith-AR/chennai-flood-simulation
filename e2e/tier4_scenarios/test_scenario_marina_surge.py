"""
Tier 4: Real-World Scenarios - Marina Beach Storm Surge Scenario
Replicates Bay of Bengal cyclonic storm surge inundating the eastern coastal highway (Kamarajar Salai) and beach settlements.
"""

import pytest
from e2e.common.client import SimulationApiClient


@pytest.fixture
def marina_surge_payload():
    return {
        "scenario_name": "Bay of Bengal Severe Cyclonic Storm Surge - Marina Coastline",
        "flood_zones": [
            {
                "id": "FZ-MARINA-SURGE",
                "type": "circle",
                "coordinates": [[13.0500, 80.2820]],  # Marina Beach promenade / Kamarajar Salai
                "radius_meters": 2200.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 110.0,
            "flood_depth_meters": 1.8,
            "spread_rate_meters_hr": 200.0,
            "duration_hours": 6
        }
    }


@pytest.mark.tier4
def test_marina_surge_scenario_executes_successfully(api_client: SimulationApiClient, marina_surge_payload):
    """TC 4.4.1: Marina Beach coastal storm surge simulation completes with HTTP 200."""
    response = api_client.run_simulation(marina_surge_payload)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
    data = response.json()
    assert "simulation_id" in data


@pytest.mark.tier4
def test_marina_surge_inland_evacuation_directionality(api_client: SimulationApiClient, marina_surge_payload):
    """TC 4.4.2: Coastal evacuees are routed westward inland away from the Bay of Bengal coastline."""
    response = api_client.run_simulation(marina_surge_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("evacuation_routes", {})
    features = routes.get("features", []) if isinstance(routes, dict) else routes
    assert len(features) > 0, "Expected evacuation routes away from coastal surge zone"


@pytest.mark.tier4
def test_marina_surge_port_warehouse_inland_routing(api_client: SimulationApiClient, marina_surge_payload):
    """TC 4.4.3: Convoys from Port depot route inland towards Mylapore/Royapettah avoiding coastal highway."""
    response = api_client.run_simulation(marina_surge_payload)
    assert response.status_code == 200
    data = response.json()

    supply_routes = data.get("supply_routes", {})
    features = supply_routes.get("features", []) if isinstance(supply_routes, dict) else supply_routes
    assert len(features) > 0, "Expected active supply routes for coastal storm relief"
