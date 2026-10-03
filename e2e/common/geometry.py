"""
Self-contained geometry engine for opaque-box verification of spatial claims:
- Haversine distance calculations
- Point-in-polygon ray casting
- Flood polygon intersection tests
- GCC boundary validation
Independent of backend implementation.
"""

import math
from typing import List, Tuple, Union, Dict, Any
from .config import GCC_BOUNDS

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance between two points in kilometers."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_KM * c


def is_coord_in_gcc(lat: float, lon: float) -> bool:
    """Check if coordinate is within Greater Chennai Corporation (GCC) operational bounds."""
    return (GCC_BOUNDS["lat_min"] <= lat <= GCC_BOUNDS["lat_max"] and
            GCC_BOUNDS["lon_min"] <= lon <= GCC_BOUNDS["lon_max"])


def point_in_polygon(point_lat: float, point_lon: float, polygon: List[List[float]]) -> bool:
    """
    Standard ray-casting algorithm to determine if a point is inside a polygon.
    Accepts polygon vertices either as [lat, lon] or GeoJSON [lon, lat].
    Automatically infers coordinate ordering based on Chennai latitude range (12.8 - 13.3).
    """
    if not polygon or len(polygon) < 3:
        return False

    # Normalize vertices to (lat, lon)
    norm_poly = []
    for vertex in polygon:
        c1, c2 = vertex[0], vertex[1]
        # In Chennai, Lat is ~13.x and Lon is ~80.x
        if 12.0 <= c1 <= 14.0 and 79.0 <= c2 <= 81.0:
            norm_poly.append((c1, c2))
        elif 79.0 <= c1 <= 81.0 and 12.0 <= c2 <= 14.0:
            norm_poly.append((c2, c1))
        else:
            # Default assumption: lat, lon
            norm_poly.append((c1, c2))

    n = len(norm_poly)
    inside = False
    x, y = point_lat, point_lon

    p1x, p1y = norm_poly[0]
    for i in range(1, n + 1):
        p2x, p2y = norm_poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside


def point_in_circle(lat: float, lon: float, center_lat: float, center_lon: float, radius_meters: float) -> bool:
    """Check if point is within circle radius in meters."""
    dist_km = haversine_km(lat, lon, center_lat, center_lon)
    return (dist_km * 1000.0) <= radius_meters


def route_intersects_deep_flood(
    route_coords: List[List[float]],
    flood_features: List[Dict[str, Any]],
    depth_threshold_meters: float
) -> Tuple[bool, int]:
    """
    Verifies if any node along a route path falls within a flood polygon
    whose water depth exceeds the specified threshold.
    Returns (has_violation, count_of_violating_nodes).
    """
    violating_nodes = 0

    for coord in route_coords:
        c1, c2 = coord[0], coord[1]
        lat = c1 if (12.0 <= c1 <= 14.0) else c2
        lon = c2 if (12.0 <= c1 <= 14.0) else c1

        for feat in flood_features:
            props = feat.get("properties", {})
            depth = props.get("depth_meters", props.get("water_depth", 0.0))
            if depth >= depth_threshold_meters:
                geom = feat.get("geometry", {})
                gtype = geom.get("type", "")
                poly_coords = geom.get("coordinates", [])

                if gtype == "Polygon" and poly_coords:
                    outer_ring = poly_coords[0]
                    if point_in_polygon(lat, lon, outer_ring):
                        violating_nodes += 1
                        break
                elif gtype == "MultiPolygon":
                    for sub_poly in poly_coords:
                        if sub_poly and point_in_polygon(lat, lon, sub_poly[0]):
                            violating_nodes += 1
                            break

    return (violating_nodes > 0, violating_nodes)
