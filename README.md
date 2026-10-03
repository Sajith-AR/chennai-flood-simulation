# 🌊 Chennai Natural Disaster (Flood) Simulation & Operations Platform

An advanced, full-stack spatio-temporal flood simulation and emergency response platform built for the **Greater Chennai Corporation (GCC)** and **Tamil Nadu State Disaster Management Authority (TNSDMA)**.

Combines dynamic NetworkX graph pathfinding, Google OR-Tools supply allocation, deep learning relief demand prediction (PyTorch DNN + XGBoost), and an aerospace-grade Next.js Command Center HUD with interactive Leaflet geospatial overlays.

---

## 🚀 Key Features

### 1. Spatio-Temporal Hydrologic Simulation
- **Multi-Tier Inundation Modeling**: Real-time water expansion across time steps ($t=0..T$) categorized into 4 severity tiers: *Advisory* ($<0.3\text{m}$), *Moderate* ($0.3–0.6\text{m}$), *Severe* ($0.6–1.2\text{m}$), and *Catastrophic* ($\ge 1.2\text{m}$).
- **Topographic Context**: Grounds flood depth against Chennai digital elevation contours and drainage corridors (Adyar River, Cooum River, Buckingham Canal, Otteri Nullah).
- **Historical Scenario Presets**: Instant one-click war room loading for **Velachery 2015**, **Adyar Basin Surge**, **North Chennai Storm Surge**, and **Chembarambakkam Reservoir Discharge**.

### 2. Evacuation Routing & Shelter Management
- **Dynamic Road Network Graph**: Automatically severs roads with water depth $\ge 0.50\text{m}$ and penalizes partially inundated corridors.
- **Capacity-Constrained Solver**: Assigns evacuees from vulnerable population clusters to 12 verified Chennai shelters without exceeding 100% capacity.
- **Isolated Cluster Detection**: Identifies trapped wards requiring airlifts or marine boat rescue.

### 3. Multi-Modal Relief Logistics & Zero-Depth Guarantee
- **Analytical Geometric Screening**: Analytical segment-polygon clipping (`segment_intersects_polygon`) guarantees supply trucks never enter water $\ge 0.30\text{m}$.
- **Autonomous Modal Handover**:
  - **Heavy 6x6 Ground Convoys**: For dry and clear road corridors.
  - **NDRF Gemini Amphibious Crafts**: For navigable shallow flood waters ($<1.50\text{m}$).
  - **IAF Chetak / Coast Guard Helicopters**: Direct air transit for severed and deep water epicenters.
- **Sphere Standards Resource Ledger**: Real-time tracking of potable water litres, food ration packs, and trauma medical kits across 5 strategic relief depots (Chennai Port, Koyambedu, Airport Cargo, Tambaram, Ennore).

### 4. AI Decision Support & Ward Vulnerability Index
- **Ward Risk Index (0–100)**: Multi-factor scoring across all 15 Greater Chennai Corporation Zones based on rainfall intensity, elevation deficits, runoff coefficients, and population density.
- **Topographic Helipad Selection**: Automatically identifies high-ground drop zones (Anna University, St. Thomas Mount, IIT Madras, JLN Stadium) for stranded evacuees.
- **Bilingual Public Safety Broadcasts**: Real-time alert synthesis in both **Tamil (தமிழ்)** and **English** for cell tower broadcasts, sirens, and media advisories.

### 5. Aerospace & Defense Command Center HUD
- **Defense Dashboard**: Dual synchronized operations clocks (IST / UTC), dynamic DEFCON 1–4 Threat Radar, and live fleet readiness indicators.
- **Interactive Route Inspector**: Click any route to view cross-sectional water depth vs vehicle clearance profiles, convoy composition, and cargo manifests.
- **Citizen Evacuation Klaxon Drill**: Synthesizes authentic dual-tone emergency siren audio via the Web Audio API with screen-wide warning vignettes.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Leaflet, Lucide Icons.
- **Backend**: Python 3.12, FastAPI, Uvicorn, NetworkX, Google OR-Tools, Pydantic v2.
- **Machine Learning**: PyTorch (DNN), XGBoost, Scikit-Learn, SHAP explainability.
- **Geospatial Algorithms**: Pure-Python computational geometry, Haversine geodesic projection, ray-casting point-in-polygon, 2D orientation segment-polygon clipping.

---

## 🏁 Quick Start

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+

### 1. Launch Backend (FastAPI on Port 8000)
```powershell
.\start_backend.bat
# Or manually:
cd backend
pip install -r requirements.txt
python run_server.py
```

### 2. Launch Frontend (Next.js on Port 3000)
```powershell
.\start_frontend.bat
# Or manually:
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:3000` to access the Command Center.

---

## 📄 License
MIT License
