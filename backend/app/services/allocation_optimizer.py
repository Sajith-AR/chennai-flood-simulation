"""
Autonomous Resource Allocation Engine using Google OR-Tools.
Formulates multi-commodity, multi-depot emergency logistics as a Linear Programming (LP)
constraint optimization problem. Maximizes prioritized humanitarian fulfillment while
minimizing transport transit impedance and respecting strict depot inventory bounds.
"""
from typing import List, Dict, Any, Optional
import math
from backend.app.services.geometry import haversine


class AllocationOptimizer:
    def __init__(self, supply_solver=None):
        self.supply_solver = supply_solver

    def optimize(
        self,
        incidents: List[Dict[str, Any]],
        warehouses: Optional[List[Dict[str, Any]]] = None,
        max_transit_time_min: float = 120.0
    ) -> Dict[str, Any]:
        """
        Executes Google OR-Tools optimization across all active incidents.
        """
        # 1. Gather Warehouses and Available Stock
        if not warehouses:
            if self.supply_solver and getattr(self.supply_solver, "warehouse_stocks", None):
                warehouses = list(self.supply_solver.warehouse_stocks.values())
            else:
                # Default 5 strategic Chennai depots
                warehouses = [
                    {
                        "id": "WH-01",
                        "name": "GCC Central Logistics Depot",
                        "location": [13.0827, 80.2707],
                        "available": {"water_litres": 65000, "food_rations": 12000, "medical_kits": 400, "blankets": 2500, "rescue_boats": 12}
                    },
                    {
                        "id": "WH-02",
                        "name": "Tambaram Regional Supply Hub",
                        "location": [12.9229, 80.1275],
                        "available": {"water_litres": 50000, "food_rations": 10000, "medical_kits": 300, "blankets": 2000, "rescue_boats": 10}
                    },
                    {
                        "id": "WH-03",
                        "name": "Anna Nagar Civil Defense Depot",
                        "location": [13.0850, 80.2100],
                        "available": {"water_litres": 45000, "food_rations": 9000, "medical_kits": 250, "blankets": 1500, "rescue_boats": 8}
                    },
                    {
                        "id": "WH-04",
                        "name": "Guindy Industrial Estate Transit Hub",
                        "location": [13.0125, 80.2355],
                        "available": {"water_litres": 40000, "food_rations": 8500, "medical_kits": 220, "blankets": 1200, "rescue_boats": 6}
                    },
                    {
                        "id": "WH-05",
                        "name": "Madhavaram Strategic Stockpile",
                        "location": [13.1480, 80.2310],
                        "available": {"water_litres": 35000, "food_rations": 8500, "medical_kits": 230, "blankets": 1300, "rescue_boats": 6}
                    }
                ]

        if not incidents:
            return {
                "status": "empty",
                "allocations": [],
                "unmet_demands": [],
                "remaining_stocks": warehouses,
                "summary": "No active incidents provided for allocation.",
                "solver_method": "Google OR-Tools pywraplp (GLOP)"
            }

        # Resources to solve
        resource_keys = ["water_litres", "food_rations", "medical_kits", "blankets", "rescue_boats"]

        # Ensure each warehouse has available inventory initialized
        for w in warehouses:
            avail = w.setdefault("available", {})
            avail.setdefault("water_litres", 40000)
            avail.setdefault("food_rations", 8000)
            avail.setdefault("medical_kits", 250)
            avail.setdefault("blankets", 1500)
            avail.setdefault("rescue_boats", 8)

        # Run Google OR-Tools Linear Solver
        try:
            return self._solve_ortools(incidents, warehouses, resource_keys)
        except Exception as e:
            print(f"OR-Tools solver fallback to greedy constraint solver: {e}")
            return self._solve_greedy(incidents, warehouses, resource_keys)

    def _solve_ortools(
        self,
        incidents: List[Dict[str, Any]],
        warehouses: List[Dict[str, Any]],
        resource_keys: List[str]
    ) -> Dict[str, Any]:
        from ortools.linear_solver import pywraplp

        solver = pywraplp.Solver.CreateSolver("GLOP")
        if not solver:
            raise RuntimeError("Google OR-Tools GLOP solver could not be instantiated.")

        # Distance matrix (km) between each warehouse and incident
        dist_matrix = {}
        for w in warehouses:
            w_loc = w.get("location", [13.0827, 80.2707])
            for inc in incidents:
                inc_loc = inc.get("coordinates", [13.0827, 80.2707])
                dist_km = haversine(w_loc[0], w_loc[1], inc_loc[0], inc_loc[1])
                dist_matrix[(w["id"], inc["id"])] = max(1.0, round(dist_km, 2))

        # Variables: X[w_id, inc_id, res_key] = quantity of resource allocated
        X = {}
        for w in warehouses:
            for inc in incidents:
                for r in resource_keys:
                    X[(w["id"], inc["id"], r)] = solver.NumVar(0.0, solver.infinity(), f"X_{w['id']}_{inc['id']}_{r}")

        # Constraint 1: Depot Inventory Limits (Never allocate more than available!)
        for w in warehouses:
            avail = w.get("available", w.get("total", {}))
            for r in resource_keys:
                max_stock = float(avail.get(r, 0))
                constraint = solver.Constraint(0.0, max_stock, f"DepotLimit_{w['id']}_{r}")
                for inc in incidents:
                    constraint.SetCoefficient(X[(w["id"], inc["id"], r)], 1.0)

        # Constraint 2: Area Demand Limits (Do not over-allocate beyond requested demand)
        for inc in incidents:
            demands = inc.get("demands", {})
            for r in resource_keys:
                dem = float(demands.get(r, 0))
                constraint = solver.Constraint(0.0, dem, f"DemandLimit_{inc['id']}_{r}")
                for w in warehouses:
                    constraint.SetCoefficient(X[(w["id"], inc["id"], r)], 1.0)

        # Objective Function:
        # Maximize: Sum(Priority * Fulfillment) - Sum(Distance_Cost * X)
        objective = solver.Objective()
        for inc in incidents:
            # Priority weight (1.0 to 10.0 scale from priority_score or urgency)
            p_score = inc.get("priority_score", 50.0)
            urgency = inc.get("urgency", "medium").lower()
            urg_boost = 100.0 if urgency == "critical" else 60.0 if urgency == "high" else 30.0
            benefit_weight = (p_score + urg_boost) / 10.0

            for w in warehouses:
                d_km = dist_matrix[(w["id"], inc["id"])]
                # Slight distance penalty to encourage closest depot
                dist_cost = d_km * 0.05

                for r in resource_keys:
                    # Normalized unit value
                    unit_scale = 1.0 if r == "water_litres" else 3.0 if r == "food_rations" else 25.0 if r == "medical_kits" else 8.0 if r == "blankets" else 250.0
                    coeff = (benefit_weight * unit_scale) - dist_cost
                    objective.SetCoefficient(X[(w["id"], inc["id"], r)], coeff)

        objective.SetMaximization()
        status = solver.Solve()

        # Extract Results
        allocations = []
        remaining_stocks = {w["id"]: dict(w.get("available", w.get("total", {}))) for w in warehouses}
        fulfilled_demands = {inc["id"]: {r: 0 for r in resource_keys} for inc in incidents}

        for inc in incidents:
            for w in warehouses:
                assigned_items = {}
                for r in resource_keys:
                    val = X[(w["id"], inc["id"], r)].solution_value()
                    qty = int(round(val))
                    if qty > 0:
                        assigned_items[r] = qty
                        remaining_stocks[w["id"]][r] = max(0, remaining_stocks[w["id"]][r] - qty)
                        fulfilled_demands[inc["id"]][r] += qty

                if assigned_items:
                    d_km = dist_matrix[(w["id"], inc["id"])]
                    # Determine transport mode based on road accessibility and water depth
                    water_depth = inc.get("water_depth_m", 0.0)
                    road_ok = inc.get("road_accessible", True)
                    if not road_ok or water_depth >= 1.5:
                        transport_mode = "helicopter" if water_depth >= 1.8 else "amphibious"
                        vehicle_type = "IAF Chetak Aerial Sortie" if transport_mode == "helicopter" else "NDRF Amphibious BARK Craft"
                    else:
                        transport_mode = "truck"
                        vehicle_type = "Heavy 6x6 Ashok Leyland Stallion"

                    speed_kmh = 35.0 if transport_mode == "truck" else 20.0 if transport_mode == "amphibious" else 140.0
                    transit_min = round((d_km / speed_kmh) * 60.0 + 10.0, 1)

                    allocations.append({
                        "allocation_id": f"ALLOC-{w['id']}-{inc['id']}",
                        "source_warehouse_id": w["id"],
                        "source_warehouse_name": w["name"],
                        "destination_incident_id": inc["id"],
                        "destination_name": inc.get("location", inc.get("title", "Sector")),
                        "destination_coordinates": inc.get("coordinates", [13.0827, 80.2707]),
                        "source_coordinates": w.get("location", [13.0827, 80.2707]),
                        "distance_km": d_km,
                        "estimated_transit_min": transit_min,
                        "transport_mode": transport_mode,
                        "vehicle_type": vehicle_type,
                        "allocated_supplies": assigned_items,
                        "rationale": f"Optimal route from {w['name']} ({d_km} km) prioritized by emergency tier {inc.get('urgency', 'HIGH').upper()}."
                    })

        # Calculate Unmet Demands
        unmet_demands = []
        for inc in incidents:
            req = inc.get("demands", {})
            unmet = {}
            for r in resource_keys:
                diff = max(0, req.get(r, 0) - fulfilled_demands[inc["id"]][r])
                if diff > 0:
                    unmet[r] = diff
            if unmet:
                unmet_demands.append({
                    "incident_id": inc["id"],
                    "location": inc.get("location", "Sector"),
                    "unmet_resources": unmet,
                    "reason": "Depot stocks allocated to higher priority critical emergencies or stock depleted."
                })

        # Update remaining stock in formatted output
        formatted_warehouses = []
        for w in warehouses:
            w_copy = dict(w)
            w_copy["available"] = remaining_stocks[w["id"]]
            formatted_warehouses.append(w_copy)

        return {
            "status": "optimal" if status == pywraplp.Solver.OPTIMAL else "feasible",
            "solver_method": "Google OR-Tools Linear Solver (pywraplp / GLOP)",
            "objective_value": round(solver.Objective().Value(), 2),
            "allocations_count": len(allocations),
            "allocations": allocations,
            "unmet_demands": unmet_demands,
            "remaining_stocks": formatted_warehouses,
            "summary": f"Successfully optimized {len(allocations)} emergency dispatch corridors using Google OR-Tools."
        }

    def _solve_greedy(
        self,
        incidents: List[Dict[str, Any]],
        warehouses: List[Dict[str, Any]],
        resource_keys: List[str]
    ) -> Dict[str, Any]:
        """Fallback transparent priority-sorted greedy allocation."""
        allocations = []
        remaining = {w["id"]: dict(w.get("available", w.get("total", {}))) for w in warehouses}
        unmet_demands = []

        # Sort incidents descending by priority score
        sorted_incidents = sorted(incidents, key=lambda x: x.get("priority_score", 50), reverse=True)

        for inc in sorted_incidents:
            inc_loc = inc.get("coordinates", [13.0827, 80.2707])
            demands = dict(inc.get("demands", {}))
            fulfilled = {r: 0 for r in resource_keys}

            # Find closest warehouse with stock
            for w in sorted(warehouses, key=lambda w: haversine(w.get("location", [0, 0])[0], w.get("location", [0, 0])[1], inc_loc[0], inc_loc[1])):
                wid = w["id"]
                assigned = {}
                for r in resource_keys:
                    needed = demands.get(r, 0) - fulfilled[r]
                    if needed > 0 and remaining[wid].get(r, 0) > 0:
                        alloc_qty = min(needed, remaining[wid][r])
                        assigned[r] = alloc_qty
                        remaining[wid][r] -= alloc_qty
                        fulfilled[r] += alloc_qty

                if assigned:
                    d_km = round(haversine(w.get("location", [0, 0])[0], w.get("location", [0, 0])[1], inc_loc[0], inc_loc[1]), 2)
                    allocations.append({
                        "allocation_id": f"ALLOC-{wid}-{inc['id']}",
                        "source_warehouse_id": wid,
                        "source_warehouse_name": w["name"],
                        "destination_incident_id": inc["id"],
                        "destination_name": inc.get("location", "Sector"),
                        "destination_coordinates": inc_loc,
                        "source_coordinates": w.get("location", [0, 0]),
                        "distance_km": d_km,
                        "estimated_transit_min": round((d_km / 35.0) * 60 + 10, 1),
                        "transport_mode": "truck" if inc.get("road_accessible", True) else "amphibious",
                        "vehicle_type": "Heavy All-Terrain Truck (6x6)",
                        "allocated_supplies": assigned,
                        "rationale": f"Greedy allocation from nearest depot {w['name']} for priority {inc.get('priority_score', 50)}."
                    })

            # Check unmet
            unmet = {r: demands.get(r, 0) - fulfilled[r] for r in resource_keys if demands.get(r, 0) > fulfilled[r]}
            if unmet:
                unmet_demands.append({
                    "incident_id": inc["id"],
                    "location": inc.get("location", "Sector"),
                    "unmet_resources": unmet,
                    "reason": "Depot stocks depleted."
                })

        return {
            "status": "feasible_greedy",
            "solver_method": "Greedy Constraint-Based Solver (Fallback)",
            "allocations_count": len(allocations),
            "allocations": allocations,
            "unmet_demands": unmet_demands,
            "remaining_stocks": warehouses,
            "summary": f"Allocated supplies across {len(allocations)} routes via constraint prioritization."
        }
