"""
End-to-End Crisis Resource Intelligence & Autonomous Logistics Pipeline.
Coordinates: Disaster Report -> NLP Extraction -> Demand Forecasting ->
Priority Scoring -> Resource Allocation -> Route Optimization -> Alert & Dispatch.
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

router = APIRouter()


class PipelineRunRequest(BaseModel):
    raw_message: Optional[str] = None
    incident_id: Optional[str] = None
    horizon_hours: int = 24


@router.post("/pipeline/run")
def run_end_to_end_pipeline(req: PipelineRunRequest, request: Request):
    # 1. Services Setup
    incident_service = getattr(request.app.state, "incident_service", None)
    if not incident_service:
        from backend.app.services.incident_service import IncidentService
        incident_service = IncidentService()
        request.app.state.incident_service = incident_service

    nlp_extractor = getattr(request.app.state, "nlp_extractor", None)
    if not nlp_extractor:
        from backend.app.services.nlp_extractor import NLPExtractor
        nlp_extractor = NLPExtractor()
        request.app.state.nlp_extractor = nlp_extractor

    demand_forecaster = getattr(request.app.state, "demand_forecaster", None)
    if not demand_forecaster:
        from backend.app.services.demand_forecaster import DemandForecaster
        demand_forecaster = DemandForecaster(
            ml_predictor=getattr(request.app.state, "ml_predictor", None),
            supply_solver=getattr(request.app.state, "supply_solver", None)
        )
        request.app.state.demand_forecaster = demand_forecaster

    vulnerability_scorer = getattr(request.app.state, "vulnerability_scorer", None)
    if not vulnerability_scorer:
        from backend.app.services.vulnerability_scorer import VulnerabilityScorer
        vulnerability_scorer = VulnerabilityScorer()
        request.app.state.vulnerability_scorer = vulnerability_scorer

    allocation_optimizer = getattr(request.app.state, "allocation_optimizer", None)
    if not allocation_optimizer:
        from backend.app.services.allocation_optimizer import AllocationOptimizer
        allocation_optimizer = AllocationOptimizer(
            supply_solver=getattr(request.app.state, "supply_solver", None)
        )
        request.app.state.allocation_optimizer = allocation_optimizer

    road_engine = getattr(request.app.state, "road_engine", None)
    if not road_engine:
        from backend.app.services.road_network import RoadNetworkEngine
        road_engine = RoadNetworkEngine()
        request.app.state.road_engine = road_engine

    from backend.app.services.route_optimizer import RouteOptimizer
    route_optimizer = RouteOptimizer(road_engine)

    step_results = {}

    # Step 1 & 2: Incident & NLP Information Extraction
    incident = None
    nlp_data = None
    if req.incident_id:
        incident = incident_service.get_incident(req.incident_id)

    if not incident and req.raw_message:
        nlp_data = nlp_extractor.extract(req.raw_message)
        incident = incident_service.create_incident({
            "title": f"Incident at {nlp_data['location']}",
            "location": nlp_data["location"],
            "zone": nlp_data["zone"],
            "coordinates": nlp_data["coordinates"],
            "disaster_type": nlp_data["disaster_type"],
            "water_depth_m": nlp_data["water_depth_m"],
            "affected_population": nlp_data["affected_population"],
            "urgency": nlp_data["urgency"],
            "description": req.raw_message,
            "demands": nlp_data["demands"],
            "road_accessible": nlp_data["road_accessible"]
        })
    elif incident and not nlp_data:
        nlp_data = nlp_extractor.extract(incident["description"])

    if not incident:
        # Fallback to first sample incident
        incidents = incident_service.list_incidents()
        incident = incidents[0] if incidents else None
        if incident:
            nlp_data = nlp_extractor.extract(incident["description"])

    step_results["step1_incident"] = incident
    step_results["step2_nlp_extraction"] = nlp_data

    # Step 3: Demand Forecasting (Ensemble ML / Sphere Standards)
    pop = incident.get("affected_population", 500) if incident else 500
    depth = incident.get("water_depth_m", 1.4) if incident else 1.4
    forecast = demand_forecaster.forecast(
        population=pop,
        rainfall_mm_hr=4.0,
        flood_depth_m=depth,
        vulnerability_score=85.0 if incident and incident.get("urgency") == "critical" else 65.0,
        horizon_hours=req.horizon_hours
    )
    step_results["step3_demand_forecast"] = forecast

    # Step 4: Vulnerability & Priority Scoring (MCDA 0-100)
    score_result = vulnerability_scorer.score_area(
        area_id=incident["id"] if incident else "INC-TARGET",
        name=incident.get("location", "Sector") if incident else "Target Sector",
        affected_population=pop,
        urgency=incident.get("urgency", "critical") if incident else "critical",
        water_depth_m=depth,
        road_accessible=incident.get("road_accessible", False) if incident else False,
        demands=incident.get("demands", forecast["demands"]) if incident else forecast["demands"],
        coordinates=incident.get("coordinates") if incident else [12.9752, 80.2215]
    )
    step_results["step4_vulnerability_score"] = score_result

    # Step 5: Resource Allocation Engine (Google OR-Tools pywraplp)
    all_active = incident_service.list_incidents()
    # Attach computed score
    scored_list = vulnerability_scorer.score_all_incidents(all_active)
    allocation_plan = allocation_optimizer.optimize(scored_list)
    step_results["step5_resource_allocation"] = allocation_plan

    # Find the specific allocation for our target incident
    target_alloc = None
    target_id = incident["id"] if incident else None
    for alloc in allocation_plan.get("allocations", []):
        if alloc.get("destination_incident_id") == target_id:
            target_alloc = alloc
            break
    if not target_alloc and allocation_plan.get("allocations"):
        target_alloc = allocation_plan["allocations"][0]

    # Step 6: Route Optimization (NetworkX A* / Multi-Modal)
    route_result = None
    if target_alloc:
        route_result = route_optimizer.optimize_route(
            source_coords=target_alloc["source_coordinates"],
            dest_coords=target_alloc["destination_coordinates"],
            source_name=target_alloc["source_warehouse_name"],
            dest_name=target_alloc["destination_name"],
            cargo=target_alloc["allocated_supplies"],
            preferred_mode=target_alloc.get("transport_mode")
        )
    step_results["step6_route_optimization"] = route_result

    # Step 7: Emergency Alert Broadcast & Dispatch Manifest
    loc_name = incident.get("location", "Chennai Ward") if incident else "Chennai Ward"
    bilingual_alert = {
        "alert_id": f"BROADCAST-{incident['id'] if incident else 'CHENNAI'}",
        "channel": "Cellular Tower Cell Broadcast (CB Channel 4370) & VHF Radio",
        "english_script": (
            f"GCC EMERGENCY ALERT: Flood response active in {loc_name}. "
            f"Relief convoy dispatched with potable water, rations, and first aid. "
            f"Civilians advised to seek elevated ground. Helpline: 1913."
        ),
        "tamil_script": (
            f"பெருநகர சென்னை மாநகராட்சி அவசர எச்சரிக்கை: {loc_name} பகுதியில் வெள்ள நிவாரண பணிகள் தீவிரப்படுத்தப்பட்டுள்ளன. "
            f"குடிநீர், உணவு பொருட்கள் மற்றும் முதலுதவி பொருட்கள் அடங்கிய வாகனங்கள் அனுப்பி வைக்கப்பட்டுள்ளன. "
            f"பொதுமக்கள் பாதுகாப்பான உயரமான இடங்களில் இருக்குமாறு கேட்டுக்கொள்ளப்படுகிறார்கள். உதவி எண்: 1913."
        ),
        "dispatch_status": "DISPATCH_AUTHORIZED",
        "target_audience": f"Estimated {pop:,} citizens in {loc_name}"
    }
    step_results["step7_alert_broadcast"] = bilingual_alert

    return {
        "status": "success",
        "workflow": "AI-Driven Crisis Resource Intelligence & Autonomous Logistics Pipeline",
        "pipeline_stages_completed": 7,
        "results": step_results
    }
