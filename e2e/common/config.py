"""
Global configuration, physical constants, and operational boundaries for Chennai Flood E2E tests.
Strictly opaque-box: contains only documented domain boundaries and interface constants.
"""

import os

# Base API URL
API_BASE_URL = os.environ.get("SIM_API_URL", "http://localhost:8000").rstrip("/")

# Greater Chennai Corporation (GCC) Geographic Boundaries
GCC_BOUNDS = {
    "lat_min": 12.85,
    "lat_max": 13.25,
    "lon_min": 80.05,
    "lon_max": 80.35,
}

CHENNAI_CENTER = {
    "lat": 13.0827,
    "lon": 80.2707,
}

# Humanitarian & Operational Standards
SPHERE_WATER_LITRES_PER_PERSON_DAY = 3.0
SPHERE_FOOD_RATIONS_PER_PERSON_DAY = 3.0
MIN_MEDICAL_KITS_BASE = 10
MEDICAL_KITS_PER_CAPITA_RATIO = 0.02

# Depth thresholds for navigability
MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS = 0.3
MAX_PASSABLE_DEPTH_EVACUATION_PEDESTRIAN_METERS = 0.5

# Physical scenario boundaries
MIN_RAINFALL_INTENSITY = 0.0
MAX_RAINFALL_INTENSITY = 250.0  # mm/hr extreme monsoon
MIN_FLOOD_DEPTH = 0.0
MAX_FLOOD_DEPTH = 4.0           # meters extreme catastrophic
MIN_RADIUS_METERS = 100.0
MAX_RADIUS_METERS = 15000.0
