"""
Evacuation Planning & Capacity-Constrained Shelter Allocation Solver.
Calculates shortest safe paths on the dynamic inundated road graph using Dijkstra/A*,
allocates evacuees to nearest available shelters without exceeding 100% capacity,
and flags isolated/submerged clusters requiring airlift/boat rescue.
STRICT CONSTRAINT: No SciPy dependencies.
"""
import json
import os
from typing import List, Dict, Any, Tuple, Optional
import networkx as nx

from backend.app.services.geometry import haversine, point_in_polygon
from backend.app.services.road_network import RoadNetworkEngine
from backend.app.services.flood_engine import FloodSimulationEngine


class EvacuationSolver:
    def __init__(
        self,
        road_engine: RoadNetworkEngine,
        data_dir: Optional[str] = None
    ):
        self.road_engine = road_engine
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        self.data_dir = data_dir
        self.shelters: List[Dict[str, Any]] = []
        self.population_clusters: List[Dict[str, Any]] = []
        self._load_data()

    def _load_data(self):
        shelters_path = os.path.join(self.data_dir, "shelters.json")
        if os.path.exists(shelters_path):
            with open(shelters_path, "r", encoding="utf-8") as f:
                self.shelters = json.load(f)

        clusters_path = os.path.join(self.data_dir, "population_clusters.json")
        if os.path.exists(clusters_path):
            with open(clusters_path, "r", encoding="utf-8") as f:
                self.population_clusters = json.load(f)

    def solve_evacuation(
        self,
        dynamic_graph: nx.DiGraph,
        step_zones_state: List[Dict[str, Any]],
        flood_engine: FloodSimulationEngine,
        selected_shelter_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Solves capacity-constrained evacuee assignment and safe pathfinding.
        Returns:
            - evacuation_routes_geojson: FeatureCollection of LineStrings
            - shelter_allocations: List of shelter status objects
            - isolated_clusters: List of cut-off clusters requiring airlift
            - summary: evacuee numbers and metrics
        """
        # Filter available shelters
        active_shelters = [
            dict(s) for s in self.shelters
            if not selected_shelter_ids or s["id"] in selected_shelter_ids
        ]

        # Initialize shelter capacity tracking
        shelter_state = {}
        for s in active_shelters:
            sid = s["id"]
            lat, lon = s["location"]
            # Check if shelter itself is inundated
            s_depth = flood_engine.get_point_depth(lat, lon, step_zones_state)
            nearest_node = self.road_engine.find_nearest_node(lat, lon)
            is_compromised = not nearest_node or not dynamic_graph.has_node(nearest_node) or dynamic_graph.degree(nearest_node) == 0
            
            max_cap = s.get("capacity", 1000)
            baseline_occupied = min(max_cap, max(0, s.get("current_occupancy", 0)))
            avail_cap = max_cap - baseline_occupied

            shelter_state[sid] = {
                "id": sid,
                "name": s["name"],
                "neighborhood": s.get("neighborhood", ""),
                "location": s["location"],
                "total_capacity": max_cap,
                "baseline_occupied": baseline_occupied,
                "newly_allocated": 0,
                "remaining_capacity": avail_cap,
                "is_compromised": is_compromised,
                "nearest_node": nearest_node,
                "status": "compromised" if is_compromised else "available",
            }

        # Initialize flow and base_time on dynamic graph for iterative assignment
        for u, v, d in dynamic_graph.edges(data=True):
            if "base_time" not in d:
                d["base_time"] = d.get("weight", 1.0)
            d["flow"] = 0.0

        evacuation_routes = []
        isolated_clusters = []
        total_affected_pop = 0
        total_evacuated_pop = 0

        # Process each population cluster
        active_demands = []
        completed_demands = []
        for c in self.population_clusters:
            cid = c["id"]
            c_name = c["name"]
            c_lat, c_lon = c["location"]
            total_pop = c["estimated_population"]

            # Determine flood depth at cluster centroid
            c_depth = flood_engine.get_point_depth(c_lat, c_lon, step_zones_state)

            # Evacuation demand rule
            if c_depth < 0.15:
                # No forced evacuation needed at this time step
                continue

            total_affected_pop += total_pop

            if c_depth >= 0.80:
                evac_ratio = 1.00
            elif c_depth >= 0.40:
                evac_ratio = 0.75
            else:
                evac_ratio = 0.35

            demand = int(total_pop * evac_ratio)
            if demand <= 0:
                continue

            c_node = self.road_engine.find_nearest_node(c_lat, c_lon)
            if not c_node or not dynamic_graph.has_node(c_node) or dynamic_graph.degree(c_node) == 0:
                # Cluster node is completely cut off from road network
                isolated_clusters.append({
                    "cluster_id": cid,
                    "name": c_name,
                    "location": [c_lat, c_lon],
                    "trapped_population": demand,
                    "requires_airlift": True,
                    "reason": f"Cluster access road severed by deep flood {c_depth:.2f}m (requires boat/airlift rescue)",
                })
                continue

            req = {
                "cid": cid, "c_name": c_name, "c_lat": c_lat, "c_lon": c_lon,
                "c_node": c_node, "unassigned": demand, "c_depth": c_depth,
                "route_agg": {}
            }
            active_demands.append(req)
            completed_demands.append(req)

        # Iterative assignment: dynamically re-route chunks to avoid congestion
        chunk_size = 2000
        while active_demands:
            req = active_demands.pop(0)

            # Find reachable shelters with available capacity dynamically based on updated weights
            candidates = []
            for sid, s_info in shelter_state.items():
                if s_info["remaining_capacity"] <= 0 or s_info["status"] == "compromised":
                    continue

                s_node = s_info["nearest_node"]
                if not s_node or not dynamic_graph.has_node(s_node):
                    continue

                try:
                    path = nx.shortest_path(
                        dynamic_graph, source=req["c_node"], target=s_node, weight="weight"
                    )
                    dist_km, time_min = self.road_engine.get_route_metrics(dynamic_graph, path)
                    candidates.append({
                        "shelter_id": sid,
                        "node_path": path,
                        "distance_km": dist_km,
                        "travel_time_min": time_min,
                    })
                except (nx.NetworkXNoPath, nx.NodeNotFound):
                    continue

            if not candidates:
                isolated_clusters.append({
                    "cluster_id": req["cid"],
                    "name": req["c_name"],
                    "location": [req["c_lat"], req["c_lon"]],
                    "trapped_population": req["unassigned"],
                    "requires_airlift": True,
                    "reason": "Shelter capacities exhausted for partial population or all routes submerged",
                })
                req["unassigned"] = 0
                continue

            # Sort by travel time ascending
            candidates.sort(key=lambda x: x["travel_time_min"])
            best_cand = candidates[0]

            sid = best_cand["shelter_id"]
            s_info = shelter_state[sid]
            alloc = min(req["unassigned"], s_info["remaining_capacity"], chunk_size)

            if alloc <= 0:
                continue

            s_info["newly_allocated"] += alloc
            s_info["remaining_capacity"] -= alloc
            req["unassigned"] -= alloc
            total_evacuated_pop += alloc

            route_key = (sid, tuple(best_cand["node_path"]))
            if route_key not in req["route_agg"]:
                req["route_agg"][route_key] = {
                    "shelter_id": sid,
                    "node_path": best_cand["node_path"],
                    "distance_km": best_cand["distance_km"],
                    "travel_time_min": best_cand["travel_time_min"],
                    "alloc": 0,
                    "route_congested_time": best_cand["travel_time_min"]
                }
            
            req["route_agg"][route_key]["alloc"] += alloc

            # Iterative assignment: update graph flow and edge weights dynamically
            route_congested_time = 0.0
            for i in range(len(best_cand["node_path"]) - 1):
                u = best_cand["node_path"][i]
                v = best_cand["node_path"][i+1]
                if dynamic_graph.has_edge(u, v):
                    dynamic_graph[u][v]["flow"] += alloc
                    f = dynamic_graph[u][v]["flow"]
                    cap = dynamic_graph[u][v].get("capacity", 8000.0)
                    v_c_ratio = f / cap
                    bpr = min(5.0, 1.0 + 0.15 * (v_c_ratio ** 4))
                    dynamic_graph[u][v]["bpr_delay_factor"] = bpr
                    dynamic_graph[u][v]["weight"] = dynamic_graph[u][v]["base_time"] * bpr
                    route_congested_time += dynamic_graph[u][v]["weight"]

            if route_congested_time > 0:
                req["route_agg"][route_key]["route_congested_time"] = route_congested_time

            if req["unassigned"] > 0:
                active_demands.append(req)

        # Generate route objects for the aggregated paths
        route_idx = 1
        for req in completed_demands:
            cid = req["cid"]
            c_name = req["c_name"]
            c_lat = req["c_lat"]
            c_lon = req["c_lon"]
            c_depth = req["c_depth"]
            cluster_route_agg = req["route_agg"]

            for route_key, agg in cluster_route_agg.items():
                sid = agg["shelter_id"]
                s_info = shelter_state[sid]
                
                route_coords = self.road_engine.get_route_coordinates(agg["node_path"])
                raw_pts = route_coords + [s_info["location"]]
                if c_depth < 0.50:
                    raw_pts = [[c_lat, c_lon]] + raw_pts
                full_coords = []
                for pt in raw_pts:
                    if not full_coords or haversine(full_coords[-1][0], full_coords[-1][1], pt[0], pt[1]) > 0.005:
                        full_coords.append(pt)

                # Differentiate ID if multiple paths to same shelter
                route_id = f"EVAC-{cid}-{sid}"
                if len([k for k in cluster_route_agg.keys() if k[0] == sid]) > 1:
                    route_id += f"-P{route_idx}"
                    route_idx += 1
                
                route_status = "rerouted" if c_depth >= 0.50 else ("warning" if c_depth >= 0.30 else "clear")
                bpr_delay_factor = round(agg["route_congested_time"] / max(0.1, agg["travel_time_min"]), 2)
                congested_time_min = round(agg["route_congested_time"], 1)

                evacuation_routes.append({
                    "route_id": route_id,
                    "source_cluster_id": cid,
                    "source_name": c_name,
                    "destination_shelter_id": sid,
                    "destination_name": s_info["name"],
                    "evacuee_count": agg["alloc"],
                    "distance_km": agg["distance_km"],
                    "estimated_time_min": agg["travel_time_min"],
                    "congested_time_min": congested_time_min,
                    "congestion_delay_factor": bpr_delay_factor,
                    "urgency_level": "critical" if c_depth >= 0.80 else ("high" if c_depth >= 0.40 else "moderate"),
                    "status": route_status,
                    "coordinates": full_coords,
                })

        # Format shelter allocations response
        allocations_output = []
        for sid, s_info in shelter_state.items():
            alloc_evac = s_info["newly_allocated"]
            max_cap = s_info["total_capacity"]
            total_occupancy = s_info["baseline_occupied"] + alloc_evac
            rem_cap = max(0, max_cap - total_occupancy)
            utilization = total_occupancy / max(1, max_cap)

            if s_info["is_compromised"]:
                status = "compromised"
            elif utilization >= 1.0 or rem_cap == 0:
                status = "full"
            elif utilization >= 0.80:
                status = "near_capacity"
            else:
                status = "available"

            allocations_output.append({
                "shelter_id": sid,
                "id": sid,
                "name": s_info["name"],
                "neighborhood": s_info["neighborhood"],
                "location": s_info["location"],
                "total_capacity": max_cap,
                "capacity": max_cap,
                "max_capacity": max_cap,
                "allocated_evacuees": alloc_evac,
                "assigned_evacuees": alloc_evac,
                "total_occupancy": total_occupancy,
                "current_occupancy": s_info["baseline_occupied"],
                "occupancy_pct": round(utilization * 100, 1),
                "occupancy": alloc_evac,
                "remaining_capacity": rem_cap,
                "status": status,
            })

        # Format GeoJSON FeatureCollection
        features = []
        for r in evacuation_routes:
            # Standard GeoJSON format: coordinates are [lon, lat]
            geojson_line = [[round(pt[1], 6), round(pt[0], 6)] for pt in r["coordinates"]]
            features.append({
                "type": "Feature",
                "id": r["route_id"],
                "geometry": {
                    "type": "LineString",
                    "coordinates": geojson_line,
                },
                "properties": {
                    "route_id": r["route_id"],
                    "source_cluster_id": r["source_cluster_id"],
                    "source_name": r["source_name"],
                    "destination_shelter_id": r["destination_shelter_id"],
                    "shelter_id": r["destination_shelter_id"],
                    "assigned_shelter_id": r["destination_shelter_id"],
                    "destination_id": r["destination_shelter_id"],
                    "destination_name": r["destination_name"],
                    "evacuee_count": r["evacuee_count"],
                    "distance_km": r["distance_km"],
                    "estimated_time_min": r["estimated_time_min"],
                    "congested_time_min": r.get("congested_time_min", r["estimated_time_min"]),
                    "congestion_delay_factor": r.get("congestion_delay_factor", 1.0),
                    "urgency_level": r.get("urgency_level", "moderate"),
                    "status": r["status"],
                },
            })

        routes_geojson = {
            "type": "FeatureCollection",
            "features": features,
        }

        return {
            "evacuation_routes": routes_geojson,
            "shelter_allocations": allocations_output,
            "isolated_clusters": isolated_clusters,
            "metrics": {
                "total_affected_population": total_affected_pop,
                "total_evacuated_population": total_evacuated_pop,
                "trapped_requiring_rescue": sum(ic["trapped_population"] for ic in isolated_clusters),
            },
        }
