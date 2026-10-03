"""
Common utilities, geometry algorithms, and validation rules for Chennai Flood E2E test suite.
"""

from .config import (
    API_BASE_URL,
    GCC_BOUNDS,
    CHENNAI_CENTER,
    SPHERE_WATER_LITRES_PER_PERSON_DAY,
    SPHERE_FOOD_RATIONS_PER_PERSON_DAY,
    MIN_MEDICAL_KITS_BASE,
    MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS,
    MAX_PASSABLE_DEPTH_EVACUATION_PEDESTRIAN_METERS
)
from .geometry import (
    haversine_km,
    is_coord_in_gcc,
    point_in_polygon,
    point_in_circle,
    route_intersects_deep_flood
)
from .client import SimulationApiClient
from .validators import (
    validate_geojson_feature_collection,
    validate_route_linestring,
    validate_inventory_ledger_invariants,
    validate_shelter_capacity_invariants,
    validate_sphere_demand_standards
)

__all__ = [
    "API_BASE_URL",
    "GCC_BOUNDS",
    "CHENNAI_CENTER",
    "SPHERE_WATER_LITRES_PER_PERSON_DAY",
    "SPHERE_FOOD_RATIONS_PER_PERSON_DAY",
    "MIN_MEDICAL_KITS_BASE",
    "MAX_PASSABLE_DEPTH_SUPPLY_VEHICLE_METERS",
    "MAX_PASSABLE_DEPTH_EVACUATION_PEDESTRIAN_METERS",
    "haversine_km",
    "is_coord_in_gcc",
    "point_in_polygon",
    "point_in_circle",
    "route_intersects_deep_flood",
    "SimulationApiClient",
    "validate_geojson_feature_collection",
    "validate_route_linestring",
    "validate_inventory_ledger_invariants",
    "validate_shelter_capacity_invariants",
    "validate_sphere_demand_standards"
]
