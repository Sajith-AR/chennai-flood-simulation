import pytest


def test_incidents_api(client):
    # 1. List Incidents
    res = client.get("/api/incidents")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["count"] >= 6
    assert any(inc["location"] == "Velachery AGS Colony" for inc in data["incidents"])

    # 2. Create Incident
    payload = {
        "title": "Severe Waterlogging at Medavakkam Main Road",
        "location": "Medavakkam",
        "zone": "Zone 14 (Perungudi)",
        "coordinates": [12.9200, 80.1900],
        "disaster_type": "Waterlogging",
        "water_depth_m": 1.2,
        "affected_population": 300,
        "urgency": "high",
        "description": "Around 300 residents stranded near junction with water entering homes."
    }
    create_res = client.post("/api/incidents", json=payload)
    assert create_res.status_code == 200
    created = create_res.json()["incident"]
    inc_id = created["id"]
    assert created["location"] == "Medavakkam"
    assert created["affected_population"] == 300

    # 3. Update Incident
    update_res = client.patch(f"/api/incidents/{inc_id}", json={"status": "verified", "urgency": "critical"})
    assert update_res.status_code == 200
    assert update_res.json()["incident"]["status"] == "verified"
    assert update_res.json()["incident"]["urgency"] == "critical"

    # 4. Delete Incident
    del_res = client.delete(f"/api/incidents/{inc_id}")
    assert del_res.status_code == 200


def test_nlp_extraction_api(client):
    payload = {
        "text": "SOS! Catastrophic flash flood in Velachery AGS Colony. Water entered ground floors and is 4 feet deep. Around 500 people need drinking water and food urgently. Need medical kits and rescue boats!"
    }
    res = client.post("/api/nlp/extract", json=payload)
    assert res.status_code == 200
    data = res.json()["extracted_data"]
    assert "Velachery" in data["location"]
    assert data["affected_population"] == 500
    assert data["urgency"] in ["critical", "high"]
    assert data["demands"]["water_litres"] >= 5000
    assert data["demands"]["food_rations"] >= 1000
    assert data["demands"]["rescue_boats"] >= 1
    assert data["confidence_score"] >= 0.70


def test_demand_forecasting_api(client):
    payload = {
        "population": 600,
        "rainfall_mm_hr": 4.5,
        "flood_depth_m": 1.6,
        "vulnerability_score": 80.0,
        "horizon_hours": 24
    }
    res = client.post("/api/forecast/demand", json=payload)
    assert res.status_code == 200
    data = res.json()["forecast"]
    assert data["forecast_period_hours"] == 24
    assert data["demands"]["water_litres"] > 0
    assert data["demands"]["food_rations"] > 0
    assert len(data["hourly_timeline"]) > 0
    assert "available_stock" in data
    assert "projected_shortage" in data


def test_vulnerability_scoring_api(client):
    res = client.get("/api/vulnerability/scores")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert len(data["rankings"]) >= 6

    # Top ranked should have high priority score
    top = data["rankings"][0]
    assert top["priority_score"] >= 60.0
    assert top["priority_tier"] in ["Critical", "High"]
    assert len(top["factor_breakdown"]) == 6


def test_resource_allocation_ortools_api(client):
    res = client.post("/api/allocation/optimize", json={"use_current_incidents": True})
    assert res.status_code == 200
    data = res.json()["result"]
    assert "allocations" in data
    assert len(data["allocations"]) > 0
    assert "Google OR-Tools" in data["solver_method"]

    # Verify inventory bounds are respected
    for alloc in data["allocations"]:
        assert alloc["distance_km"] > 0
        assert len(alloc["allocated_supplies"]) > 0


def test_route_optimization_api(client):
    payload = {
        "source_coords": [13.0827, 80.2707],  # Central Depot
        "destination_coords": [12.9752, 80.2215],  # Velachery
        "source_name": "GCC Central Depot",
        "destination_name": "Velachery Sector",
        "cargo": {"water_litres": 5000, "food_rations": 1000}
    }
    res = client.post("/api/routes/optimize", json=payload)
    assert res.status_code == 200
    route = res.json()["route"]
    assert route["distance_km"] > 0
    assert route["travel_time_min"] > 0
    assert len(route["geojson"]["geometry"]["coordinates"]) >= 2
    assert len(route["waypoints"]) >= 2


def test_end_to_end_pipeline_api(client):
    payload = {
        "raw_message": "SOS! Heavy flood in Mudichur Krishna Nagar. Over 400 people stranded with water over 5 feet high. Urgent food and medical kits needed!",
        "horizon_hours": 24
    }
    res = client.post("/api/pipeline/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["pipeline_stages_completed"] == 7

    results = data["results"]
    assert results["step1_incident"] is not None
    assert "Mudichur" in results["step2_nlp_extraction"]["location"]
    assert results["step3_demand_forecast"]["demands"]["water_litres"] > 0
    assert results["step4_vulnerability_score"]["priority_score"] > 60.0
    assert len(results["step5_resource_allocation"]["allocations"]) > 0
    assert results["step6_route_optimization"] is not None
    assert "GCC EMERGENCY ALERT" in results["step7_alert_broadcast"]["english_script"]


def test_dashboard_stats_api(client):
    res = client.get("/api/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["incidents_count"] >= 6
    assert data["safe_shelters_count"] == 12
    assert data["active_depots_count"] == 5
    assert data["system_status"] == "OPERATIONAL"
