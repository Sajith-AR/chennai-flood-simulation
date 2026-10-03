"""
Chennai Road Network Graph Engine.
Loads offline road network into NetworkX, builds pure-Python spatial index,
and dynamically calculates flood impedance penalties and edge closures.
STRICT CONSTRAINT: No SciPy dependencies.
"""
import json
import os
from typing import Dict, Any, List, Tuple, Optional
import networkx as nx

from backend.app.services.geometry import (
    haversine,
    haversine_meters,
    SpatialGridIndex,
)
from backend.app.services.flood_engine import FloodSimulationEngine


class RoadNetworkEngine:
    def __init__(self, data_path: Optional[str] = None):
        if data_path is None:
            data_path = os.path.join(os.path.dirname(__file__), "..", "data", "chennai_roads.json")
        self.data_path = data_path
        self.base_graph = nx.DiGraph()
        self.nodes_data: Dict[str, Dict[str, Any]] = {}
        self.edges_data: Dict[str, Dict[str, Any]] = {}
        self.spatial_index = SpatialGridIndex(cell_size_km=2.0)
        self.flood_engine = FloodSimulationEngine()
        self.load_network()

    def load_network(self):
        """Loads nodes and edges into NetworkX and spatial index."""
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Road network data file not found: {self.data_path}")

        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for node in data.get("nodes", []):
            nid = node["id"]
            self.nodes_data[nid] = node
            self.base_graph.add_node(nid, **node)
            self.spatial_index.insert(nid, node["lat"], node["lon"], node)

        for edge in data.get("edges", []):
            eid = edge["id"]
            src = edge["source"]
            tgt = edge["target"]
            dist_km = edge["distance_km"]
            speed_kmh = max(10, edge.get("speed_kmh", 40))
            # Base free-flow travel time in minutes
            base_time_min = (dist_km / speed_kmh) * 60.0

            edge_attr = {
                **edge,
                "base_time_min": base_time_min,
                "weight": base_time_min,
                "water_depth_m": 0.0,
                "is_closed": False,
            }
            self.edges_data[eid] = edge_attr
            self.base_graph.add_edge(src, tgt, **edge_attr)

    def find_nearest_node(self, lat: float, lon: float) -> Optional[str]:
        """Finds nearest road network node ID to (lat, lon)."""
        nearest = self.spatial_index.find_nearest(lat, lon)
        return nearest["id"] if nearest else None

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        return self.nodes_data.get(node_id)

    def get_route_coordinates(self, node_path: List[str]) -> List[List[float]]:
        """Extracts list of [lat, lon] coordinates along node path."""
        coords = []
        for nid in node_path:
            node = self.nodes_data.get(nid)
            if node:
                coords.append([node["lat"], node["lon"]])
        return coords

    def get_route_metrics(self, G: nx.DiGraph, node_path: List[str]) -> Tuple[float, float]:
        """Computes (total_distance_km, total_travel_time_min) along node path."""
        total_dist = 0.0
        total_time = 0.0
        for i in range(len(node_path) - 1):
            u, v = node_path[i], node_path[i + 1]
            if G.has_edge(u, v):
                edge_data = G[u][v]
                total_dist += edge_data.get("distance_km", 0.0)
                total_time += edge_data.get("weight", 0.0)
            else:
                u_node = self.nodes_data.get(u)
                v_node = self.nodes_data.get(v)
                if u_node and v_node:
                    d = haversine(u_node["lat"], u_node["lon"], v_node["lat"], v_node["lon"])
                    total_dist += d
                    total_time += (d / 40.0) * 60.0
        return round(total_dist, 2), round(total_time, 1)

    def build_dynamic_graph(
        self,
        step_zones_state: List[Dict[str, Any]],
        closure_threshold_m: float = 0.50,
        slowdown_threshold_m: float = 0.10,
        is_amphibious: bool = False,
    ) -> nx.DiGraph:
        """
        Constructs a transient dynamic NetworkX graph with flood impedance weights.
        Roads with depth >= closure_threshold_m are marked closed (weight = inf or removed).
        Roads with slowdown_threshold_m <= depth < closure_threshold_m are penalized:
            weight = base_time * (1.0 + 8.0 * depth)
        Amphibious vehicles maintain steady pace in water.
        """
        G = self.base_graph.copy()

        for u, v, data in list(G.edges(data=True)):
            u_node = self.nodes_data[u]
            v_node = self.nodes_data[v]
            is_elevated = data.get("is_elevated", False)

            depth = self.flood_engine.get_edge_depth(
                u_node["lat"], u_node["lon"],
                v_node["lat"], v_node["lon"],
                step_zones_state,
                is_elevated=is_elevated
            )

            base_time = data.get("base_time_min", 1.0)
            data["water_depth_m"] = round(depth, 2)

            if depth >= closure_threshold_m:
                data["is_closed"] = True
                data["weight"] = float("inf")
                # Remove edge from reachable routing graph
                G.remove_edge(u, v)
            elif depth >= slowdown_threshold_m:
                data["is_closed"] = False
                if is_amphibious:
                    data["weight"] = base_time * 1.5
                else:
                    data["weight"] = base_time * (1.0 + 8.0 * depth)
            else:
                data["is_closed"] = False
                data["weight"] = base_time if not is_amphibious else base_time * 1.5

        return G

    def get_severed_roads_count(self, dynamic_graph: nx.DiGraph) -> int:
        """Returns number of road segments closed due to inundation."""
        return self.base_graph.number_of_edges() - dynamic_graph.number_of_edges()
