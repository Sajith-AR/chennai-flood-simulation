from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.map import router as map_router
from backend.app.api.simulation import router as simulation_router
from backend.app.api.resources import router as resources_router
from backend.app.api.advisory import router as advisory_router
from backend.app.api.incidents import router as incidents_router
from backend.app.api.nlp import router as nlp_router
from backend.app.api.forecast import router as forecast_router
from backend.app.api.vulnerability import router as vulnerability_router
from backend.app.api.allocation import router as allocation_router
from backend.app.api.routes import router as routes_router
from backend.app.api.pipeline import router as pipeline_router
from backend.app.api.dashboard import router as dashboard_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["Health"])
api_router.include_router(map_router, tags=["Map"])
api_router.include_router(simulation_router, tags=["Simulation"])
api_router.include_router(resources_router, tags=["Resources"])
api_router.include_router(advisory_router, tags=["AI Advisory"])
api_router.include_router(incidents_router, tags=["Disaster Incidents"])
api_router.include_router(nlp_router, tags=["NLP Extraction"])
api_router.include_router(forecast_router, tags=["Demand Forecasting"])
api_router.include_router(vulnerability_router, tags=["Vulnerability Scoring"])
api_router.include_router(allocation_router, tags=["Resource Allocation (OR-Tools)"])
api_router.include_router(routes_router, tags=["Route Optimization (NetworkX)"])
api_router.include_router(pipeline_router, tags=["Crisis Intelligence Pipeline"])
api_router.include_router(dashboard_router, tags=["Dashboard Intelligence"])

__all__ = ["api_router"]
