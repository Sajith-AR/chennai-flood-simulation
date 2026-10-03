import pytest
import networkx as nx
from backend.app.models.disaster import FloodZoneInput, DisasterParameters


def test_road_network_loading(road_engine):
    assert len(road_engine.nodes_data) >= 70
    assert len(road_engine.edges_data) >= 200
    assert nx.is_strongly_connected(road_engine.base_graph)


def test_find_nearest_node(road_engine):
    # Near Chennai Central [13.0827, 80.2764]
    node_central = road_engine.find_nearest_node(13.0830, 80.2760)
    assert node_central in ["N_CENTRAL", "N_PARK_TOWN"]

    # Near Kathipara [13.0070, 80.2050]
    node_kathipara = road_engine.find_nearest_node(13.0075, 80.2055)
    assert node_kathipara == "N_KATHIPARA"


def test_dynamic_inundation_weights(road_engine, flood_engine):
    # Place deep flood centered directly on Saidapet Bridge [13.0213, 80.2231]
    zone = FloodZoneInput(
        id="FZ-SAIDAPET",
        type="circle",
        center=[13.0213, 80.2231],
        radius_meters=1000.0,
        initial_depth_m=2.0,
    )
    params = DisasterParameters(duration_hours=1, time_step_hours=1.0)
    timeline = flood_engine.compute_timeline([zone], params)
    step_state = timeline[1]["zones_state"]

    # Build dynamic graph with closure at >= 0.5m
    dyn_graph = road_engine.build_dynamic_graph(step_state, closure_threshold_m=0.50)

    # Base graph has Saidapet bridge edge
    assert road_engine.base_graph.has_edge("N_SAIDAPET_BR", "N_LITTLE_MOUNT")

    # In dynamic graph, deep flooded bridge should be closed / removed
    assert not dyn_graph.has_edge("N_SAIDAPET_BR", "N_LITTLE_MOUNT")
    assert road_engine.get_severed_roads_count(dyn_graph) > 0


def test_elevated_flyover_resistance(road_engine, flood_engine):
    # Poonamallee High Rd Expressway is elevated; surface flood of 1.0m (<1.5m) should not sever it
    zone = FloodZoneInput(
        id="FZ-EXPRESSWAY",
        type="circle",
        center=[13.0680, 80.1780],
        radius_meters=800.0,
        initial_depth_m=1.0,
    )
    params = DisasterParameters(duration_hours=1, time_step_hours=1.0)
    timeline = flood_engine.compute_timeline([zone], params)
    step_state = timeline[1]["zones_state"]

    dyn_graph = road_engine.build_dynamic_graph(step_state, closure_threshold_m=0.50)
    # Elevated expressway edges should remain open
    assert dyn_graph.has_edge("N_KOYAMBEDU_FLY", "N_MADURAVOYAL")
