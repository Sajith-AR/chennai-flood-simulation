# Original User Request

## 2026-09-14T13:14:06Z

A college/academic project that simulates natural disaster (flood) response for Chennai. Users interact with a real map (OpenStreetMap data) of Chennai to set up a disaster scenario (flood zone, intensity, affected areas), then run a simulation that computes evacuation routes, supply chain logistics, and resource allocation. The frontend is built with Next.js and the backend with Python. This is a simulation tool — not real-time — with polished, impressive UI. No user authentication required.

Working directory: c:\Users\saran\Desktop\project X
Integrity mode: development

## Requirements

### R1. Interactive Map-Based Disaster Simulation
The application must display a map of Chennai using real geographic data (OpenStreetMap). Users must be able to define flood-affected zones on the map, set disaster parameters (rainfall intensity, flood level, affected area radius), and click "Run Simulation" to trigger the backend computation. The simulation results must be displayed visually on the map, including flood spread visualization and a timeline/playback control to step through the disaster progression over time.

### R2. Evacuation Route Planning
The simulation must calculate and display safe evacuation routes from affected zones to designated shelters/safe zones. Routes must use actual road network data for Chennai and avoid flooded areas. The system must show population density heatmaps in affected zones and manage shelter assignments (tracking shelter capacity and assigning evacuees to nearest available shelters).

### R3. Supply Chain & Resource Management
The simulation must plan and visualize supply distribution routes from warehouses/depots to distribution points in affected areas. It must include a resource inventory system tracking available supplies (food, water, medicine) and their allocation to shelters and distribution points. Supply routes must also avoid flooded roads.

### R4. Next.js Frontend + Python Backend Architecture
The frontend must be built with Next.js. The backend must be built with Python (as a REST API). The two must communicate via HTTP API calls. The backend handles all simulation computation; the frontend handles all visualization and user interaction.

## Acceptance Criteria

### Map & Simulation
- [ ] The application loads and displays an interactive map centered on Chennai using real OpenStreetMap data
- [ ] Users can draw/select flood-affected zones on the map
- [ ] Users can set disaster parameters (intensity, flood level) via UI controls
- [ ] Clicking "Run Simulation" sends parameters to the Python backend and displays computed results on the map
- [ ] Flood spread is visualized on the map with color-coded intensity
- [ ] A timeline/playback slider allows stepping through the simulated disaster progression

### Evacuation
- [ ] Safe evacuation routes are calculated and displayed as path overlays on the map, avoiding flooded areas
- [ ] Population density heatmap is visible on affected zones
- [ ] Shelters are shown on the map with capacity indicators
- [ ] Evacuees are assigned to shelters and the assignment is visible (e.g., clicking a shelter shows assigned population count vs. capacity)

### Supply Chain
- [ ] Supply warehouses and distribution points are displayed on the map
- [ ] Supply distribution routes are calculated and shown, avoiding flooded roads
- [ ] A resource inventory panel shows available supplies (food, water, medicine) and their allocation status
- [ ] Supplies can be allocated to specific shelters/distribution points

### Architecture & Quality
- [ ] The Next.js frontend starts and renders without errors
- [ ] The Python backend starts and responds to API requests
- [ ] Frontend-backend communication works end-to-end (set scenario → run simulation → view results)
- [ ] The UI is polished and visually impressive (clean layout, proper styling, smooth interactions)

## Verification Plan

### Programmatic Verification
- The Next.js app builds and starts without errors (`npm run build && npm run dev`)
- The Python backend starts and all API endpoints return valid responses (automated API tests or curl checks)
- An end-to-end test: set a flood zone, run simulation, verify the response contains evacuation routes and supply chain data
- Map renders correctly with Chennai centered (verify tile loading)

### Visual / Agent-as-Judge Verification
- An independent agent reviews the UI for polish: layout consistency, responsive controls, readable map overlays, smooth timeline playback
- An independent agent verifies that evacuation routes on the map visually avoid the marked flood zones
- An independent agent confirms supply routes are distinct from evacuation routes and connect warehouses to distribution points

## Follow-up — 2026-09-15T10:51:58Z

Resume and complete a partially-built college/academic project that simulates natural disaster (flood) response for Chennai. The project is approximately 95% complete — all code is written and 92/95 E2E tests were passing before the process was interrupted.

Working directory: c:\Users\saran\Desktop\project X
Integrity mode: development

IMPORTANT: This is a RESUME of an existing project. All source code, tests, and data files already exist in the working directory. Do NOT rewrite or recreate files that already work. Focus only on what remains.

## Current State (Already Completed)

### Backend (Python/FastAPI) — DONE
- `backend/app/main.py` — FastAPI application
- `backend/app/api/` — API route handlers
- `backend/app/services/` — `flood_engine.py`, `evacuation_solver.py`, `supply_solver.py`, `road_network.py`, `geometry.py`
- `backend/app/data/` — `chennai_roads.json`, `shelters.json`, `warehouses.json`, `distribution_points.json`, `population_clusters.json`, `presets.json`
- `backend/tests/` — 32/32 unit & API tests were passing

### Frontend (Next.js) — DONE
- `frontend/src/components/map/` — `ChennaiMap.tsx`, `MapContainer.tsx`
- `frontend/src/components/controls/` — `DisasterControls.tsx`, `LayerToggle.tsx`, `TimelinePlayer.tsx`
- `frontend/src/components/dashboard/` — `ResourcePanel.tsx`, `AllocationModal.tsx`, `MetricsOverview.tsx`, `Header.tsx`
- `frontend/src/app/` — main page
- `frontend/src/lib/` — utilities
- Production build was passing via `next build`

### E2E Tests — DONE
- `e2e/` — 4-tier test suite (tier1_features, tier2_boundaries, tier3_interactions, tier4_scenarios)
- 92/95 tests were passing; 3 edge cases failing related to supply dispatch constraints and safety envelopes under extreme flood surge conditions

### Documentation — DONE
- `PROJECT.md` — Full 24-feature inventory and REST API contracts
- `TEST_INFRA.md` — Testing philosophy and infrastructure
- `TEST_READY.md` — Test readiness report

## Remaining Work

### R1. Fix the 3 Failing Edge-Case Tests
Run the E2E test suite, identify the 3 failing tests (related to supply dispatch constraints under extreme flood surge), and fix the backend logic to make all 95/95 tests pass. Do NOT modify tests to make them pass — fix the actual service logic.

### R2. Integration Verification
Verify that the frontend and backend communicate correctly end-to-end:
- Backend starts and serves API requests
- Frontend builds and renders the map
- CORS is properly configured
- A full simulation workflow works: set flood zone → run simulation → view results on map

### R3. Launch Scripts
Create convenience scripts if they don't already exist:
- `start_backend.bat` — starts the Python backend
- `start_frontend.bat` — starts the Next.js dev server
- `run_all_tests.bat` — runs all test suites

### R4. Final Quality Review
Review the overall codebase for polish:
- Ensure the UI is visually impressive and clean
- Verify all map overlays render correctly
- Check that the timeline playback works smoothly
- Confirm resource panel and allocation modal are functional

## Acceptance Criteria

### Tests
- [ ] All 32 backend unit/API tests pass
- [ ] All 95 E2E tests pass (including the 3 previously failing edge cases)
- [ ] `next build` completes without errors

### Integration
- [ ] Backend starts without errors and responds to API requests
- [ ] Frontend starts and displays the Chennai map
- [ ] End-to-end simulation workflow works (set scenario → run → view results)

### Deliverables
- [ ] Launch scripts exist and work (`start_backend.bat`, `start_frontend.bat`, `run_all_tests.bat`)
- [ ] UI is polished and visually impressive

## Verification Plan

### Programmatic
- Run `python -m pytest backend/tests` — all must pass
- Run `python e2e/test_runner.py` or equivalent — all 95 must pass
- Run `npm run build` in frontend/ — must succeed
- Start backend, hit health endpoint — must respond

### Visual / Agent-as-Judge
- Independent review of UI polish and map rendering quality

