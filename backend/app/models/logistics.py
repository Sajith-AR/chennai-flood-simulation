from typing import List, Dict, Any, Literal, Optional
from pydantic import BaseModel, Field


class SupplyStock(BaseModel):
    water_litres: int = Field(default=0, ge=0)
    food_rations: int = Field(default=0, ge=0)
    medical_kits: int = Field(default=0, ge=0)


class Warehouse(BaseModel):
    id: str
    name: str
    location: List[float]  # [lat, lon]
    address: Optional[str] = None
    supplies: SupplyStock


class DistributionPoint(BaseModel):
    id: str
    name: str
    location: List[float]  # [lat, lon]
    target_ward: str
    assigned_evacuee_capacity: int = 4000
    demand: SupplyStock


class SupplyRoute(BaseModel):
    route_id: str
    warehouse_id: str
    warehouse_name: str
    destination_id: str
    destination_name: str
    distance_km: float
    transit_time_min: float
    allocated_cargo: SupplyStock
    route_status: Literal["active", "unblocked", "blocked", "rerouted", "impassable"] = "active"
    coordinates: List[List[float]] = Field(default_factory=list)  # [[lat, lon], ...]


class InventoryLedgerWarehouse(BaseModel):
    warehouse_id: str
    name: str
    total_stock: SupplyStock
    allocated_stock: SupplyStock
    available_stock: SupplyStock


class InventoryLedgerDistributionPoint(BaseModel):
    distribution_point_id: str
    name: str
    assigned_evacuees: int
    demand: SupplyStock
    allocated: SupplyStock
    deficit: SupplyStock
    status: Literal["balanced", "deficit", "supplied", "isolated"]


class InventoryStatus(BaseModel):
    total_water_litres: int = 0
    allocated_water_litres: int = 0
    total_food_rations: int = 0
    allocated_food_rations: int = 0
    total_medical_kits: int = 0
    allocated_medical_kits: int = 0


class AllocationTransfer(BaseModel):
    source_warehouse_id: str
    destination_point_id: str
    supplies: SupplyStock


class AllocationRequest(BaseModel):
    warehouse_id: Optional[str] = None
    simulation_id: Optional[str] = None
    allocation_mode: Optional[Literal["MANUAL", "AUTO"]] = "MANUAL"
    shelter_or_point_id: Optional[str] = None
    supplies: Optional[SupplyStock] = None
    transfers: Optional[List[AllocationTransfer]] = None


class AllocationResponse(BaseModel):
    success: bool
    simulation_id: Optional[str] = None
    message: str
    updated_inventory: Dict[str, Any]
    allocation_details: Optional[Dict[str, Any]] = None
    updated_supply_routes: Optional[List[SupplyRoute]] = None
    warnings: List[str] = Field(default_factory=list)
