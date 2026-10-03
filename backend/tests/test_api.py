import pytest


def test_get_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "chennai-flood-sim"
    assert data["network_stats"]["nodes_count"] >= 70
    assert data["network_stats"]["warehouses_count"] == 5
    assert data["network_stats"]["shelters_count"] == 12


def test_get_map_init(client):
    res = client.get("/api/map/init")
    assert res.status_code == 200
    data = res.json()
    assert data["city"] == "Chennai"
    assert data["center"] == [13.0827, 80.2707]
    assert len(data["shelters"]) == 12
    assert len(data["warehouses"]) == 5
    assert len(data["distribution_points"]) == 10
    assert len(data["population_clusters"]) == 10
    assert len(data["presets"]) >= 4


def test_simulation_run_circle(client):
    payload = {
        "scenario_name": "Velachery Moderate Inundation",
        "flood_zones": [
            {
                "id": "FZ-01",
                "type": "circle",
                "center": [12.9796, 80.2185],
                "radius_meters": 1200,
                "initial_depth_m": 1.2,
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 75.0,
            "flood_depth_meters": 1.2,
            "spread_rate_meters_hr": 120.0,
            "duration_hours": 4,
            "time_step_hours": 1.0,
        },
    }
    res = client.post("/api/simulation/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "simulation_id" in data
    assert len(data["timeline"]) == 5

    step0 = data["timeline"][0]
    assert "flood_polygons" in step0
    assert "evacuation_routes" in step0
    assert "shelter_allocations" in step0
    assert "supply_routes" in step0
    assert "inventory_status" in step0

    # Summary metrics
    summary = data["summary"]
    assert summary["total_affected_population"] > 0
    assert summary["shelter_overall_utilization_pct"] >= 0.0


def test_simulation_run_preset(client):
    payload = {
        "scenario_name": "Historic Adyar Basin Preset Test",
        "flood_zones": [
            {
                "id": "FZ-PRESET",
                "type": "preset",
                "preset_key": "adyar_basin",
            }
        ],
    }
    res = client.post("/api/simulation/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["timeline"]) >= 5


def test_simulation_run_polygon(client):
    payload = {
        "scenario_name": "Custom Polygon Test",
        "flood_zones": [
            {
                "id": "FZ-POLY",
                "type": "polygon",
                "coordinates": [
                    [13.0200, 80.2200],
                    [13.0300, 80.2200],
                    [13.0300, 80.2300],
                    [13.0200, 80.2300],
                    [13.0200, 80.2200],
                ],
                "initial_depth_m": 1.0,
            }
        ],
        "parameters": {
            "duration_hours": 2,
            "time_step_hours": 1.0,
        },
    }
    res = client.post("/api/simulation/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["timeline"]) == 3


def test_simulation_run_outside_bounds_rejection(client):
    # Latitude 15.5 is well outside Chennai bounds
    payload = {
        "flood_zones": [
            {
                "id": "FZ-OUT",
                "type": "circle",
                "center": [15.5000, 80.2000],
                "radius_meters": 1000,
            }
        ]
    }
    res = client.post("/api/simulation/run", json=payload)
    assert res.status_code == 400
    assert "outside Chennai operational boundaries" in res.json()["detail"]


def test_resources_allocate_success(client):
    payload = {
        "shelter_or_point_id": "DP-02",
        "supplies": {
            "water_litres": 3000,
            "food_rations": 3000,
            "medical_kits": 20,
        },
    }
    res = client.post("/api/resources/allocate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "Supplies allocated successfully" in data["message"]
    assert "updated_inventory" in data


def test_resources_allocate_excess_rejection(client):
    payload = {
        "shelter_or_point_id": "DP-02",
        "supplies": {
            "water_litres": 99999999,  # Ridiculously high quantity exceeding all warehouses
            "food_rations": 1000,
            "medical_kits": 10,
        },
    }
    res = client.post("/api/resources/allocate", json=payload)
    assert res.status_code == 400
    assert "Insufficient inventory" in res.json()["detail"]
