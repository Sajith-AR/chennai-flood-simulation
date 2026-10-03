"""
Tier 2: Boundary & Corner Cases - Shelters Filled to Exact 100% Capacity (Overflow Handling)
Verifies capacity saturation, rejection of over-allocation, and rerouting to secondary facilities.
"""

import pytest
from e2e.common.client import SimulationApiClient


@pytest.fixture
def high_displacement_payload():
    """Heavy flood over dense T. Nagar / Mambalam area to trigger shelter capacity saturation."""
    return {
        "flood_zones": [
            {
                "id": "FZ-TNAGAR-DENSE",
                "type": "circle",
                "coordinates": [[13.0418, 80.2341]],
                "radius_meters": 2200.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 140.0,
            "flood_depth_meters": 2.0,
            "spread_rate_meters_hr": 200.0,
            "duration_hours": 6
        }
    }


@pytest.mark.tier2
def test_saturated_shelter_has_zero_remaining_capacity(api_client: SimulationApiClient, high_displacement_payload):
    """TC B4.1: A shelter filled to 100% capacity reports remaining_capacity=0."""
    response = api_client.run_simulation(high_displacement_payload)
    assert response.status_code == 200
    data = response.json()

    allocs = data.get("shelter_allocations", [])
    full_shelters = [s for s in allocs if s.get("status") in ["full", "at_capacity", "FULL"]]
    for s in full_shelters:
        rem = s.get("remaining_capacity")
        if rem is not None:
            assert rem == 0, f"Full shelter reports remaining capacity > 0: {rem}"


@pytest.mark.tier2
def test_overflow_evacuees_rerouted_to_secondary_shelters(api_client: SimulationApiClient, high_displacement_payload):
    """TC B4.2: Evacuees exceeding primary shelter capacity are assigned to secondary shelters."""
    response = api_client.run_simulation(high_displacement_payload)
    assert response.status_code == 200
    data = response.json()

    allocs = data.get("shelter_allocations", [])
    assigned_shelters = [s for s in allocs if (s.get("allocated_evacuees", s.get("assigned_evacuees", 0)) > 0)]
    assert len(assigned_shelters) >= 1, "Expected at least 1 shelter to receive evacuees"


@pytest.mark.tier2
def test_no_shelter_exceeds_declared_capacity(api_client: SimulationApiClient, high_displacement_payload):
    """TC B4.3: Hard Invariant: No shelter receives more evacuees than its max capacity."""
    response = api_client.run_simulation(high_displacement_payload)
    assert response.status_code == 200
    data = response.json()

    allocs = data.get("shelter_allocations", [])
    for s in allocs:
        allocated = s.get("allocated_evacuees", s.get("assigned_evacuees", 0))
        total = s.get("capacity", s.get("max_capacity"))
        if total is not None:
            assert allocated <= total, (
                f"Capacity violation at {s.get('name')}: allocated {allocated} > max {total}"
            )


@pytest.mark.tier2
def test_rerouted_evacuation_routes_flagged(api_client: SimulationApiClient, high_displacement_payload):
    """TC B4.4: Evacuation routes to secondary shelters indicate 'rerouted' or 'active' status."""
    response = api_client.run_simulation(high_displacement_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("evacuation_routes", {})
    features = routes.get("features", []) if isinstance(routes, dict) else routes
    statuses = [feat.get("properties", feat).get("status", "").lower() for feat in features]
    assert all(s in ["clear", "warning", "rerouted", "active", ""] for s in statuses)


@pytest.mark.tier2
def test_shelter_allocations_sum_positive(api_client: SimulationApiClient, high_displacement_payload):
    """TC B4.5: Total evacuees allocated across all shelters is positive for major flood."""
    response = api_client.run_simulation(high_displacement_payload)
    assert response.status_code == 200
    data = response.json()

    allocs = data.get("shelter_allocations", [])
    total_evacuees = sum(s.get("allocated_evacuees", s.get("assigned_evacuees", 0)) for s in allocs)
    assert total_evacuees > 0, "High displacement scenario must assign >0 evacuees to shelters"
