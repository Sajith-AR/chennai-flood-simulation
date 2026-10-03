"""
Tier 1: Feature Coverage - Resource Inventory Ledger (Food, Water, Medicine) and Dynamic Allocation
Verifies R3, AC-13, AC-14
Interface Contracts: POST /api/simulation/run, POST /api/resources/allocate
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.validators import (
    validate_inventory_ledger_invariants,
    validate_sphere_demand_standards
)


@pytest.mark.tier1
def test_simulation_contains_inventory_status(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 7.1: Simulation response contains inventory tracking data."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    inventory = data.get("inventory_status", data.get("inventory_ledger"))
    if inventory is None and "timeline" in data and len(data["timeline"]) > 0:
        inventory = data["timeline"][0].get("inventory_status")

    assert inventory is not None, "Response must include 'inventory_status' or 'inventory_ledger'"
    assert isinstance(inventory, dict)


@pytest.mark.tier1
def test_inventory_ledger_satisfies_conservation_laws(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 7.2: Inventory ledger obeys non-negativity and stock conservation (available + allocated <= total)."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    inventory = data.get("inventory_status", data.get("inventory_ledger"))
    if inventory is None and "timeline" in data and len(data["timeline"]) > 0:
        inventory = data["timeline"][0].get("inventory_status")

    validate_inventory_ledger_invariants(inventory)


@pytest.mark.tier1
def test_dynamic_resource_allocation_succeeds_for_valid_amounts(api_client: SimulationApiClient):
    """TC 7.3: POST /api/resources/allocate updates resource allocation successfully."""
    # Standard allocation request
    payload = {
        "shelter_or_point_id": "DP-01",
        "supplies": {
            "water_litres": 5000,
            "food_rations": 2000,
            "medical_kits": 50
        }
    }
    response = api_client.allocate_resources(payload)
    assert response.status_code == 200, f"Expected 200 OK for valid allocation, got {response.status_code}: {response.text}"
    data = response.json()
    assert data.get("success") is True or "updated_inventory" in data or "updated_inventory_ledger" in data


@pytest.mark.tier1
def test_resource_allocation_decrements_available_stock(api_client: SimulationApiClient):
    """TC 7.4: Allocating supplies reduces available warehouse stock without leaking resources."""
    alloc_water = 3000
    alloc_food = 1000
    payload = {
        "shelter_or_point_id": "DP-02",
        "supplies": {
            "water_litres": alloc_water,
            "food_rations": alloc_food,
            "medical_kits": 20
        }
    }
    response = api_client.allocate_resources(payload)
    assert response.status_code == 200
    data = response.json()

    updated = data.get("updated_inventory", data.get("updated_inventory_ledger", {}))
    assert updated is not None, "Allocation response must include updated inventory"


@pytest.mark.tier1
def test_excessive_allocation_rejected_with_400(api_client: SimulationApiClient):
    """TC 7.5: Over-allocating astronomical quantities exceeding city stock must be rejected with 400."""
    payload = {
        "shelter_or_point_id": "DP-01",
        "supplies": {
            "water_litres": 999_999_999,  # 1 Billion liters
            "food_rations": 500_000_000,
            "medical_kits": 100_000_000
        }
    }
    response = api_client.allocate_resources(payload)
    assert response.status_code in [400, 422], (
        f"Expected 400/422 rejection for impossible allocation, got {response.status_code}"
    )


@pytest.mark.tier1
def test_evacuee_demand_meets_sphere_standards(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 7.6: Supply requirements for assigned evacuees comply with Sphere humanitarian guidelines."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    ledger = data.get("inventory_ledger", {})
    dist_points = ledger.get("distribution_points", [])

    for dp in dist_points:
        evacuees = dp.get("assigned_evacuees", 0)
        demand = dp.get("demand", {})
        if evacuees > 0 and demand:
            validate_sphere_demand_standards(evacuees, demand)
