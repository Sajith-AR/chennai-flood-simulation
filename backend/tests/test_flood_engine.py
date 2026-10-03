import pytest
from backend.app.services.flood_engine import FloodSimulationEngine, classify_severity
from backend.app.models.disaster import FloodZoneInput, DisasterParameters


def test_classify_severity():
    sev, fill, stroke, opacity = classify_severity(0.20)
    assert sev == "advisory"
    assert fill == "#FACC15"

    sev, fill, stroke, opacity = classify_severity(0.45)
    assert sev == "moderate"
    assert fill == "#FB923C"

    sev, fill, stroke, opacity = classify_severity(0.90)
    assert sev == "severe"
    assert fill == "#EF4444"

    sev, fill, stroke, opacity = classify_severity(1.50)
    assert sev == "catastrophic"
    assert fill == "#7F1D1D"


def test_flood_dilation_timeline(flood_engine):
    zone = FloodZoneInput(
        id="FZ-01",
        type="circle",
        center=[13.0158, 80.2224],
        radius_meters=1000.0,
        initial_depth_m=1.8,
    )
    params = DisasterParameters(
        rainfall_intensity_mm_hr=80.0,
        spread_rate_meters_hr=200.0,
        duration_hours=4,
        time_step_hours=1.0,
    )
    timeline = flood_engine.compute_timeline([zone], params)
    assert len(timeline) == 5  # t=0, 1, 2, 3, 4

    # Radius must increase monotonically over time
    radii = [step["zones_state"][0]["current_radius"] for step in timeline]
    for i in range(len(radii) - 1):
        assert radii[i + 1] > radii[i]

    # Check GeoJSON polygon formatting
    first_feat = timeline[0]["flood_polygons"]["features"][0]
    assert first_feat["geometry"]["type"] == "Polygon"
    assert first_feat["properties"]["zone_id"] == "FZ-01"
    assert first_feat["properties"]["time_step"] == 0


def test_point_and_edge_depth_decay(flood_engine):
    zone = FloodZoneInput(
        id="FZ-01",
        type="circle",
        center=[13.0000, 80.2000],
        radius_meters=2000.0,
        initial_depth_m=2.0,
    )
    params = DisasterParameters(duration_hours=2, time_step_hours=1.0)
    timeline = flood_engine.compute_timeline([zone], params)
    step_state = timeline[1]["zones_state"]

    original = flood_engine.get_point_depth.__globals__['get_topographic_context']
    try:
        flood_engine.get_point_depth.__globals__['get_topographic_context'] = lambda lat, lon: (0.0, 0.0, "", 0.0)
        flood_engine.get_edge_depth.__globals__['get_topographic_context'] = lambda lat, lon: (0.0, 0.0, "", 0.0)
        
        # Point at center should have near peak depth
        center_depth = flood_engine.get_point_depth(13.0000, 80.2000, step_state)
        assert center_depth > 1.0

        # Point 1km away should have lower depth
        mid_depth = flood_engine.get_point_depth(13.0090, 80.2000, step_state)
        assert 0.0 < mid_depth < center_depth
    finally:
        flood_engine.get_point_depth.__globals__['get_topographic_context'] = original
        flood_engine.get_edge_depth.__globals__['get_topographic_context'] = original

    # Point 5km away outside zone should have zero depth
    far_depth = flood_engine.get_point_depth(13.0500, 80.2000, step_state)
    assert far_depth == 0.0

    # Edge traversing across center
    edge_depth = flood_engine.get_edge_depth(
        12.9900, 80.2000, 13.0100, 80.2000, step_state
    )
    assert edge_depth > 1.0


def test_preset_resolution(flood_engine):
    zone = FloodZoneInput(id="FZ-PRESET", type="preset", preset_key="velachery_2015")
    params = DisasterParameters()
    resolved = flood_engine.resolve_flood_zones([zone], params)
    assert len(resolved) == 1
    assert resolved[0]["center"] == [12.9796, 80.2185]
    assert resolved[0]["initial_depth"] == 2.2
