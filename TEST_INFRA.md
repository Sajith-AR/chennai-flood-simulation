# E2E Test Infrastructure & Test Philosophy

**Project:** Chennai Natural Disaster (Flood) Simulation  
**Platform:** Next.js (Frontend) + Python FastAPI (Backend)  
**Author:** `teamwork_preview_test_writer_e2e_1` (E2E Test Suite Designer & Writer)  
**Document Version:** 1.0.0  
**Target Environment:** Localhost / CI / Staging (`http://localhost:8000`)

---

## 1. Test Philosophy: Opaque-Box & Requirement-Driven

The End-to-End (E2E) Test Suite for the Chennai Flood Simulation platform is engineered strictly on the **Opaque-Box (Black-Box) Principle**:

1. **Zero Internal Dependency:**
   - E2E tests interact exclusively through exposed REST API interfaces over HTTP (`GET /api/health`, `GET /api/map/init`, `POST /api/simulation/run`, `POST /api/resources/allocate`).
   - Tests **NEVER** import backend internal modules (e.g. `backend.app.services.*`, ORM models, or private routing engines). All geometry math, spatial containment, Haversine distances, and invariant assertions are performed by independent, self-contained client-side verification engines in `e2e/common/`.

2. **Requirement-Driven Assertions:**
   - Every single test case derives its inputs, boundary thresholds, and expected invariants directly from `ORIGINAL_REQUEST.md`, `PROJECT.md`, and the authoritative specifications in `survey_report.md`.
   - Behavioral invariants verified include:
     - **Physical Bounds:** Coordinates strictly within Greater Chennai Corporation (GCC) boundaries ($12.85^\circ\text{N} - 13.25^\circ\text{N}$, $80.05^\circ\text{E} - 80.35^\circ\text{E}$).
     - **Safety Invariant:** Zero evacuation and supply route coordinates may intersect active flood polygons where water depth $\ge 0.3\,\text{m}$ (supply vehicles) or $\ge 0.5\,\text{m}$ (pedestrian/evacuee routes).
     - **Conservation of Resources:** Citywide supply totals must satisfy:
       $$\text{TotalStock} = \text{AvailableStock} + \text{AllocatedStock}$$
       with non-negative quantities for all resource types (water, food, medicine).
     - **Capacity Invariant:** Assigned shelter evacuees must never exceed declared shelter capacities:
       $$0 \le \text{AllocatedEvacuees} \le \text{Capacity}$$
       with excess populations diverted to secondary shelters or flagged as isolated/requiring airlift.

3. **Multi-Mode Execution Capability:**
   - **Live Integration Mode:** When the FastAPI server is running on `http://localhost:8000` (or `SIM_API_URL`), tests make real HTTP requests with retry/timeout policies.
   - **Contract & Offline Verification Mode:** Self-contained schema and contract verification routines allow continuous regression testing, dry-run syntax audits, and mock contract validation when dependencies are initializing.

---

## 2. Feature Inventory & Test Coverage Mapping

The test suite provides exhaustive coverage across the 24 features defined in `PROJECT.md` and `survey_report.md`:

| Feature # | Feature Name | Primary Tier | Target Endpoints / Contracts | Verification Engine |
|-----------|--------------|--------------|------------------------------|---------------------|
| F1 | Chennai Map Foundation | Tier 1 | `GET /api/map/init` | Bounding box, center coordinates, zoom constraints |
| F2 | Flood Zone Drawing & Epicenters | Tier 1, Tier 2 | `POST /api/simulation/run` | Polygon & circle epicenter geometry validators |
| F3 | Disaster Parameter Controls | Tier 1, Tier 2 | `POST /api/simulation/run` | Rainfall (0-200mm/h), depth (0-4m), radius range validation |
| F4 | Spatio-Temporal Flood Simulation | Tier 1, Tier 3 | `POST /api/simulation/run` | Monotonic time-series expansion, depth decay, severity categories |
| F5 | Timeline & Playback Invariants | Tier 1, Tier 3 | `POST /api/simulation/run` | Temporal state consistency across $t=0..T$ |
| F6 | Chennai Road Network Graph | Tier 1 | `GET /api/health` | Network node & edge connectivity metrics |
| F7 | Dynamic Flood Avoidance Routing | Tier 1, Tier 2 | `POST /api/simulation/run` | Ray-casting point-in-polygon non-inundation proofs |
| F8 | Evacuation Route Overlays | Tier 1 | `POST /api/simulation/run` | GeoJSON LineString continuity, origin-destination validity |
| F9 | Population Density Heatmap | Tier 1 | `GET /api/map/init` | Population clusters, risk levels, density zones |
| F10 | Shelter Capacity Management | Tier 1, Tier 2 | `GET /api/map/init`, `/simulation/run` | 12 Chennai public shelters, non-negative capacity meters |
| F11 | Evacuee-to-Shelter Allocation | Tier 1, Tier 2 | `POST /api/simulation/run` | Nearest available shelter assignment, overflow handling |
| F12 | Shelter Assignment UI & Badges | Tier 1 | `POST /api/simulation/run` | Status badges (`available`, `near_capacity`, `full`, `compromised`) |
| F13 | Supply Warehouses & Distribution Points | Tier 1 | `GET /api/map/init` | 5 strategic depots, 10 relief camps, initial inventories |
| F14 | Warehouse & Distribution Markers | Tier 1 | `GET /api/map/init` | Geographic coordinates, address metadata, baseline supplies |
| F15 | Flood-Avoidant Supply Routing | Tier 1, Tier 3 | `POST /api/simulation/run` | Truck clearance ($\ge 0.3\,\text{m}$ cutoff), shortest safe path |
| F16 | Supply Route Overlays | Tier 1 | `POST /api/simulation/run` | LineString geometry, transit time, avoids flooded nodes |
| F17 | Resource Inventory Tracking | Tier 1, Tier 2 | `POST /api/simulation/run` | Sphere standards (3L water, 3 rations, med kits), ledger balance |
| F18 | Resource Inventory Ledger | Tier 1, Tier 2 | `POST /api/simulation/run` | Non-negativity, stock conservation, citywide totals |
| F19 | Dynamic Resource Allocation API | Tier 1, Tier 3 | `POST /api/resources/allocate` | Manual transfer execution, stock decrements, route re-computation |
| F20 | REST API Architecture | Tier 1, Tier 2 | All endpoints | HTTP status codes (200, 400, 422, 503), Pydantic schemas |
| F21 | Full-Stack Integration Flow | Tier 3 | All endpoints | Pipeline chaining: Init -> Simulate -> Inspect -> Allocate |
| F22 | High Population / Low Capacity | Tier 3 | `POST /api/simulation/run` | Spatial bottleneck routing, distal shelter spillover |
| F23 | Real-World Historical Benchmarks | Tier 4 | `POST /api/simulation/run` | 2015 Adyar, Velachery, North Chennai, Marina Beach storm surge |
| F24 | Island / Submerged Cluster Safety | Tier 2, Tier 4 | `POST /api/simulation/run` | Airlift / amphibious rescue flags, isolated status indicators |

---

## 3. Directory & Execution Architecture

```
e2e/
├── __init__.py
├── conftest.py                   # Pytest fixtures, API client lifecycle, CLI options
├── test_runner.py                # Standalone automated runner with colored CLI reporting
├── common/
│   ├── __init__.py
│   ├── client.py                 # Robust HTTP API client (retries, timeouts, error parsing)
│   ├── config.py                 # Base URLs, GCC bounds, thresholds, timeouts
│   ├── geometry.py               # Pure-Python spatial verifier: Haversine, Point-in-Polygon, Ray Casting
│   ├── models.py                 # Standalone Pydantic schemas for contract validation
│   └── validators.py             # Domain invariant validators (ledger, routes, shelters)
├── tier1_features/
│   ├── __init__.py
│   ├── test_map_baseline.py      # Feature 1: Map init & geographic bounds (5+ tests)
│   ├── test_disaster_params.py   # Feature 2: Parameter schema & ranges (5+ tests)
│   ├── test_flood_simulation.py  # Feature 3: Spatio-temporal time steps (5+ tests)
│   ├── test_evacuation_routes.py # Feature 4: Safe evacuation routing & non-inundation (5+ tests)
│   ├── test_shelter_capacity.py  # Feature 5: Shelter capacity & evacuee allocation (5+ tests)
│   ├── test_supply_routing.py    # Feature 6: Supply distribution routing (5+ tests)
│   └── test_resource_ledger.py   # Feature 7: Inventory tracking & manual allocation (5+ tests)
├── tier2_boundaries/
│   ├── __init__.py
│   ├── test_zero_flood.py        # Boundary 1: Zero rainfall & zero flood depth (5+ tests)
│   ├── test_extreme_flood.py     # Boundary 2: Catastrophic 3.0m depth & max radius (5+ tests)
│   ├── test_island_clusters.py   # Boundary 3: Completely submerged clusters & airlift (5+ tests)
│   ├── test_shelter_overflow.py  # Boundary 4: 100% capacity saturation & rerouting (5+ tests)
│   ├── test_zero_inventory.py    # Boundary 5: Depleted warehouse inventory failover (5+ tests)
│   ├── test_disjoint_zones.py    # Boundary 6: Multi-polygon non-contiguous flood zones (5+ tests)
│   └── test_boundary_coords.py   # Boundary 7: Coordinates at extreme edge of GCC bounds (5+ tests)
├── tier3_interactions/
│   ├── __init__.py
│   ├── test_flood_and_supply.py  # Pairwise 1: Severe flood + concurrent emergency dispatch
│   ├── test_timeline_realloc.py  # Pairwise 2: Rapid timeline progression + manual reallocation
│   ├── test_density_bottleneck.py# Pairwise 3: High density zone + low local shelter capacity
│   └── test_multi_basin_surge.py # Pairwise 4: Simultaneous Adyar + Cooum basin surge
└── tier4_scenarios/
    ├── __init__.py
    ├── test_scenario_2015_adyar.py      # Historical Benchmark: 2015 Chembarambakkam release
    ├── test_scenario_velachery_lake.py  # Historical Benchmark: Velachery Lake breach & marsh backflow
    ├── test_scenario_north_chennai.py   # Industrial Benchmark: Ennore / Manali drainage failure
    └── test_scenario_marina_surge.py    # Coastal Benchmark: Marina Beach Bay of Bengal storm surge
```

---

## 4. Test Thresholds & Pass/Fail Criteria

### 4.1 Strict Pass/Fail Invariants
1. **HTTP Status Code Conformity:**
   - Valid requests must return `200 OK`.
   - Invalid payloads (missing required fields, negative depth, coordinates outside GCC bounds) must return `400 Bad Request` or `422 Unprocessable Entity`.
   - Health check must return `200 OK` with status `"ok"`.
2. **Geographic Enclosure:**
   - All shelter, warehouse, distribution point, and route node coordinates must lie within Greater Chennai bounds:
     $$12.85 \le \text{Latitude} \le 13.25$$
     $$80.05 \le \text{Longitude} \le 80.35$$
3. **Hydrological Safety (Zero Route Submergence):**
   - No coordinate on any active evacuation route may intersect a flood polygon where water depth $\ge 0.5\,\text{m}$.
   - No coordinate on any active relief supply route may intersect a flood polygon where water depth $\ge 0.3\,\text{m}$.
4. **Shelter Occupancy Constraints:**
   - For every shelter $s \in S$:
     $$\text{allocated\_evacuees}(s) \le \text{max\_capacity}(s)$$
   - If local demand exceeds local shelter capacity, overflow must be allocated to distal shelters or marked with `requires_airlift: true` / `unassigned_evacuees > 0`.
5. **Humanitarian Standard Verification:**
   - Minimum supply demand per assigned evacuee $P$:
     - Water: $3.0\text{ Liters} / \text{person}$
     - Food: $3.0\text{ Ration Packs} / \text{person}$
     - Medical kits: $\max(10, \lceil P \times 0.02 \rceil)\text{ Kits}$
6. **Inventory Conservation & Non-Negativity:**
   - Warehouse available stock must never be negative:
     $$\text{available\_stock} \ge 0$$
   - Total city inventory must remain conserved across allocations.

### 4.2 Performance & Execution Thresholds
- Map Initialization (`GET /api/map/init`): Response time $< 500\,\text{ms}$.
- Simulation Run (`POST /api/simulation/run` for 12 timesteps): Response time $< 3,000\,\text{ms}$.
- Dynamic Reallocation (`POST /api/resources/allocate`): Response time $< 800\,\text{ms}$.
- Total E2E Suite Execution Time: $< 60\,\text{seconds}$ across all 80+ test cases.

---

## 5. Execution Instructions

### Via Pytest:
```bash
# Run all E2E tests
python -m pytest e2e/ -v

# Run by Tier
python -m pytest e2e/tier1_features/ -v
python -m pytest e2e/tier2_boundaries/ -v
python -m pytest e2e/tier3_interactions/ -v
python -m pytest e2e/tier4_scenarios/ -v
```

### Via Standalone Test Runner:
```bash
# Full automated run with rich progress report
python e2e/test_runner.py

# Run specific tier
python e2e/test_runner.py --tier 1
python e2e/test_runner.py --tier 4

# Run against custom API base URL
python e2e/test_runner.py --base-url http://127.0.0.1:8000
```
