import math
from backend.app.services.geometry import (
    haversine,
    haversine_meters,
    latlon_to_meters,
    meters_to_latlon,
    point_in_polygon,
    point_to_segment_distance_meters,
    create_circle_polygon,
    dilate_polygon,
    SpatialGridIndex,
)


def test_haversine_distance():
    # Chennai Central to Guindy Kathipara ~ 10-12 km
    dist = haversine(13.0827, 80.2764, 13.0070, 80.2050)
    assert 10.0 <= dist <= 13.0

    # Same point distance should be zero
    assert haversine(13.0827, 80.2764, 13.0827, 80.2764) == 0.0

    # Meters conversion
    dist_m = haversine_meters(13.0827, 80.2764, 13.0070, 80.2050)
    assert abs(dist_m - (dist * 1000.0)) < 0.1


def test_latlon_meter_projections():
    ref_lat, ref_lon = 13.0827, 80.2707
    x, y = latlon_to_meters(13.0900, 80.2800, ref_lat, ref_lon)
    lat_back, lon_back = meters_to_latlon(x, y, ref_lat, ref_lon)
    assert abs(lat_back - 13.0900) < 1e-5
    assert abs(lon_back - 80.2800) < 1e-5


def test_point_in_polygon():
    # Square around (13.0, 80.0)
    square = [
        [12.9, 79.9],
        [13.1, 79.9],
        [13.1, 80.1],
        [12.9, 80.1],
        [12.9, 79.9],
    ]
    # Point inside
    assert point_in_polygon(13.0, 80.0, square) is True
    # Point outside
    assert point_in_polygon(13.5, 80.5, square) is False
    assert point_in_polygon(12.5, 80.0, square) is False


def test_point_to_segment_distance():
    # Line from (13.0, 80.0) to (13.0, 80.1)
    a_lat, a_lon = 13.0, 80.0
    b_lat, b_lon = 13.0, 80.1

    # Point directly north of midpoint by ~1113m (0.01 deg lat)
    p_lat, p_lon = 13.01, 80.05
    dist = point_to_segment_distance_meters(p_lat, p_lon, a_lat, a_lon, b_lat, b_lon)
    assert 1100.0 <= dist <= 1130.0

    # Point directly on segment
    dist_zero = point_to_segment_distance_meters(13.0, 80.05, a_lat, a_lon, b_lat, b_lon)
    assert dist_zero < 1.0


def test_create_circle_polygon():
    center_lat, center_lon = 13.0827, 80.2707
    radius = 1500.0
    poly = create_circle_polygon(center_lat, center_lon, radius, num_points=32)
    assert len(poly) == 33  # 32 points + 1 closing point
    assert poly[0] == poly[-1]  # Closed ring

    # Every point should be approximately radius_meters from center
    for pt in poly:
        d = haversine_meters(center_lat, center_lon, pt[0], pt[1])
        assert abs(d - radius) < 15.0  # within 1% error


def test_dilate_polygon():
    center_lat, center_lon = 13.0827, 80.2707
    poly = create_circle_polygon(center_lat, center_lon, 1000.0, num_points=16)
    dilated = dilate_polygon(poly, buffer_meters=500.0)
    assert len(dilated) == len(poly)

    # Point on dilated ring should be ~1500m from center
    for pt in dilated:
        d = haversine_meters(center_lat, center_lon, pt[0], pt[1])
        assert abs(d - 1500.0) < 30.0


def test_spatial_grid_index():
    idx = SpatialGridIndex(cell_size_km=2.0)
    idx.insert("A", 13.0827, 80.2764)
    idx.insert("B", 13.0125, 80.2355)
    idx.insert("C", 12.9213, 80.1233)

    # Search near A
    nearest_a = idx.find_nearest(13.0830, 80.2770)
    assert nearest_a is not None
    assert nearest_a["id"] == "A"

    # Search near C
    nearest_c = idx.find_nearest(12.9200, 80.1200)
    assert nearest_c is not None
    assert nearest_c["id"] == "C"
