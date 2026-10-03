"""
Tier 1: Feature Coverage - Shelter Capacity Indicators & Evacuee Allocations
Verifies R2, AC-9, AC-10
Interface Contract: POST /api/simulation/run -> shelter_allocations
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.validators import validate_shelter_capacity_invariants


@pytest.mark.tier1
def test_simulation_returns_shelter_allocations_list(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 5.1: Simulation returns a list of shelter allocation metrics."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    allocs = data.get("shelter_allocations")
    if allocs is None and "timeline" in data and len(data["timeline"]) > 0:
        allocs = data["timeline"][0].get("shelter_allocations")

    assert allocs is not None, "Response must include 'shelter_allocations'"
    assert isinstance(allocs, list)
    assert len(allocs) > 0, "At least one shelter allocation entry required"


@pytest.mark.tier1
def test_evacuee_allocations_are_strictly_non_negative(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 5.2: All allocated evacuee counts are strictly non-negative."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    allocs = data.get("shelter_allocations", [])
    if not allocs and "timeline" in data and len(data["timeline"]) > 0:
        allocs = data["timeline"][0].get("shelter_allocations", [])

    validate_shelter_capacity_invariants(allocs)


@pytest.mark.tier1
def test_shelter_remaining_capacity_consistency(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 5.3: Remaining capacity does not exceed declared capacity and is properly decremented."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    allocs = data.get("shelter_allocations", [])
    if not allocs and "timeline" in data and len(data["timeline"]) > 0:
        allocs = data["timeline"][0].get("shelter_allocations", [])

    for s in allocs:
        allocated = s.get("allocated_evacuees", s.get("assigned_evacuees", 0))
        remaining = s.get("remaining_capacity")
        total = s.get("capacity", s.get("max_capacity"))

        if remaining is not None and total is not None:
            assert remaining <= total, f"Remaining {remaining} cannot exceed total capacity {total}"
            # Check arithmetic consistency: remaining ~= total - allocated
            assert abs((total - allocated) - remaining) <= 1, (
                f"Inconsistent capacity accounting: total={total}, allocated={allocated}, remaining={remaining}"
            )


@pytest.mark.tier1
def test_shelter_status_reflects_utilization(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 5.4: Shelter status badges ('available', 'near_capacity', 'full') align with occupancy ratio."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    allocs = data.get("shelter_allocations", [])
    if not allocs and "timeline" in data and len(data["timeline"]) > 0:
        allocs = data["timeline"][0].get("shelter_allocations", [])

    for s in allocs:
        status = s.get("status", "").lower()
        allocated = s.get("allocated_evacuees", s.get("assigned_evacuees", 0))
        total = s.get("capacity", s.get("max_capacity"))

        if total and total > 0:
            utilization = allocated / total
            if utilization >= 1.0:
                assert status in ["full", "overflow", "at_capacity"], (
                    f"Expected status 'full' for 100% capacity, got {status}"
                )
            elif utilization >= 0.8:
                assert status in ["near_capacity", "moderate", "warning", "available"], (
                    f"Unexpected status for 80%+ utilization: {status}"
                )


@pytest.mark.tier1
def test_evacuation_routes_and_shelter_allocations_match(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 5.5: Shelters referenced in evacuation routes appear in shelter_allocations."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("evacuation_routes", {})
    if not routes and "timeline" in data and len(data["timeline"]) > 0:
        routes = data["timeline"][0].get("evacuation_routes", {})

    allocs = data.get("shelter_allocations", [])
    if not allocs and "timeline" in data and len(data["timeline"]) > 0:
        allocs = data["timeline"][0].get("shelter_allocations", [])

    allocated_shelter_ids = {s.get("shelter_id", s.get("id")) for s in allocs if s.get("shelter_id") or s.get("id")}

    features = routes.get("features", []) if isinstance(routes, dict) else routes
    for feat in features:
        props = feat.get("properties", feat)
        dest_id = props.get("shelter_id", props.get("assigned_shelter_id"))
        if dest_id and allocated_shelter_ids:
            assert dest_id in allocated_shelter_ids, (
                f"Evacuation route destination {dest_id} missing from shelter_allocations list"
            )
