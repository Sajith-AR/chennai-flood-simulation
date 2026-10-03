from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class FloodZoneInput(BaseModel):
    id: str = "FZ-01"
    type: Literal["circle", "polygon", "preset"] = "circle"
    center: Optional[List[float]] = None  # [lat, lon]
    radius_meters: Optional[float] = Field(None, ge=50.0, le=25000.0)
    coordinates: Optional[List[Any]] = None  # [[lat, lon], ...] or [lat, lon]
    preset_key: Optional[str] = None
    initial_depth_m: Optional[float] = Field(None, ge=0.0, le=6.0)


class DisasterParameters(BaseModel):
    rainfall_intensity_mm_hr: float = Field(65.0, ge=0.0, le=350.0)
    flood_depth_meters: float = Field(1.2, ge=0.0, le=6.0)
    spread_rate_meters_hr: float = Field(150.0, ge=0.0, le=2000.0)
    duration_hours: int = Field(6, ge=1, le=24)
    time_step_hours: float = Field(1.0, ge=0.25, le=6.0)


class SimulationRequest(BaseModel):
    scenario_name: Optional[str] = "Chennai Flood Simulation Scenario"
    flood_zones: List[FloodZoneInput] = Field(default_factory=list)
    parameters: Optional[DisasterParameters] = None
    shelter_ids: Optional[List[str]] = None
    warehouse_ids: Optional[List[str]] = None


class FloodPolygonProperties(BaseModel):
    zone_id: str
    water_depth_m: float
    severity: Literal["advisory", "moderate", "severe", "catastrophic"]
    fill_color: str
    stroke_color: str
    fill_opacity: float
    time_step: int
