from typing import List, Dict, Any, Literal, Union, Optional
from pydantic import BaseModel, Field


class GeoJSONGeometry(BaseModel):
    type: str
    coordinates: Any


class GeoJSONPoint(GeoJSONGeometry):
    type: Literal["Point"] = "Point"
    coordinates: List[float]  # [lon, lat] in standard GeoJSON


class GeoJSONLineString(GeoJSONGeometry):
    type: Literal["LineString"] = "LineString"
    coordinates: List[List[float]]  # [[lon, lat], ...] or [[lat, lon], ...]


class GeoJSONPolygon(GeoJSONGeometry):
    type: Literal["Polygon"] = "Polygon"
    coordinates: List[List[List[float]]]  # [[[lon, lat], ...]]


class GeoJSONFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    id: Optional[Union[str, int]] = None
    geometry: GeoJSONGeometry
    properties: Dict[str, Any] = Field(default_factory=dict)


class GeoJSONFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: List[GeoJSONFeature] = Field(default_factory=list)
