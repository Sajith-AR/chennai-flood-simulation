from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.map import router as map_router
from backend.app.api.simulation import router as simulation_router
from backend.app.api.resources import router as resources_router
from backend.app.api.advisory import router as advisory_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["Health"])
api_router.include_router(map_router, tags=["Map"])
api_router.include_router(simulation_router, tags=["Simulation"])
api_router.include_router(resources_router, tags=["Resources"])
api_router.include_router(advisory_router, tags=["AI Advisory"])

__all__ = ["api_router"]
