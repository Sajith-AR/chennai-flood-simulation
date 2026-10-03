#!/usr/bin/env python3
"""
Automated E2E Test Suite Runner for Chennai Flood Simulation Platform.
Supports standalone execution, tier filtering, live server probing, and syntax/contract dry-runs.

Usage:
  python e2e/test_runner.py                    # Run full E2E test suite
  python e2e/test_runner.py --tier 1           # Run Tier 1 Feature Coverage only
  python e2e/test_runner.py --tier 2           # Run Tier 2 Boundary Cases only
  python e2e/test_runner.py --tier 3           # Run Tier 3 Cross-Feature Interactions
  python e2e/test_runner.py --tier 4           # Run Tier 4 Real-World Scenarios
  python e2e/test_runner.py --base-url <url>   # Test against custom API URL
  python e2e/test_runner.py --check-server     # Probe server health only
"""

import sys
import os
import argparse
import time
from pathlib import Path

# Add project root to sys.path so e2e is importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
from e2e.common.client import SimulationApiClient
from e2e.common.geometry import haversine_km, is_coord_in_gcc, point_in_polygon
from e2e.common.validators import (
    validate_geojson_feature_collection,
    validate_inventory_ledger_invariants,
    validate_shelter_capacity_invariants
)

# Terminal styling helpers
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def print_header(title: str):
    print(f"\n{BOLD}{CYAN}{'=' * 75}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'=' * 75}{RESET}\n")


def verify_test_suite_integrity():
    """Verify that geometry algorithms, validators, and test modules import and execute properly."""
    print(f"{BOLD}Verifying Test Harness Mathematical & Algorithmic Integrity...{RESET}")

    # 1. Haversine distance sanity
    dist = haversine_km(13.0827, 80.2707, 13.0158, 80.2224)
    assert 8.0 < dist < 12.0, f"Unexpected Haversine distance: {dist} km"
    print(f"  [{GREEN}PASS{RESET}] Haversine distance calculator verified (~{dist:.2f} km)")

    # 2. GCC boundary checks
    assert is_coord_in_gcc(13.0827, 80.2707) is True
    assert is_coord_in_gcc(19.0760, 72.8777) is False
    print(f"  [{GREEN}PASS{RESET}] GCC boundary containment engine verified")

    # 3. Ray-casting point-in-polygon
    square = [[13.0, 80.2], [13.1, 80.2], [13.1, 80.3], [13.0, 80.3]]
    assert point_in_polygon(13.05, 80.25, square) is True
    assert point_in_polygon(13.50, 80.50, square) is False
    print(f"  [{GREEN}PASS{RESET}] Ray-casting point-in-polygon engine verified")

    # 4. Inventory invariants
    test_ledger = {
        "warehouses": [
            {
                "warehouse_id": "WH-TEST",
                "total_stock": {"drinking_water_liters": 1000},
                "available_stock": {"drinking_water_liters": 700},
                "allocated_stock": {"drinking_water_liters": 300}
            }
        ]
    }
    validate_inventory_ledger_invariants(test_ledger)
    print(f"  [{GREEN}PASS{RESET}] Ledger physical conservation validator verified")


def run_e2e_tests(tier: str = "all", base_url: str = "http://localhost:8000", verbose: bool = True, strict: bool = False):
    print_header("Chennai Natural Disaster (Flood) Simulation - E2E Test Suite")

    client = SimulationApiClient(base_url=base_url)
    server_online = client.is_online()

    status_color = GREEN if server_online else YELLOW
    status_label = "ONLINE (Ready for Live Integration)" if server_online else "OFFLINE (Tests will evaluate contract schemas / skip live calls)"
    print(f"Target REST API URL : {BOLD}{base_url}{RESET}")
    print(f"Backend Server State: {status_color}{status_label}{RESET}")
    print(f"Execution Target    : Tier {tier.upper()}\n")

    # Verify self-contained geometry and validators
    verify_test_suite_integrity()

    # Map tier to directory
    tier_map = {
        "1": "e2e/tier1_features",
        "2": "e2e/tier2_boundaries",
        "3": "e2e/tier3_interactions",
        "4": "e2e/tier4_scenarios",
        "all": "e2e"
    }

    target_path = tier_map.get(str(tier).lower(), "e2e")
    full_target = str(PROJECT_ROOT / target_path)

    pytest_args = [
        full_target,
        f"--api-url={base_url}",
        "-rA",
    ]

    if verbose:
        pytest_args.append("-v")
    if strict:
        pytest_args.append("--strict-live")

    print(f"\n{BOLD}Launching Pytest Runner on {target_path}...{RESET}\n")
    start_time = time.time()
    exit_code = pytest.main(pytest_args)
    elapsed = time.time() - start_time

    print_header("E2E Test Execution Summary")
    print(f"Total Execution Time: {elapsed:.2f} seconds")
    if exit_code == 0:
        print(f"Result: {GREEN}{BOLD}ALL TESTS PASSED SUCCESSFULLY!{RESET}\n")
    else:
        print(f"Result: {YELLOW if not server_online else RED}{BOLD}Completed with status code {exit_code}{RESET}\n")

    return exit_code


def main():
    parser = argparse.ArgumentParser(description="Chennai Flood Sim E2E Test Runner")
    parser.add_argument("--tier", default="all", choices=["1", "2", "3", "4", "all"], help="Filter by test tier")
    parser.add_argument("--base-url", default=os.environ.get("SIM_API_URL", "http://localhost:8000"), help="Backend REST API base URL")
    parser.add_argument("--check-server", action="store_true", help="Probe backend availability only")
    parser.add_argument("--strict", action="store_true", help="Fail tests immediately if backend is offline")
    args = parser.parse_args()

    if args.check_server:
        client = SimulationApiClient(base_url=args.base_url)
        online = client.is_online()
        print(f"Server at {args.base_url}: {'ONLINE' if online else 'OFFLINE'}")
        sys.exit(0 if online else 1)

    code = run_e2e_tests(tier=args.tier, base_url=args.base_url, strict=args.strict)
    sys.exit(code)


if __name__ == "__main__":
    main()
