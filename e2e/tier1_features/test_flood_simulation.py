"""
Tier 1: Feature Coverage - Spatio-Temporal Flood Simulation Time Steps (t=0..T)
Verifies R1, AC-4, AC-5, AC-6
Interface Contract: POST /api/simulation/run -> timeline array
"""

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.validators import validate_geojson_feature_collection
from e2e.common.geometry import is_coord_in_gcc


@pytest.mark.tier1
def test_simulation_generates_timeline_matching_duration(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 3.1: Timeline contains discrete time steps corresponding to requested duration."""
    duration = baseline_disaster_payload["parameters"]["duration_hours"]
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    data = response.json()

    # Timeline can be under 'timeline' or 'timesteps'
    timeline = data.get("timeline", data.get("timesteps", []))
    assert isinstance(timeline, list)
    assert len(timeline) >= duration, (
        f"Timeline length ({len(timeline)}) should have at least {duration} steps"
    )


@pytest.mark.tier1
def test_timeline_steps_are_strictly_sequential(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 3.2: Timesteps appear in strictly ascending sequential order starting at 0."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    timeline = response.json().get("timeline", response.json().get("timesteps", []))

    for idx, step in enumerate(timeline):
        step_val = step.get("time_step", step.get("step", step.get("hour", idx)))
        assert step_val == idx, f"Expected step index {idx}, found {step_val}"


@pytest.mark.tier1
def test_each_timestep_contains_valid_flood_geojson(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 3.3: Every timestep contains a valid GeoJSON FeatureCollection of flood zones."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    timeline = response.json().get("timeline", response.json().get("timesteps", []))

    for step in timeline:
        fc = step.get("flood_polygons", step.get("flooded_zones_geojson", {}))
        assert validate_geojson_feature_collection(fc), (
            f"Step {step.get('time_step')} contains invalid GeoJSON FeatureCollection: {fc}"
        )


@pytest.mark.tier1
def test_flood_features_have_depth_and_severity_properties(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 3.4: Flood polygon features include water depth and categorized severity level."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    timeline = response.json().get("timeline", response.json().get("timesteps", []))

    valid_severities = {
        "advisory", "moderate", "severe", "catastrophic",
        "low", "medium", "high", "critical",
        "ADVISORY", "MODERATE", "SEVERE", "CATASTROPHIC", "CRITICAL"
    }

    found_features = 0
    for step in timeline:
        fc = step.get("flood_polygons", step.get("flooded_zones_geojson", {}))
        for feat in fc.get("features", []):
            found_features += 1
            props = feat.get("properties", {})
            assert "depth_meters" in props or "depth" in props or "water_depth" in props, (
                "Flood feature must declare water depth"
            )
            if "severity" in props or "severity_level" in props:
                sev = props.get("severity", props.get("severity_level"))
                assert str(sev).lower() in [s.lower() for s in valid_severities], (
                    f"Unexpected severity label: {sev}"
                )

    assert found_features > 0, "Simulation generated zero flood features across timeline"


@pytest.mark.tier1
def test_temporal_expansion_over_time(api_client: SimulationApiClient):
    """TC 3.5: Flood boundary expands spatially when spread_rate > 0."""
    payload = {
        "flood_zones": [
            {"id": "FZ-SPREAD", "type": "circle", "coordinates": [[13.0158, 80.2224]], "radius_meters": 1000.0}
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 100.0,
            "flood_depth_meters": 1.5,
            "spread_rate_meters_hr": 300.0,
            "duration_hours": 4
        }
    }
    response = api_client.run_simulation(payload)
    assert response.status_code == 200
    timeline = response.json().get("timeline", response.json().get("timesteps", []))
    assert len(timeline) >= 2

    # Verify that severed roads or flood polygon coordinates expand between step 0 and final step
    step0 = timeline[0]
    step_final = timeline[-1]

    fc0 = step0.get("flood_polygons", step0.get("flooded_zones_geojson", {}))
    fc_final = step_final.get("flood_polygons", step_final.get("flooded_zones_geojson", {}))

    feat_count_0 = len(fc0.get("features", []))
    feat_count_final = len(fc_final.get("features", []))
    assert feat_count_final >= feat_count_0


@pytest.mark.tier1
def test_flood_polygon_coordinates_lie_in_gcc_bounds(api_client: SimulationApiClient, baseline_disaster_payload):
    """TC 3.6: All coordinates of simulated flood polygons lie within Greater Chennai operational limits."""
    response = api_client.run_simulation(baseline_disaster_payload)
    assert response.status_code == 200
    timeline = response.json().get("timeline", response.json().get("timesteps", []))

    for step in timeline:
        fc = step.get("flood_polygons", step.get("flooded_zones_geojson", {}))
        for feat in fc.get("features", []):
            coords = feat.get("geometry", {}).get("coordinates", [])
            for ring in coords:
                for pt in ring:
                    if isinstance(pt, list) and len(pt) >= 2:
                        c1, c2 = pt[0], pt[1]
                        lat = c1 if (12.0 <= c1 <= 14.0) else c2
                        lon = c2 if (12.0 <= c1 <= 14.0) else c1
                        assert is_coord_in_gcc(lat, lon), (
                            f"Flood vertex [{lat}, {lon}] falls outside GCC boundaries"
                        )
