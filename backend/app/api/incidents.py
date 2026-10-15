from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

router = APIRouter()


class IncidentCreate(BaseModel):
    title: Optional[str] = None
    location: str
    zone: Optional[str] = "Zone 5 (Central)"
    coordinates: Optional[List[float]] = None
    disaster_type: Optional[str] = "Urban Inundation"
    water_depth_m: Optional[float] = 1.0
    affected_population: int = 150
    urgency: Optional[str] = "high"
    status: Optional[str] = "reported"
    description: str
    demands: Optional[Dict[str, int]] = None
    road_accessible: Optional[bool] = True


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    urgency: Optional[str] = None
    affected_population: Optional[int] = None
    water_depth_m: Optional[float] = None
    road_accessible: Optional[bool] = None
    allocated_depot: Optional[str] = None
    allocated_resources: Optional[Dict[str, int]] = None


@router.get("/incidents")
def list_incidents(
    request: Request,
    urgency: Optional[str] = Query(None, description="Filter by urgency: critical, high, medium, low"),
    status: Optional[str] = Query(None, description="Filter by status: reported, verified, allocated, dispatched, resolved"),
    search: Optional[str] = Query(None, description="Keyword search in title, location, or description")
):
    incident_service = getattr(request.app.state, "incident_service", None)
    if not incident_service:
        from backend.app.services.incident_service import IncidentService
        incident_service = IncidentService()
        request.app.state.incident_service = incident_service

    incidents = incident_service.list_incidents(urgency=urgency, status=status, search=search)
    return {
        "status": "ok",
        "count": len(incidents),
        "incidents": incidents
    }


@router.post("/incidents")
def create_incident(incident: IncidentCreate, request: Request):
    incident_service = getattr(request.app.state, "incident_service", None)
    if not incident_service:
        from backend.app.services.incident_service import IncidentService
        incident_service = IncidentService()
        request.app.state.incident_service = incident_service

    created = incident_service.create_incident(incident.model_dump())
    return {
        "status": "created",
        "incident": created
    }


@router.get("/incidents/{incident_id}")
def get_incident(incident_id: str, request: Request):
    incident_service = getattr(request.app.state, "incident_service", None)
    if not incident_service:
        from backend.app.services.incident_service import IncidentService
        incident_service = IncidentService()
        request.app.state.incident_service = incident_service

    inc = incident_service.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return {
        "status": "ok",
        "incident": inc
    }


@router.patch("/incidents/{incident_id}")
def update_incident(incident_id: str, updates: IncidentUpdate, request: Request):
    incident_service = getattr(request.app.state, "incident_service", None)
    if not incident_service:
        from backend.app.services.incident_service import IncidentService
        incident_service = IncidentService()
        request.app.state.incident_service = incident_service

    updated = incident_service.update_incident(incident_id, updates.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return {
        "status": "updated",
        "incident": updated
    }


@router.delete("/incidents/{incident_id}")
def delete_incident(incident_id: str, request: Request):
    incident_service = getattr(request.app.state, "incident_service", None)
    if not incident_service:
        from backend.app.services.incident_service import IncidentService
        incident_service = IncidentService()
        request.app.state.incident_service = incident_service

    success = incident_service.delete_incident(incident_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return {
        "status": "deleted",
        "incident_id": incident_id
    }


@router.post("/incidents/reset")
def reset_incidents(request: Request):
    incident_service = getattr(request.app.state, "incident_service", None)
    if not incident_service:
        from backend.app.services.incident_service import IncidentService
        incident_service = IncidentService()
        request.app.state.incident_service = incident_service

    incidents = incident_service.reset_to_sample()
    return {
        "status": "reset",
        "count": len(incidents),
        "incidents": incidents
    }
