"""
Pytest configuration, CLI flags, and shared fixtures for the E2E test suite.
"""

import pytest
import os
from e2e.common.client import SimulationApiClient
from e2e.common.config import API_BASE_URL


def pytest_addoption(parser):
    parser.addoption(
        "--api-url",
        action="store",
        default=os.environ.get("SIM_API_URL", API_BASE_URL),
        help="Base URL for the Chennai Flood Simulation REST API"
    )
    parser.addoption(
        "--strict-live",
        action="store_true",
        default=False,
        help="Fail tests immediately if backend is offline instead of skipping"
    )


def pytest_configure(config):
    config.addinivalue_line("markers", "tier1: mark test as Tier 1 Feature Coverage")
    config.addinivalue_line("markers", "tier2: mark test as Tier 2 Boundary & Corner Case")
    config.addinivalue_line("markers", "tier3: mark test as Tier 3 Cross-Feature Interaction")
    config.addinivalue_line("markers", "tier4: mark test as Tier 4 Real-World Scenario")
    config.addinivalue_line("markers", "offline_ok: mark test as runnable offline without backend")


@pytest.fixture(scope="session")
def base_url(request) -> str:
    return request.config.getoption("--api-url").rstrip("/")


@pytest.fixture(scope="session")
def api_client(base_url: str) -> SimulationApiClient:
    return SimulationApiClient(base_url=base_url)


@pytest.fixture(scope="session")
def is_server_online(api_client: SimulationApiClient) -> bool:
    return api_client.is_online()


@pytest.fixture(autouse=True)
def skip_if_offline(request, api_client: SimulationApiClient, is_server_online: bool):
    """
    By default, if a test relies on the live REST API and the backend is not running,
    it gracefully skips so CI test runs don't crash when backend isn't up yet.
    Pass --strict-live to force failures on offline servers.
    """
    if "offline_ok" in request.keywords:
        return

    strict_live = request.config.getoption("--strict-live")
    if not is_server_online:
        if strict_live:
            pytest.fail(f"Backend REST API is not reachable at {api_client.base_url}")
        else:
            pytest.skip(f"Live backend server is offline at {api_client.base_url} - skipping live integration test")


@pytest.fixture
def baseline_disaster_payload():
    """Valid standard disaster simulation request payload."""
    return {
        "flood_zones": [
            {
                "id": "FZ-ADYAR-01",
                "type": "circle",
                "coordinates": [[13.0158, 80.2224]],
                "radius_meters": 1500.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 80.0,
            "flood_depth_meters": 1.2,
            "spread_rate_meters_hr": 150.0,
            "duration_hours": 6
        }
    }


@pytest.fixture
def velachery_scenario_payload():
    """Velachery residential inundation scenario payload."""
    return {
        "flood_zones": [
            {
                "id": "FZ-VELACHERY-01",
                "type": "circle",
                "coordinates": [[12.9790, 80.2210]],
                "radius_meters": 2000.0
            }
        ],
        "parameters": {
            "rainfall_intensity_mm_hr": 120.0,
            "flood_depth_meters": 1.8,
            "spread_rate_meters_hr": 250.0,
            "duration_hours": 8
        }
    }
