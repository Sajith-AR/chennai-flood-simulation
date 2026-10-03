import pytest
from backend.app.models.logistics import AllocationTransfer, SupplyStock
from backend.app.models.disaster import FloodZoneInput, DisasterParameters


def test_supply_inventory_conservation_invariant(supply_solver):
    """
    CRITICAL INVARIANT: For every warehouse, total stock must strictly equal
    available + allocated + dispatched. No stock may be negative.
    """
    supply_solver.reset_ledger()
    supply_solver.verify_invariants()

    # Perform automated distribution
    res = supply_solver.solve_supply_distribution([], auto_allocate=True)
    supply_solver.verify_invariants()

    inv = res["inventory_status"]
    assert inv["total_water_litres"] > 0
    assert inv["allocated_water_litres"] > 0
    assert inv["total_water_litres"] >= inv["allocated_water_litres"]


def test_supply_routing_avoids_flooded_roads(road_engine, flood_engine, supply_solver):
    """
    Asserts that supply routes avoid roads flooded with depth >= 0.3m (truck limit).
    """
    supply_solver.reset_ledger()
    zone = FloodZoneInput(
        id="FZ-CENTRAL",
        type="circle",
        center=[13.0400, 80.2400],
        radius_meters=1500.0,
        initial_depth_m=1.5,
    )
    params = DisasterParameters(duration_hours=1, time_step_hours=1.0)
    timeline = flood_engine.compute_timeline([zone], params)
    step_state = timeline[1]["zones_state"]

    res = supply_solver.solve_supply_distribution(step_state, auto_allocate=True)
    routes = res["supply_routes"]["features"]
    assert len(routes) > 0

    # Ensure no route traverses a segment with depth >= 0.3m for trucks
    for feat in routes:
        vehicle_type = feat["properties"].get("vehicle_type", "Truck")
        if "Truck" not in vehicle_type and "Van" not in vehicle_type:
            continue
            
        coords = feat["geometry"]["coordinates"]  # [[lon, lat], ...]
        for i in range(len(coords) - 1):
            lon1, lat1 = coords[i]
            lon2, lat2 = coords[i + 1]
            depth = flood_engine.get_edge_depth(lat1, lon1, lat2, lon2, step_state)
            assert depth < 0.30, f"Supply route {feat['id']} crossed flooded road with depth {depth}m!"


def test_manual_allocation_and_rejection(supply_solver):
    """
    Asserts successful manual transfer and rejection when requested > available.
    """
    supply_solver.reset_ledger()

    # 1. Valid allocation
    transfer_valid = AllocationTransfer(
        source_warehouse_id="WH-01",
        destination_point_id="DP-01",
        supplies=SupplyStock(water_litres=10000, food_rations=5000, medical_kits=100),
    )
    res = supply_solver.allocate_supplies([transfer_valid])
    assert res["success"] is True
    supply_solver.verify_invariants()

    # 2. Over-allocation (warehouse WH-01 has 300,000L water total, requesting 500,000L)
    transfer_excess = AllocationTransfer(
        source_warehouse_id="WH-01",
        destination_point_id="DP-01",
        supplies=SupplyStock(water_litres=500000, food_rations=1000, medical_kits=10),
    )
    with pytest.raises(ValueError) as excinfo:
        supply_solver.allocate_supplies([transfer_excess])
    assert "Insufficient inventory" in str(excinfo.value)
    supply_solver.verify_invariants()
