from fastapi import APIRouter, Query, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any

router = APIRouter()


class ForecastRequest(BaseModel):
    population: int = 500
    rainfall_mm_hr: float = 3.5
    flood_depth_m: float = 1.4
    vulnerability_score: float = 75.0
    horizon_hours: int = 24
    resource_type: Optional[str] = "all"


@router.post("/forecast/demand")
def forecast_demand_post(req: ForecastRequest, request: Request):
    demand_forecaster = getattr(request.app.state, "demand_forecaster", None)
    if not demand_forecaster:
        from backend.app.services.demand_forecaster import DemandForecaster
        demand_forecaster = DemandForecaster(
            ml_predictor=getattr(request.app.state, "ml_predictor", None),
            supply_solver=getattr(request.app.state, "supply_solver", None)
        )
        request.app.state.demand_forecaster = demand_forecaster

    result = demand_forecaster.forecast(
        population=req.population,
        rainfall_mm_hr=req.rainfall_mm_hr,
        flood_depth_m=req.flood_depth_m,
        vulnerability_score=req.vulnerability_score,
        horizon_hours=req.horizon_hours,
        resource_type=req.resource_type or "all"
    )
    return {
        "status": "ok",
        "forecast": result
    }


@router.get("/forecast/demand")
def forecast_demand_get(
    request: Request,
    population: int = Query(500, description="Affected population"),
    rainfall_mm_hr: float = Query(3.5, description="Rainfall intensity in mm/hr"),
    flood_depth_m: float = Query(1.4, description="Flood water depth in meters"),
    vulnerability_score: float = Query(75.0, description="Vulnerability priority score 0-100"),
    horizon_hours: int = Query(24, description="Forecast period in hours (6, 12, 24, 48)"),
    resource_type: str = Query("all", description="Resource type: water, food, medicine, blankets, all")
):
    demand_forecaster = getattr(request.app.state, "demand_forecaster", None)
    if not demand_forecaster:
        from backend.app.services.demand_forecaster import DemandForecaster
        demand_forecaster = DemandForecaster(
            ml_predictor=getattr(request.app.state, "ml_predictor", None),
            supply_solver=getattr(request.app.state, "supply_solver", None)
        )
        request.app.state.demand_forecaster = demand_forecaster

    result = demand_forecaster.forecast(
        population=population,
        rainfall_mm_hr=rainfall_mm_hr,
        flood_depth_m=flood_depth_m,
        vulnerability_score=vulnerability_score,
        horizon_hours=horizon_hours,
        resource_type=resource_type
    )
    return {
        "status": "ok",
        "forecast": result
    }
