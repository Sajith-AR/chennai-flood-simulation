"""
Disaster Incident Report Management Service.
Stores, filters, updates, and persists crisis reports for Greater Chennai Corporation.
Includes realistic historical and simulated flood incident scenarios.
"""
import json
import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

INCIDENTS_DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "incidents.json")

SAMPLE_CHENNAI_INCIDENTS = [
    {
        "id": "INC-001",
        "title": "Catastrophic Flash Flood at AGS Colony",
        "location": "Velachery AGS Colony",
        "zone": "Zone 13 (Velachery / Guindy)",
        "coordinates": [12.9752, 80.2215],
        "disaster_type": "Urban Inundation",
        "water_depth_m": 1.8,
        "affected_population": 520,
        "urgency": "critical",
        "status": "reported",
        "reported_at": "2026-10-15T07:30:00Z",
        "description": "Pallikaranai wetland runoff breached retaining wall. Over 520 citizens stranded in first-floor apartments with water entering ground floors. Drinking water contaminated, baby food required urgently.",
        "demands": {
            "water_litres": 5200,
            "food_rations": 1040,
            "medical_kits": 55,
            "blankets": 350,
            "rescue_boats": 4
        },
        "road_accessible": False,
        "allocated_depot": None,
        "allocated_resources": None
    },
    {
        "id": "INC-002",
        "title": "Adyar Headwaters Overflow in Residential Suburbs",
        "location": "Mudichur Krishna Nagar",
        "zone": "Suburban South (Tambaram Belt)",
        "coordinates": [12.9249, 80.0883],
        "disaster_type": "River Overflow",
        "water_depth_m": 2.2,
        "affected_population": 380,
        "urgency": "critical",
        "status": "verified",
        "reported_at": "2026-10-15T08:15:00Z",
        "description": "Mudichur main road submerged under 2.2m water. Elderly residents cut off from medical supplies. Need insulin and dry food rations immediately. Amphibious boat rescue needed.",
        "demands": {
            "water_litres": 3800,
            "food_rations": 760,
            "medical_kits": 80,
            "blankets": 280,
            "rescue_boats": 6
        },
        "road_accessible": False,
        "allocated_depot": None,
        "allocated_resources": None
    },
    {
        "id": "INC-003",
        "title": "Subway Submersion & Severe Waterlogging",
        "location": "Perambur Barracks Road",
        "zone": "Zone 4 (Tondiarpet / Perambur)",
        "coordinates": [13.1140, 80.2450],
        "disaster_type": "Subway Submersion",
        "water_depth_m": 1.1,
        "affected_population": 240,
        "urgency": "high",
        "status": "reported",
        "reported_at": "2026-10-15T09:00:00Z",
        "description": "Railway underpass completely flooded preventing civilian egress. 240 people clustered at community hall requiring clean drinking water and hot meals.",
        "demands": {
            "water_litres": 2400,
            "food_rations": 480,
            "medical_kits": 25,
            "blankets": 150,
            "rescue_boats": 1
        },
        "road_accessible": True,
        "allocated_depot": None,
        "allocated_resources": None
    },
    {
        "id": "INC-004",
        "title": "Commercial Core Urban Flash Inundation",
        "location": "T. Nagar Usman Road",
        "zone": "Zone 10 (Kodambakkam / T. Nagar)",
        "coordinates": [13.0418, 80.2341],
        "disaster_type": "Flash Flood",
        "water_depth_m": 0.85,
        "affected_population": 160,
        "urgency": "medium",
        "status": "reported",
        "reported_at": "2026-10-15T09:45:00Z",
        "description": "Stormwater drains choked by silt. Basement shopping complexes flooded. 160 shop attendants and residents needing water pouches and basic first aid.",
        "demands": {
            "water_litres": 1600,
            "food_rations": 320,
            "medical_kits": 20,
            "blankets": 80,
            "rescue_boats": 0
        },
        "road_accessible": True,
        "allocated_depot": None,
        "allocated_resources": None
    },
    {
        "id": "INC-005",
        "title": "Ennore Creek Tidal Storm Surge",
        "location": "Manali Industrial Corridor",
        "zone": "Zone 2 (Manali / Ennore)",
        "coordinates": [13.1700, 80.2600],
        "disaster_type": "Storm Surge",
        "water_depth_m": 1.6,
        "affected_population": 410,
        "urgency": "critical",
        "status": "verified",
        "reported_at": "2026-10-15T10:20:00Z",
        "description": "High tide backing up Buckingham Canal into low-lying settlements. Petrochemical plant perimeter submerged. 410 contractual workers stranded on elevated storage platforms.",
        "demands": {
            "water_litres": 4100,
            "food_rations": 820,
            "medical_kits": 40,
            "blankets": 300,
            "rescue_boats": 3
        },
        "road_accessible": False,
        "allocated_depot": None,
        "allocated_resources": None
    },
    {
        "id": "INC-006",
        "title": "Lake Surplus Bund Breach",
        "location": "Kolathur Thanikachalam Nagar",
        "zone": "Zone 6 (Kolathur / Villivakkam)",
        "coordinates": [13.1250, 80.2180],
        "disaster_type": "Bund Breach",
        "water_depth_m": 1.3,
        "affected_population": 310,
        "urgency": "high",
        "status": "reported",
        "reported_at": "2026-10-15T11:05:00Z",
        "description": "Retaining bund breach causing sudden rush of lake overflow into ground floor homes. 310 residents evacuated to temple mandapam requiring mats, blankets, and water.",
        "demands": {
            "water_litres": 3100,
            "food_rations": 620,
            "medical_kits": 30,
            "blankets": 250,
            "rescue_boats": 2
        },
        "road_accessible": True,
        "allocated_depot": None,
        "allocated_resources": None
    }
]


class IncidentService:
    def __init__(self, data_file: str = INCIDENTS_DATA_FILE):
        self.data_file = data_file
        self._incidents: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, "r", encoding="utf-8") as f:
                    self._incidents = json.load(f)
                    return
            except Exception as e:
                print(f"Error loading incidents file, re-initializing: {e}")
        self._incidents = [dict(inc) for inc in SAMPLE_CHENNAI_INCIDENTS]
        self._save()

    def _save(self):
        os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
        try:
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump(self._incidents, f, indent=2)
        except Exception as e:
            print(f"Error persisting incidents: {e}")

    def list_incidents(
        self,
        urgency: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        results = self._incidents
        if urgency:
            results = [inc for inc in results if inc.get("urgency", "").lower() == urgency.lower()]
        if status:
            results = [inc for inc in results if inc.get("status", "").lower() == status.lower()]
        if search:
            q = search.lower()
            results = [
                inc for inc in results
                if q in inc.get("title", "").lower()
                or q in inc.get("location", "").lower()
                or q in inc.get("description", "").lower()
                or q in inc.get("id", "").lower()
            ]
        return results

    def get_incident(self, incident_id: str) -> Optional[Dict[str, Any]]:
        for inc in self._incidents:
            if inc["id"] == incident_id:
                return inc
        return None

    def create_incident(self, data: Dict[str, Any]) -> Dict[str, Any]:
        # Generate clean ID
        inc_count = len(self._incidents) + 1
        inc_id = f"INC-{inc_count:03d}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Compute default demands if not specified based on population
        pop = max(1, int(data.get("affected_population", 100)))
        default_demands = {
            "water_litres": pop * 10,
            "food_rations": pop * 2,
            "medical_kits": max(5, pop // 10),
            "blankets": pop // 2,
            "rescue_boats": 1 if data.get("water_depth_m", 0) > 1.0 else 0
        }

        new_inc = {
            "id": inc_id,
            "title": data.get("title") or f"Emergency Alert at {data.get('location', 'Chennai Sector')}",
            "location": data.get("location", "Central Chennai"),
            "zone": data.get("zone", "Zone 5 (Central)"),
            "coordinates": data.get("coordinates") or [13.0827, 80.2707],
            "disaster_type": data.get("disaster_type", "Flash Flood"),
            "water_depth_m": float(data.get("water_depth_m", 1.0)),
            "affected_population": pop,
            "urgency": (data.get("urgency") or "high").lower(),
            "status": (data.get("status") or "reported").lower(),
            "reported_at": now_iso,
            "description": data.get("description", "Disaster report submitted via portal."),
            "demands": data.get("demands") or default_demands,
            "road_accessible": data.get("road_accessible", True),
            "allocated_depot": None,
            "allocated_resources": None
        }

        self._incidents.insert(0, new_inc)
        self._save()
        return new_inc

    def update_incident(self, incident_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for inc in self._incidents:
            if inc["id"] == incident_id:
                for key, val in updates.items():
                    if val is not None and key != "id":
                        inc[key] = val
                self._save()
                return inc
        return None

    def delete_incident(self, incident_id: str) -> bool:
        initial_len = len(self._incidents)
        self._incidents = [inc for inc in self._incidents if inc["id"] != incident_id]
        if len(self._incidents) < initial_len:
            self._save()
            return True
        return False

    def reset_to_sample(self):
        """Resets store to fresh realistic sample incidents."""
        self._incidents = [dict(inc) for inc in SAMPLE_CHENNAI_INCIDENTS]
        self._save()
        return self._incidents
