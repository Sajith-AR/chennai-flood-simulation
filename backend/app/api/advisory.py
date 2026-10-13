from fastapi import APIRouter, Request, HTTPException
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from backend.app.services.ai_advisor import AIAdvisorService

router = APIRouter()


class AdvisoryEvaluationRequest(BaseModel):
    simulation_id: Optional[str] = None


from datetime import datetime, timezone

@router.get("/advisory")
@router.get("/advisor/insights")
@router.get("/advisory/insights")
def get_latest_advisory(request: Request, hour: Optional[int] = 0):
    """
    Returns real-time AI Decision Support advisory for current disaster state:
    - Critical Ward Vulnerability Index (ranked)
    - Casualty prevention & bottleneck warning indicators
    - Optimal airlift drop zones
    - Bilingual (Tamil & English) siren alerts & bulletins
    """
    ai_advisor: Optional[AIAdvisorService] = getattr(request.app.state, "ai_advisor", None)
    flood_engine = getattr(request.app.state, "flood_engine", None)
    road_engine = getattr(request.app.state, "road_engine", None)

    if not ai_advisor or not flood_engine:
        raise HTTPException(status_code=500, detail="AI Advisor services not initialized.")

    latest_sim = getattr(request.app.state, "latest_simulation", None)
    latest_flood_zones = getattr(request.app.state, "latest_flood_zones", None)

    step_zones = latest_flood_zones or []
    isolated_clusters = latest_sim.get("isolated_clusters", []) if latest_sim else []
    shelters = latest_sim.get("shelter_allocations", []) if latest_sim else []
    dynamic_graph = getattr(request.app.state, "latest_dynamic_graph", None)

    if latest_sim and "ai_advisory" in latest_sim:
        advisory = latest_sim["ai_advisory"]
    else:
        advisory = ai_advisor.generate_comprehensive_advisory(
            step_zones_state=step_zones,
            dynamic_graph=dynamic_graph,
            isolated_clusters=isolated_clusters,
            shelter_allocations=shelters,
            flood_engine=flood_engine,
        )

    # Harmonize with frontend AIAdvisorData schema
    peak_depth = advisory.get("summary", {}).get("peak_inundation_observed_m", 0.5)
    radar_score = min(98, max(38, int(peak_depth * 45 + (hour or 0) * 2)))
    radar_level = (
        'DEFCON 1 (CRITICAL)' if radar_score >= 85
        else 'DEFCON 2 (SEVERE)' if radar_score >= 65
        else 'DEFCON 3 (ELEVATED)' if radar_score >= 45
        else 'DEFCON 4 (ADVISORY)'
    )

    broadcasts = advisory.get("bilingual_emergency_broadcasts", {})
    evac_advice = []
    directives = advisory.get("casualty_prevention_indicators", {}).get("preventative_directives", [])
    if directives:
        for idx, d in enumerate(directives):
            evac_advice.append({
                "id": f"ADV-{idx+1:02d}",
                "priority": "CRITICAL" if "CRITICAL" in d.get("priority", "") else "URGENT",
                "title": d.get("action", "Tactical Evacuation Directive"),
                "details": d.get("details", ""),
                "affected_ward": "Zone 13 (Adyar Basin) & Zone 14 (Velachery)",
                "target_shelter": "Anna University CEG & IIT Madras",
                "mode_suggested": "Amphibious Zodiac" if idx == 0 else "High-Clearance 6x6 Truck"
            })
    else:
        evac_advice = [
            {
                "id": "ADV-01",
                "priority": "CRITICAL",
                "title": "Immediate Inundation Warning — Low-lying Micro-basins",
                "details": "Adyar and Pallikaranai backflow accelerating. Immediate evacuation mandated for ground floors.",
                "affected_ward": "Ward 178 (Velachery) & Ward 170 (Saidapet)",
                "target_shelter": "Anna University (CEG Campus) & IIT Madras SAC",
                "mode_suggested": "Amphibious Zodiac",
            }
        ]

    bottlenecks = []
    for idx, bn in enumerate(advisory.get("casualty_prevention_indicators", {}).get("chokepoints_and_bottlenecks", [])):
        bottlenecks.append({
            "id": bn.get("chokepoint_id", f"BN-{idx+1:02d}"),
            "corridor_name": bn.get("name", "Arterial Corridor"),
            "zone": "Chennai Central / Basin",
            "water_depth_m": bn.get("water_depth_m", 0.0),
            "traffic_choke_status": "SEVERED" if bn.get("water_depth_m", 0) >= 0.5 else "HIGH IMPEDANCE",
            "suggested_detour": bn.get("diversion_advisory", "Divert to elevated bypass"),
        })

    frontend_ward_rankings = []
    for w in advisory.get("ward_vulnerability_index", []):
        frontend_ward_rankings.append({
            "ward_id": w.get("zone_id", ""),
            "ward_name": w.get("name", ""),
            "risk_index": w.get("composite_risk_score", 50),
            "vulnerable_population": w.get("population", 100000),
            "water_depth_m": w.get("peak_flood_depth_m", 0.0),
            "trend": "peaking" if w.get("peak_flood_depth_m", 0) > 0.8 else "rising",
        })

    now_utc = datetime.now(timezone.utc)
    return {
        **advisory,
        "risk_radar_level": radar_level,
        "radar_score": radar_score,
        "tactical_summary": f"Hydrological models observe {advisory.get('summary', {}).get('overall_severity', 'Moderate')} conditions at T+{hour or 0}h. Peak inundation depth {peak_depth}m across {advisory.get('summary', {}).get('critical_wards_count', 0)} critical GCC zones.",
        "evacuation_advice": evac_advice,
        "broadcast": {
            "english": broadcasts.get("siren_broadcast_english", "Flash flood alert in effect."),
            "tamil": broadcasts.get("siren_broadcast_tamil", "வெள்ள அபாய எச்சரிக்கை செயலில் உள்ளது."),
            "timestamp": now_utc.strftime("%H:%M UTC"),
            "code": f"GCC-AI-ADV-{now_utc.year}",
            "alert_level": "Emergency Evacuation" if radar_score >= 75 else "Red Alert",
        },
        "bottlenecks": bottlenecks,
        "ward_rankings": frontend_ward_rankings,
    }


@router.get("/advisory/wards")
def get_ward_vulnerability_rankings(request: Request):
    """
    Returns specifically the ranked Critical Ward Vulnerability Index for Chennai's 15 GCC Zones.
    """
    ai_advisor: Optional[AIAdvisorService] = getattr(request.app.state, "ai_advisor", None)
    flood_engine = getattr(request.app.state, "flood_engine", None)
    if not ai_advisor or not flood_engine:
        raise HTTPException(status_code=500, detail="AI Advisor services not initialized.")

    latest_flood_zones = getattr(request.app.state, "latest_flood_zones", None) or []
    return {
        "status": "success",
        "ward_rankings": ai_advisor.compute_ward_vulnerability_index(
            step_zones_state=latest_flood_zones,
            flood_engine=flood_engine,
        )
    }


@router.get("/advisory/airlift")
def get_optimal_airlift_zones(request: Request):
    """
    Returns optimal airlift drop zone coordinates for currently isolated clusters.
    """
    ai_advisor: Optional[AIAdvisorService] = getattr(request.app.state, "ai_advisor", None)
    flood_engine = getattr(request.app.state, "flood_engine", None)
    if not ai_advisor or not flood_engine:
        raise HTTPException(status_code=500, detail="AI Advisor services not initialized.")

    latest_sim = getattr(request.app.state, "latest_simulation", None)
    isolated = latest_sim.get("isolated_clusters", []) if latest_sim else []
    latest_flood_zones = getattr(request.app.state, "latest_flood_zones", None) or []

    return {
        "status": "success",
        "optimal_airlift_drop_zones": ai_advisor.compute_optimal_airlift_drop_zones(
            isolated_clusters=isolated,
            step_zones_state=latest_flood_zones,
            flood_engine=flood_engine,
        )
    }


@router.get("/advisory/broadcast")
def get_bilingual_broadcasts(request: Request):
    """
    Returns Tamil & English emergency alert bulletins for citizen warning sirens and SMS.
    """
    ai_advisor: Optional[AIAdvisorService] = getattr(request.app.state, "ai_advisor", None)
    flood_engine = getattr(request.app.state, "flood_engine", None)
    if not ai_advisor or not flood_engine:
        raise HTTPException(status_code=500, detail="AI Advisor services not initialized.")

    latest_sim = getattr(request.app.state, "latest_simulation", None)
    latest_flood_zones = getattr(request.app.state, "latest_flood_zones", None) or []

    ward_rankings = ai_advisor.compute_ward_vulnerability_index(
        step_zones_state=latest_flood_zones,
        flood_engine=flood_engine,
    )
    peak_depth = max([w["peak_flood_depth_m"] for w in ward_rankings] + [0.0])
    total_stranded = sum(ic.get("trapped_population", 0) for ic in (latest_sim.get("isolated_clusters", []) if latest_sim else []))
    overall_sev = "Catastrophic" if peak_depth >= 1.20 else ("Severe" if peak_depth >= 0.60 else "Moderate")

    return {
        "status": "success",
        "emergency_broadcasts": ai_advisor.generate_bilingual_emergency_broadcasts(
            overall_severity=overall_sev,
            top_vulnerable_wards=ward_rankings,
            peak_observed_depth=peak_depth,
            total_stranded=total_stranded,
        )
    }
