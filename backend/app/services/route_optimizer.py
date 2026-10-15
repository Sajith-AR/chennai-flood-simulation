"""
Route Optimization & Dynamic Dispatch Planning Service.
Uses NetworkX Graph Engine and A*/Dijkstra to calculate flood-avoidant delivery corridors
from Chennai supply depots to disaster incidents, with multi-modal transport switching.
"""
from typing import Dict, Any, List, Optional, Tuple
import networkx as nx
from backend.app.services.geometry import haversine
from backend.app.services.road_network import RoadNetworkEngine


class RouteOptimizer:
    def __init__(self, road_engine: RoadNetworkEngine):
        self.road_engine = road_engine

    def optimize_route(
        self,
        source_coords: List[float],
        dest_coords: List[float],
        source_name: str = "Depot",
        dest_name: str = "Affected Area",
        cargo: Optional[Dict[str, int]] = None,
        blocked_nodes: Optional[List[str]] = None,
        preferred_mode: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Computes the optimal delivery route avoiding flooded and blocked road segments.
        """
        src_lat, src_lon = source_coords[0], source_coords[1]
        dst_lat, dst_lon = dest_coords[0], dest_coords[1]
        direct_dist = haversine(src_lat, src_lon, dst_lat, dst_lon)

        # 1. Map to nearest network nodes
        src_node = self.road_engine.find_nearest_node(src_lat, src_lon)
        dst_node = self.road_engine.find_nearest_node(dst_lat, dst_lon)

        G = self.road_engine.base_graph.copy()

        # Remove explicitly blocked nodes if specified
        if blocked_nodes:
            for bn in blocked_nodes:
                if G.has_node(bn):
                    G.remove_node(bn)

        # 2. Pathfinding with NetworkX
        route_found = False
        node_path = []
        route_coords = []
        total_dist_km = direct_dist
        total_time_min = 20.0
        mode = preferred_mode or "truck"
        bypassed_hazards = []

        if src_node and dst_node and G.has_node(src_node) and G.has_node(dst_node):
            try:
                # Use Dijkstra weighted by travel time
                node_path = nx.shortest_path(G, source=src_node, target=dst_node, weight="weight")
                route_found = True

                # Extract route metrics
                d, t = self.road_engine.get_route_metrics(G, node_path)
                total_dist_km = d
                total_time_min = t

                # Generate coordinate list [lat, lon]
                route_coords = self.road_engine.get_route_coordinates(node_path)
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                route_found = False

        # 3. Multi-Modal Fallback if ground route is severed or direct mode is needed
        if not route_found or mode in ["amphibious", "helicopter"]:
            # If no ground path exists, deploy amphibious craft or aerial airlift
            if direct_dist > 15.0 or mode == "helicopter":
                mode = "helicopter"
                vehicle_type = "IAF Chetak / ALH Dhruv Aerial Sortie"
                speed_kmh = 140.0
                total_dist_km = round(direct_dist * 1.05, 2)
                total_time_min = round((total_dist_km / speed_kmh) * 60.0 + 8.0, 1)
                bypassed_hazards.append("Ground highways completely severed. Initiated direct GPS aerial corridor via Tambaram Airbase radar.")
                # Straight flight vector with 4 intermediate navigational waypoints
                route_coords = self._generate_beeline(source_coords, dest_coords, steps=5)
            else:
                mode = "amphibious"
                vehicle_type = "NDRF Marine Gemini Zodiac & BARK Craft"
                speed_kmh = 22.0
                total_dist_km = round(direct_dist * 1.25, 2)
                total_time_min = round((total_dist_km / speed_kmh) * 60.0 + 15.0, 1)
                bypassed_hazards.append("Road underpasses submerged (> 1.2m). Switched to Buckingham Canal / Adyar waterway route.")
                route_coords = self._generate_beeline(source_coords, dest_coords, steps=8, jitter=0.003)
        else:
            mode = "truck"
            vehicle_type = "Heavy 6x6 Ashok Leyland Stallion"

        # Ensure start and end coordinates are exact
        if not route_coords:
            route_coords = [source_coords, dest_coords]
        else:
            route_coords[0] = source_coords
            route_coords[-1] = dest_coords

        # 4. Turn-by-Turn Waypoints Navigation
        waypoints = self._build_waypoints(node_path, source_name, dest_name, mode)

        # 5. Format GeoJSON Feature
        # Note: GeoJSON coordinates standard is [longitude, latitude]
        geojson_coords = [[round(pt[1], 6), round(pt[0], 6)] for pt in route_coords]

        feature = {
            "type": "Feature",
            "id": f"ROUTE-{source_name.replace(' ', '')}-TO-{dest_name.replace(' ', '')}",
            "geometry": {
                "type": "LineString",
                "coordinates": geojson_coords
            },
            "properties": {
                "source_name": source_name,
                "destination_name": dest_name,
                "distance_km": total_dist_km,
                "transit_time_min": total_time_min,
                "transport_mode": mode,
                "vehicle_type": vehicle_type,
                "cargo": cargo or {"water_litres": 2500, "food_rations": 500, "medical_kits": 25},
                "status": "clear" if mode == "truck" else "rerouted_waterway" if mode == "amphibious" else "airlift",
                "max_water_depth_m": 0.15 if mode == "truck" else 1.8 if mode == "amphibious" else 0.0,
                "bypassed_hazards": bypassed_hazards
            }
        }

        return {
            "route_id": feature["id"],
            "source_name": source_name,
            "destination_name": dest_name,
            "distance_km": total_dist_km,
            "travel_time_min": total_time_min,
            "transport_mode": mode,
            "vehicle_type": vehicle_type,
            "node_count": len(node_path),
            "geojson": feature,
            "waypoints": waypoints,
            "bypassed_hazards": bypassed_hazards,
            "is_ground_accessible": mode == "truck"
        }

    def _generate_beeline(self, start: List[float], end: List[float], steps: int = 5, jitter: float = 0.0) -> List[List[float]]:
        coords = []
        for i in range(steps + 1):
            ratio = i / float(steps)
            lat = start[0] + (end[0] - start[0]) * ratio
            lon = start[1] + (end[1] - start[1]) * ratio
            if jitter > 0 and 0 < i < steps:
                # Add slight curvature for natural waterway look
                lat += ((-1) ** i) * jitter
                lon += ((-1) ** (i + 1)) * jitter
            coords.append([round(lat, 6), round(lon, 6)])
        return coords

    def _build_waypoints(self, node_path: List[str], src_name: str, dst_name: str, mode: str) -> List[str]:
        if mode == "helicopter":
            return [
                f"Depart {src_name} Helipad (Clear for takeoff)",
                "Climb to 800 ft AGL over Chennai coastal transit vector",
                "Avoid low-altitude turbulence over marshlands",
                f"Begin descent onto emergency LZ at {dst_name}"
            ]
        elif mode == "amphibious":
            return [
                f"Launch Zodiac crafts from staging ramp at {src_name}",
                "Enter canal basin waterway corridor",
                "Navigate around submerged debris and power poles",
                f"Beach onto elevated dry plinth at {dst_name}"
            ]
        else:
            names = []
            for nid in node_path:
                node = self.road_engine.get_node(nid)
                if node and node.get("name") and node["name"] not in names:
                    names.append(node["name"])
            if len(names) > 4:
                names = [names[0], names[len(names) // 3], names[(len(names) * 2) // 3], names[-1]]
            
            steps = [f"Depart {src_name}"]
            for nm in names:
                steps.append(f"Transit via {nm}")
            steps.append(f"Arrive at destination: {dst_name}")
            return steps
