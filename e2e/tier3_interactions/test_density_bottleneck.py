"""
Tier 3: Cross-Feature Interactions - High Population Density Zone + Low Shelter Capacity in Vicinity
Verifies spatial multi-shelter spillover algorithms when local demand exceeds nearest facility capacity.
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.validators import validate_shelter_capacity_invariants


@pytest.mark.tier3
def test_dense_ward_triggers_distal_shelter_spillover(api_client: SimulationApiClient):
    """
    Simulate catastrophic inundation in the ultra-dense T. Nagar ward (population ~45,000).
    Local shelter (T. Nagar Camp, capacity ~5,000) will be saturated.
    Algorithm must route overflow to adjacent shelters (Mylapore, Saidapet, etc.).
    """
    payload = {
        "flood_zones": [
            {
                "id": "FZ-TNAGAR-BOTTLENECK",
                "type": "circle",
                "coordinates": [[13.0418, 80.2341]],
                "radius_meters": 2500.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 150.0,
            "flood_depth_meters": 2.2,
            "spread_rate_meters_hr": 300.0,
            "duration_hours": 8
        }
    }

    response = api_client.run_simulation(payload)
    assert response.status_code == 200
    data = response.json()

    allocs = data.get("shelter_allocations", [])
    validate_shelter_capacity_invariants(allocs)

    # Check that multiple distinct shelters receive evacuees due to local overflow
    occupied_shelters = [s for s in allocs if s.get("allocated_evacuees", s.get("assigned_evacuees", 0)) > 0]
    assert len(occupied_shelters) >= 2, (
        f"Dense population flood should distribute evacuees across multiple shelters, "
        f"found only {len(occupied_shelters)}"
    )

    # Primary local shelter should reach near-maximum capacity
    primary = next((s for s in allocs if "T. Nagar" in s.get("name", "") or s.get("shelter_id") == "DP-04"), None)
    if primary:
        allocated = primary.get("allocated_evacuees", primary.get("assigned_evacuees", 0))
        total = primary.get("capacity", primary.get("max_capacity", 5000))
        assert allocated >= total * 0.8, (
            f"Primary local shelter should be at least 80% filled before substantial spillover: "
            f"allocated={allocated}, total={total}"
        )
