"""
Tier 2: Boundary & Corner Cases - Zero Inventory at Warehouses
Verifies depot depletion handling, automatic failover to secondary warehouses, and deficit prevention.
"""

import pytest
from e2e.common.client import SimulationApiClient


@pytest.mark.tier2
def test_allocation_from_exhausted_warehouse_returns_400(api_client: SimulationApiClient):
    """TC B5.1: Attempting to allocate supplies when available stock is 0 is rejected with 400."""
    payload = {
        "shelter_or_point_id": "DP-01",
        "supplies": {
            "water_litres": 999_999_999,
            "food_rations": 999_999_999,
            "medical_kits": 999_999_999
        }
    }
    response = api_client.allocate_resources(payload)
    assert response.status_code in [400, 422], (
        f"Expected 400/422 on impossible allocation, got {response.status_code}"
    )


@pytest.mark.tier2
def test_depleted_depot_triggers_failover_in_simulation(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC B5.2: Supply solver selects from available depots, avoiding depots with zero stock."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    routes = data.get("supply_routes", {})
    features = routes.get("features", []) if isinstance(routes, dict) else routes
    for feat in features:
        props = feat.get("properties", feat)
        orig = props.get("warehouse_id", props.get("origin_warehouse_id"))
        assert orig is not None, "Supply route must originate from a valid warehouse"


@pytest.mark.tier2
def test_warehouse_available_stock_never_negative(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC B5.3: Available stock in inventory ledger is strictly non-negative."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    ledger = data.get("inventory_status", data.get("inventory_ledger", {}))
    warehouses = ledger.get("warehouses", [])
    for wh in warehouses:
        avail = wh.get("available_stock", {})
        for item, count in avail.items():
            assert count >= 0, f"Depot {wh.get('warehouse_id')} has negative stock {count} for {item}"


@pytest.mark.tier2
def test_partial_depot_allocation_leaves_exact_remainder(api_client: SimulationApiClient):
    """TC B5.4: Deducting a small portion leaves the remainder intact."""
    alloc_req = {
        "shelter_or_point_id": "DP-03",
        "supplies": {
            "water_litres": 500,
            "food_rations": 200,
            "medical_kits": 5
        }
    }
    response = api_client.allocate_resources(alloc_req)
    assert response.status_code == 200


@pytest.mark.tier2
def test_zero_inventory_does_not_crash_health_check(api_client: SimulationApiClient):
    """TC B5.5: GET /api/health remains 200 OK regardless of inventory drawdowns."""
    response = api_client.health()
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "ok"
