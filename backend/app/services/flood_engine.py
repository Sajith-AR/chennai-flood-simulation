"""
Spatio-Temporal Flood Spreading Engine.
Computes multi-stage radial buffer dilation, water depth decay,
and color-coded severity classification over time steps t=0..T (dt=1 hr).
Pure Python implementation without SciPy.
"""
import json
import os
from typing import List, Dict, Any, Tuple, Optional
from backend.app.services.geometry import (
    haversine_meters,
    point_in_polygon,
    segment_intersects_polygon,
    point_to_segment_distance_meters,
    create_circle_polygon,
    dilate_polygon,
    latlon_to_meters,
    meters_to_latlon,
)
from backend.app.models.disaster import FloodZoneInput, DisasterParameters

# Color styling constants according to specification
SEVERITY_STYLES = {
    "advisory": {
        "depth_min": 0.05,
        "depth_max": 0.30,
        "fill_color": "#FACC15",
        "stroke_color": "#CA8A04",
        "fill_opacity": 0.40,
    },
    "moderate": {
        "depth_min": 0.30,
        "depth_max": 0.60,
        "fill_color": "#FB923C",
        "stroke_color": "#EA580C",
        "fill_opacity": 0.55,
    },
    "severe": {
        "depth_min": 0.60,
        "depth_max": 1.20,
        "fill_color": "#EF4444",
        "stroke_color": "#B91C1C",
        "fill_opacity": 0.70,
    },
    "catastrophic": {
        "depth_min": 1.20,
        "depth_max": 99.0,
        "fill_color": "#7F1D1D",
        "stroke_color": "#450A0A",
        "fill_opacity": 0.85,
    },
}

# Real-world Chennai topography anchors (lat, lon, ground_elevation_m, runoff_coeff, basin_name)
CHENNAI_TOPOGRAPHIC_ANCHORS = [
    (13.0500, 80.2820, 2.0, 0.70, "Marina Coastline"),
    (13.0012, 80.2565, 2.5, 0.45, "Adyar Estuary"),
    (12.9796, 80.2185, 3.0, 0.80, "Velachery Lake Sink"),
    (12.9350, 80.2150, 2.2, 0.35, "Pallikaranai Marshland"),
    (13.0158, 80.2224, 4.5, 0.85, "Saidapet Adyar Basin"),
    (13.0220, 80.2410, 4.0, 0.80, "Kotturpuram Basin"),
    (12.9100, 80.0800, 4.8, 0.65, "Mudichur Flood Plain"),
    (13.1075, 80.2435, 3.8, 0.85, "Perambur North Basin"),
    (13.1235, 80.2085, 4.2, 0.75, "Retteri Lake Basin"),
    (13.0418, 80.2341, 9.0, 0.90, "T. Nagar High Density"),
    (13.0600, 80.2400, 10.5, 0.85, "Nungambakkam Commercial"),
    (13.0067, 80.2206, 14.0, 0.50, "Guindy Elevated Ridge"),
    (13.0020, 80.1980, 22.0, 0.60, "St. Thomas Mount Ridge"),
]

# Major drainage channel segments [[lat1, lon1], [lat2, lon2], channel_name]
CHENNAI_DRAINAGE_CORRIDORS = [
    ([12.980, 80.050], [13.005, 80.140], "Adyar River Upper"),
    ([13.005, 80.140], [13.0158, 80.2224], "Adyar River Saidapet"),
    ([13.0158, 80.2224], [13.022, 80.241], "Adyar River Kotturpuram"),
    ([13.022, 80.241], [13.001, 80.2565], "Adyar River Estuary"),
    ([13.065, 80.120], [13.072, 80.180], "Cooum River West"),
    ([13.072, 80.180], [13.078, 80.230], "Cooum River Central"),
    ([13.078, 80.230], [13.068, 80.285], "Cooum River Mouth"),
    ([13.200, 80.300], [13.100, 80.285], "Buckingham Canal North"),
    ([13.100, 80.285], [13.040, 80.270], "Buckingham Canal Central"),
    ([13.040, 80.270], [12.900, 80.235], "Buckingham Canal South"),
]


def get_topographic_context(lat: float, lon: float) -> Tuple[float, float, str, float]:
    """
    Inverse-distance weighted topographic interpolation for any Chennai location:
    Returns (elevation_m, runoff_coefficient, nearest_basin, distance_to_drainage_m)
    """
    total_w = 0.0
    weighted_elev = 0.0
    weighted_runoff = 0.0
    closest_basin = "General GCC Watershed"
    min_anchor_dist = float("inf")

    for a_lat, a_lon, elev, runoff, basin in CHENNAI_TOPOGRAPHIC_ANCHORS:
        d_m = haversine_meters(lat, lon, a_lat, a_lon)
        if d_m < min_anchor_dist:
            min_anchor_dist = d_m
            closest_basin = basin
        w = 1.0 / max(50.0, d_m) ** 1.5
        total_w += w
        weighted_elev += elev * w
        weighted_runoff += runoff * w

    interp_elev = round(weighted_elev / max(1e-6, total_w), 1)
    interp_runoff = round(weighted_runoff / max(1e-6, total_w), 2)

    # Calculate distance to nearest river or drainage corridor
    min_channel_dist = float("inf")
    for pt1, pt2, _ in CHENNAI_DRAINAGE_CORRIDORS:
        dist_seg = point_to_segment_distance_meters(lat, lon, pt1[0], pt1[1], pt2[0], pt2[1])
        if dist_seg < min_channel_dist:
            min_channel_dist = dist_seg

    return interp_elev, interp_runoff, closest_basin, round(min_channel_dist, 1)


def classify_severity(depth_m: float) -> Tuple[str, str, str, float]:
    """Returns (severity_level, fill_color, stroke_color, fill_opacity)."""
    if depth_m >= 1.20:
        sev = "catastrophic"
    elif depth_m >= 0.60:
        sev = "severe"
    elif depth_m >= 0.30:
        sev = "moderate"
    else:
        sev = "advisory"

    style = SEVERITY_STYLES[sev]
    return sev, style["fill_color"], style["stroke_color"], style["fill_opacity"]


class FloodSimulationEngine:
    def __init__(self, data_dir: Optional[str] = None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        self.data_dir = data_dir
        self.presets: Dict[str, Dict[str, Any]] = {}
        self._load_presets()

    def _load_presets(self):
        presets_path = os.path.join(self.data_dir, "presets.json")
        if os.path.exists(presets_path):
            with open(presets_path, "r", encoding="utf-8") as f:
                items = json.load(f)
                for item in items:
                    self.presets[item["id"]] = item

    def resolve_flood_zones(
        self, raw_zones: List[FloodZoneInput], default_params: DisasterParameters
    ) -> List[Dict[str, Any]]:
        """
        Normalizes circle, polygon, and preset zones into concrete spatial descriptors.
        """
        resolved = []
        for idx, z in enumerate(raw_zones):
            zone_id = z.id or f"FZ-{idx+1:02d}"
            zone_type = z.type

            # Determine center if provided directly or within coordinates
            center = z.center
            if not center and z.coordinates:
                if len(z.coordinates) == 1 and isinstance(z.coordinates[0], (list, tuple)):
                    center = [float(z.coordinates[0][0]), float(z.coordinates[0][1])]
                elif len(z.coordinates) >= 2 and isinstance(z.coordinates[0], (int, float)):
                    center = [float(z.coordinates[0]), float(z.coordinates[1])]
                elif len(z.coordinates) >= 1 and zone_type == "circle":
                    center = [float(z.coordinates[0][0]), float(z.coordinates[0][1])]

            target_depth = z.initial_depth_m if z.initial_depth_m is not None else default_params.flood_depth_meters

            if zone_type == "preset" and z.preset_key and z.preset_key in self.presets:
                preset = self.presets[z.preset_key]
                resolved.append({
                    "id": zone_id,
                    "type": "circle",
                    "center": preset["center"],
                    "initial_radius": preset["radius_meters"],
                    "initial_depth": z.initial_depth_m if z.initial_depth_m is not None else preset["flood_depth_meters"],
                    "spread_rate": preset.get("spread_rate_meters_hr", default_params.spread_rate_meters_hr),
                })
            elif (zone_type == "circle" or (not zone_type and center)) and center:
                resolved.append({
                    "id": zone_id,
                    "type": "circle",
                    "center": center,
                    "initial_radius": z.radius_meters or 1500.0,
                    "initial_depth": target_depth,
                    "spread_rate": default_params.spread_rate_meters_hr,
                })
            elif zone_type == "polygon" and z.coordinates and len(z.coordinates) >= 3:
                # Calculate centroid
                coords = z.coordinates
                avg_lat = sum(c[0] for c in coords) / len(coords)
                avg_lon = sum(c[1] for c in coords) / len(coords)
                # Approximate initial radius as max distance to vertex
                max_r = max(haversine_meters(avg_lat, avg_lon, c[0], c[1]) for c in coords)
                resolved.append({
                    "id": zone_id,
                    "type": "polygon",
                    "center": [avg_lat, avg_lon],
                    "initial_coordinates": coords,
                    "initial_radius": max_r,
                    "initial_depth": target_depth,
                    "spread_rate": default_params.spread_rate_meters_hr,
                })
            elif center:  # Fallback if circle coordinates given
                resolved.append({
                    "id": zone_id,
                    "type": "circle",
                    "center": center,
                    "initial_radius": z.radius_meters or 1500.0,
                    "initial_depth": target_depth,
                    "spread_rate": default_params.spread_rate_meters_hr,
                })

        return resolved

    def compute_timeline(
        self,
        raw_zones: List[FloodZoneInput],
        params: DisasterParameters
    ) -> List[Dict[str, Any]]:
        """
        Computes flood progression across discrete time steps t=0..duration_hours.
        Returns list of time step descriptors with GeoJSON features and depth models.
        """
        resolved_zones = self.resolve_flood_zones(raw_zones, params)
        timeline = []
        num_steps = int(params.duration_hours / params.time_step_hours) + 1

        for step in range(num_steps):
            t_hours = step * params.time_step_hours
            features = []
            step_zones_state = []

            for rz in resolved_zones:
                # Dilation expansion distance
                # d_exp = v_spread * t * (intensity / 3.0)
                intensity_factor = max(0.5, params.rainfall_intensity_mm_hr / 65.0)
                d_exp = rz["spread_rate"] * t_hours * intensity_factor
                current_radius = rz["initial_radius"] + d_exp

                # Depth progression over time:
                # f_time(t) = min(1.0, 0.3 + 0.7 * (t / (T * 0.6)))
                t_peak = max(1.0, params.duration_hours * 0.6)
                f_time = min(1.0, 0.3 + 0.7 * (t_hours / t_peak))
                peak_depth = rz["initial_depth"] * f_time

                # Generate multi-tier severity polygons matching hydrologic depth decay
                tiers = []
                # Full extent (advisory)
                tiers.append({
                    "sev": "advisory",
                    "depth": round(min(peak_depth, 0.25), 2),
                    "radius": current_radius,
                })

                # Moderate tier (>= 0.30m)
                if peak_depth >= 0.30:
                    r_mod = current_radius * max(0.35, 1.0 - (0.30 / peak_depth))
                    tiers.append({
                        "sev": "moderate",
                        "depth": round(min(peak_depth, 0.45), 2),
                        "radius": r_mod,
                    })

                # Severe tier (>= 0.60m)
                if peak_depth >= 0.60:
                    r_sev = current_radius * max(0.25, 1.0 - (0.50 / peak_depth))
                    tiers.append({
                        "sev": "severe",
                        "depth": round(min(peak_depth, 0.95), 2),
                        "radius": r_sev,
                    })

                # Catastrophic tier (>= 1.20m)
                if peak_depth >= 1.20:
                    r_cat = current_radius * max(0.15, 1.0 - (1.0 / peak_depth))
                    tiers.append({
                        "sev": "catastrophic",
                        "depth": round(peak_depth, 2),
                        "radius": r_cat,
                    })

                for tier_info in tiers:
                    t_sev = tier_info["sev"]
                    t_depth = tier_info["depth"]
                    t_radius = tier_info["radius"]

                    # Topographic contouring
                    c_lat, c_lon = rz["center"]
                    c_elev, _, _, _ = get_topographic_context(c_lat, c_lon)
                    poly_latlon = []

                    if rz["type"] == "circle":
                        base_points = create_circle_polygon(c_lat, c_lon, t_radius, num_points=32)[:-1]
                    else:
                        d_exp_tier = max(0.0, d_exp * (t_radius / max(1.0, current_radius)))
                        base_points = dilate_polygon(rz["initial_coordinates"], d_exp_tier)[:-1]

                    import math
                    for pt in base_points:
                        # Ray from center to this nominal point
                        d_nominal = haversine_meters(c_lat, c_lon, pt[0], pt[1])
                        if d_nominal < 1.0:
                            poly_latlon.append(pt)
                            continue
                            
                        # Find the actual extent along this ray where depth >= t_depth
                        low = 0.0
                        high = d_nominal * 2.0  # Allow some expansion if terrain is low
                        best_lat, best_lon = c_lat, c_lon
                        
                        # Calculate angle
                        dx, dy = latlon_to_meters(pt[0], pt[1], c_lat, c_lon)
                        theta = math.atan2(dy, dx)
                        
                        for _ in range(8):
                            mid = (low + high) / 2.0
                            mdx = mid * math.cos(theta)
                            mdy = mid * math.sin(theta)
                            mlat, mlon = meters_to_latlon(mdx, mdy, c_lat, c_lon)
                            pt_elev, _, _, _ = get_topographic_context(mlat, mlon)
                            
                            decay = max(0.1, 1.0 - (mid / (current_radius + 1.0)))
                            base_depth = peak_depth * decay
                            d_r = max(0.0, base_depth + c_elev - pt_elev)
                            
                            if d_r >= t_depth:
                                best_lat, best_lon = mlat, mlon
                                low = mid
                            else:
                                high = mid
                                
                        poly_latlon.append([round(best_lat, 6), round(best_lon, 6)])
                    
                    poly_latlon.append(poly_latlon[0])  # Close ring

                    sev_style = SEVERITY_STYLES[t_sev]
                    geojson_coords = [[[round(pt[1], 6), round(pt[0], 6)] for pt in poly_latlon]]

                    elev_m, runoff_c, basin_n, dist_ch = get_topographic_context(rz["center"][0], rz["center"][1])

                    features.append({
                        "type": "Feature",
                        "id": f"{rz['id']}_t{step}_{t_sev}",
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": geojson_coords,
                        },
                        "properties": {
                            "zone_id": rz["id"],
                            "time_step": step,
                            "time_elapsed_hours": t_hours,
                            "water_depth_m": t_depth,
                            "water_depth": t_depth,
                            "depth_meters": t_depth,
                            "depth": t_depth,
                            "radius_meters": round(t_radius, 1),
                            "severity": t_sev,
                            "severity_level": t_sev,
                            "ground_elevation_m": elev_m,
                            "runoff_coefficient": runoff_c,
                            "drainage_basin": basin_n,
                            "drainage_distance_m": dist_ch,
                            "fill_color": sev_style["fill_color"],
                            "stroke_color": sev_style["stroke_color"],
                            "fill_opacity": sev_style["fill_opacity"],
                        },
                    })

                step_zones_state.append({
                    "id": rz["id"],
                    "type": rz["type"],
                    "center": rz["center"],
                    "current_radius": current_radius,
                    "peak_depth": peak_depth,
                    "polygon_latlon": create_circle_polygon(rz["center"][0], rz["center"][1], current_radius, num_points=32) if rz["type"] == "circle" else dilate_polygon(rz["initial_coordinates"], d_exp),
                })

            timeline.append({
                "time_step": step,
                "time_elapsed_hours": t_hours,
                "flood_polygons": {
                    "type": "FeatureCollection",
                    "features": features,
                },
                "zones_state": step_zones_state,
            })

        return timeline

    def get_point_depth(self, lat: float, lon: float, step_zones_state: List[Dict[str, Any]]) -> float:
        """
        Calculates maximum flood depth at coordinate (lat, lon) given zones state at time step.
        Properly checks polygon boundaries and interiors so points inside or on polygons
        receive the full inundated flood depth.
        """
        max_depth = 0.0
        for z in step_zones_state:
            # Handle GeoJSON Feature representation
            if isinstance(z, dict) and "geometry" in z:
                feat_depth = float(z.get("properties", {}).get("depth_meters", z.get("properties", {}).get("water_depth_m", 0.0)))
                poly = z["geometry"].get("coordinates", [])
                if point_in_polygon(lat, lon, poly):
                    if feat_depth > max_depth:
                        max_depth = feat_depth
                continue

            peak_depth = float(z.get("peak_depth", z.get("water_depth_m", z.get("initial_depth", 0.0))))
            poly = z.get("polygon_latlon")

            # Check polygon interior and boundary directly
            if poly and point_in_polygon(lat, lon, poly):
                if peak_depth > max_depth:
                    max_depth = peak_depth
                continue

            # Radial distance check for circular zones or fallback
            c = z.get("center")
            if c:
                radius_m = float(z.get("current_radius", z.get("initial_radius", 0.0)))
                dist_m = haversine_meters(lat, lon, c[0], c[1])
                if dist_m <= radius_m:
                    decay = max(0.1, 1.0 - (dist_m / (radius_m + 1.0)))
                    depth = peak_depth * decay
                    if depth > max_depth:
                        max_depth = depth

        return round(max_depth, 2)

    def get_edge_depth(
        self,
        lat1: float, lon1: float,
        lat2: float, lon2: float,
        step_zones_state: List[Dict[str, Any]],
        is_elevated: bool = False
    ) -> float:
        """
        Calculates maximum water depth along road edge (lat1, lon1) -> (lat2, lon2).
        Properly checks polygon boundaries and interiors using analytical segment-polygon
        intersection, so roads inside or intersecting polygons receive the full inundated flood depth.
        If road is elevated (e.g. flyover), surface flood < 1.5m is ignored.
        """
        max_edge_depth = 0.0
        mid_lat = (lat1 + lat2) / 2.0
        mid_lon = (lon1 + lon2) / 2.0

        for z in step_zones_state:
            # Handle GeoJSON Feature
            if isinstance(z, dict) and "geometry" in z:
                feat_depth = float(z.get("properties", {}).get("depth_meters", z.get("properties", {}).get("water_depth_m", 0.0)))
                poly = z["geometry"].get("coordinates", [])
                if segment_intersects_polygon([lat1, lon1], [lat2, lon2], poly):
                    if feat_depth > max_edge_depth:
                        max_edge_depth = feat_depth
                continue

            peak_depth = float(z.get("peak_depth", z.get("water_depth_m", z.get("initial_depth", 0.0))))
            poly = z.get("polygon_latlon")

            # Analytical segment-polygon intersection check
            if poly and segment_intersects_polygon([lat1, lon1], [lat2, lon2], poly):
                if peak_depth > max_edge_depth:
                    max_edge_depth = peak_depth
                continue

            # Check point depths at endpoints and midpoint
            d1 = self.get_point_depth(lat1, lon1, [z])
            d2 = self.get_point_depth(lat2, lon2, [z])
            d_mid = self.get_point_depth(mid_lat, mid_lon, [z])
            point_max = max(d1, d2, d_mid)
            if point_max > max_edge_depth:
                max_edge_depth = point_max

            # Radial distance to center fallback
            c = z.get("center")
            if c:
                radius_m = float(z.get("current_radius", z.get("initial_radius", 0.0)))
                dist_to_seg = point_to_segment_distance_meters(
                    c[0], c[1], lat1, lon1, lat2, lon2
                )
                if dist_to_seg <= radius_m:
                    decay = max(0.1, 1.0 - (dist_to_seg / (radius_m + 1.0)))
                    depth = peak_depth * decay
                    if depth > max_edge_depth:
                        max_edge_depth = depth

        if is_elevated and max_edge_depth < 1.5:
            return 0.0

        return round(max_edge_depth, 2)
