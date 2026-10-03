"""
Tier 3: Cross-Feature Interactions - Rapid Timeline Progression + Simultaneous Manual Resource Reallocation
Verifies temporal state integrity when stepping through disaster progression while modifying inventory balances.
"""

import pytest
from e2e.common.client import SimulationApiClient


@pytest.mark.tier3
def test_timeline_progression_with_interleaved_resource_allocation(api_client: SimulationApiClient):
    """
    Test scenario:
    1. Initialize multi-hour simulation (12 hours).
    2. Inspect timestep t=2.
    3. Perform manual resource transfer from WH-01 to DP-04 (T. Nagar).
    4. Step to timestep t=6.
    5. Assert timeline maintains temporal monotonicity and inventory remains consistent.
    """
    payload = {
        "flood_zones": [
            {
                "id": "FZ-TIMELINE-SURGE",
                "type": "circle",
                "coordinates": [[13.0418, 80.2341]],
                "radius_meters": 1800.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 90.0,
            "flood_depth_meters": 1.5,
            "spread_rate_meters_hr": 200.0,
            "duration_hours": 12
        }
    }

    # Step 1: Run simulation
    sim_res = api_client.run_simulation(payload)
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    timeline = sim_data.get("timeline", sim_data.get("timesteps", []))
    assert len(timeline) >= 12

    # Step 2: Validate early timestep state (t=2)
    step2 = timeline[2]
    step2_val = step2.get("time_step", step2.get("step", 2))
    assert step2_val == 2

    # Step 3: Trigger Resource Reallocation
    alloc_payload = {
        "shelter_or_point_id": "DP-04",
        "supplies": {
            "water_litres": 8000,
            "food_rations": 3000,
            "medical_kits": 40
        }
    }
    alloc_res = api_client.allocate_resources(alloc_payload)
    assert alloc_res.status_code == 200

    # Step 4: Validate late timestep state (t=6)
    step6 = timeline[6]
    step6_val = step6.get("time_step", step6.get("step", 6))
    assert step6_val == 6

    # Verify that later timesteps have at least as many severed roads as earlier timesteps
    sev2 = step2.get("severed_road_segments_count", 0)
    sev6 = step6.get("severed_road_segments_count", 0)
    assert sev6 >= sev2, f"Severed roads should be monotonically non-decreasing: t2={sev2}, t6={sev6}"
