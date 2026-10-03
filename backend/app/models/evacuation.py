from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class Shelter(BaseModel):
    id: str
    name: str
    neighborhood: str
    location: List[float]  # [lat, lon]
    capacity: int
    current_occupancy: int
    amenities: List[str] = Field(default_factory=list)


class PopulationCluster(BaseModel):
    id: str
    name: str
    location: List[float]  # [lat, lon]
    estimated_population: int
    density_per_sqkm: int
    vulnerability_weight: float = 1.0
    risk_level: str = "Moderate"


class EvacuationRoute(BaseModel):
    route_id: str
    source_cluster_id: str
    source_name: str
    destination_shelter_id: str
    destination_name: str
    evacuee_count: int
    distance_km: float
    estimated_time_min: float
    status: Literal["clear", "warning", "rerouted", "impassable"] = "clear"
    coordinates: List[List[float]] = Field(default_factory=list)  # [[lat, lon], ...]


class ShelterAllocation(BaseModel):
    shelter_id: str
    name: str
    allocated_evacuees: int
    remaining_capacity: int
    status: Literal["available", "near_capacity", "full", "compromised"]


class IsolatedCluster(BaseModel):
    cluster_id: str
    name: str
    location: List[float]  # [lat, lon]
    trapped_population: int
    requires_airlift: bool = True
