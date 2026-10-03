"""
Standalone schema and invariant validators for response verification.
Enforces domain rules independently of server implementation.
"""

from typing import Dict, Any, List, Optional
from .geometry import is_coord_in_gcc, haversine_km
from .config import (
    GCC_BOUNDS,
    SPHERE_WATER_LITRES_PER_PERSON_DAY,
    SPHERE_FOOD_RATIONS_PER_PERSON_DAY,
    MIN_MEDICAL_KITS_BASE
)


def validate_geojson_feature_collection(obj: Any, geom_type: Optional[str] = None) -> bool:
    """Validates that obj is a well-formed GeoJSON FeatureCollection."""
    if not isinstance(obj, dict):
        return False
    if obj.get("type") != "FeatureCollection":
        return False
    features = obj.get("features")
    if not isinstance(features, list):
        return False

    for feat in features:
        if not isinstance(feat, dict):
            return False
        if feat.get("type") != "Feature":
            return False
        geom = feat.get("geometry")
        if not isinstance(geom, dict):
            return False
        if geom_type and geom.get("type") != geom_type:
            return False
        coords = geom.get("coordinates")
        if not isinstance(coords, list):
            return False
    return True


def validate_route_linestring(feat: Dict[str, Any]) -> Dict[str, Any]:
    """Validates an individual route Feature containing a LineString."""
    assert feat.get("type") == "Feature", "Must be a GeoJSON Feature"
    geom = feat.get("geometry", {})
    assert geom.get("type") == "LineString", f"Expected LineString, got {geom.get('type')}"
    coords = geom.get("coordinates", [])
    assert len(coords) >= 2, f"LineString must contain at least 2 points, found {len(coords)}"

    # Validate coordinate bounds
    for pt in coords:
        assert len(pt) >= 2, "Coordinates must have at least [x, y]"
        c1, c2 = pt[0], pt[1]
        lat = c1 if (12.0 <= c1 <= 14.0) else c2
        lon = c2 if (12.0 <= c1 <= 14.0) else c1
        assert is_coord_in_gcc(lat, lon), f"Route node [{lat}, {lon}] is outside GCC bounds"

    props = feat.get("properties", {})
    # Check optional metrics if present
    if "distance_km" in props:
        assert props["distance_km"] >= 0.0, "Route distance cannot be negative"
    if "travel_distance_km" in props:
        assert props["travel_distance_km"] >= 0.0, "Route distance cannot be negative"

    return props


def validate_inventory_ledger_invariants(ledger: Dict[str, Any]) -> None:
    """
    Validates physical conservation laws in the resource inventory ledger:
    1. Stock non-negativity.
    2. Available + Allocated <= Total (or equals Total).
    """
    assert isinstance(ledger, dict), "Inventory ledger must be a dictionary"

    # Support multiple documented schemas: global_summary or flat fields or warehouse lists
    if "warehouses" in ledger:
        for wh in ledger["warehouses"]:
            total = wh.get("total_stock", {})
            available = wh.get("available_stock", {})
            allocated = wh.get("allocated_stock", {})

            for item in ["drinking_water_liters", "food_rations", "medical_kits", "water_litres"]:
                tot_val = total.get(item, 0)
                avail_val = available.get(item, 0)
                alloc_val = allocated.get(item, 0)

                assert tot_val >= 0, f"Negative total {item} in warehouse {wh.get('name')}"
                assert avail_val >= 0, f"Negative available {item} in warehouse {wh.get('name')}"
                assert alloc_val >= 0, f"Negative allocated {item} in warehouse {wh.get('name')}"
                assert avail_val + alloc_val <= tot_val + 1, (
                    f"Conservation violated for {item}: {avail_val} + {alloc_val} > {tot_val}"
                )

    # Flat schema support (PROJECT.md contract: total_water_litres, allocated_water_litres, etc.)
    for resource in ["water_litres", "food_rations", "medical_kits"]:
        total_key = f"total_{resource}"
        alloc_key = f"allocated_{resource}"
        if total_key in ledger:
            tot = ledger[total_key]
            assert tot >= 0, f"{total_key} must be >= 0"
            if alloc_key in ledger:
                alloc = ledger[alloc_key]
                assert alloc >= 0, f"{alloc_key} must be >= 0"
                assert alloc <= tot, f"Allocated {alloc} exceeds total {tot} for {resource}"


def validate_shelter_capacity_invariants(shelter_allocations: List[Dict[str, Any]]) -> None:
    """
    Verifies that no shelter is assigned more evacuees than its max capacity
    unless marked with overflow / rerouted status.
    """
    for shelter in shelter_allocations:
        name = shelter.get("name", shelter.get("shelter_id", "Unknown"))
        allocated = shelter.get("allocated_evacuees", shelter.get("assigned_evacuees", 0))
        remaining = shelter.get("remaining_capacity")
        status = shelter.get("status", "")

        assert allocated >= 0, f"Shelter {name} has negative allocated evacuees: {allocated}"

        if remaining is not None:
            assert remaining >= 0 or status in ["full", "overflow", "near_capacity"], (
                f"Shelter {name} has negative remaining capacity {remaining} with status {status}"
            )


def validate_sphere_demand_standards(assigned_evacuees: int, demand: Dict[str, Any]) -> None:
    """
    Verifies demand calculation satisfies Sphere Project humanitarian standards:
    - 3.0 Litres water per person per day
    - 3.0 Food rations per person per day
    - Minimum medical kits
    """
    if assigned_evacuees <= 0:
        return

    exp_water = assigned_evacuees * SPHERE_WATER_LITRES_PER_PERSON_DAY
    exp_food = assigned_evacuees * SPHERE_FOOD_RATIONS_PER_PERSON_DAY

    actual_water = demand.get("drinking_water_liters", demand.get("water_litres", 0))
    actual_food = demand.get("food_rations", 0)
    actual_meds = demand.get("medical_kits", 0)

    assert actual_water >= exp_water * 0.95, (
        f"Water demand {actual_water} below Sphere standard {exp_water} for {assigned_evacuees} evacuees"
    )
    assert actual_food >= exp_food * 0.95, (
        f"Food demand {actual_food} below Sphere standard {exp_food} for {assigned_evacuees} evacuees"
    )
    assert actual_meds >= MIN_MEDICAL_KITS_BASE, (
        f"Medical kits {actual_meds} below baseline minimum {MIN_MEDICAL_KITS_BASE}"
    )
