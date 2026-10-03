"""
HTTP REST API Client for Chennai Natural Disaster Simulation E2E Testing.
Communicates strictly via HTTP requests without importing any backend internals.
"""

import time
import requests
from typing import Dict, Any, Optional
from .config import API_BASE_URL


class SimulationApiClient:
    def __init__(self, base_url: Optional[str] = None, timeout: float = 15.0):
        self.base_url = (base_url or API_BASE_URL).rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "ChennaiFloodSim-E2E-Tester/1.0"
        })
        self._cached_online_status: Optional[bool] = None
        self._last_online_check: float = 0.0

    def is_online(self, force_refresh: bool = False) -> bool:
        """Probe the backend /api/health endpoint with a 3.0s cache to avoid repetitive network timeouts."""
        now = time.time()
        if not force_refresh and self._cached_online_status is not None and (now - self._last_online_check < 5.0):
            return self._cached_online_status

        try:
            r = self.session.get(f"{self.base_url}/api/health", timeout=1.0)
            self._cached_online_status = (r.status_code == 200)
        except Exception:
            self._cached_online_status = False

        self._last_online_check = now
        return self._cached_online_status

    def health(self) -> requests.Response:
        """Call GET /api/health"""
        return self.session.get(f"{self.base_url}/api/health", timeout=self.timeout)

    def get_map_init(self) -> requests.Response:
        """Call GET /api/map/init"""
        return self.session.get(f"{self.base_url}/api/map/init", timeout=self.timeout)

    def run_simulation(self, payload: Dict[str, Any]) -> requests.Response:
        """Call POST /api/simulation/run"""
        return self.session.post(
            f"{self.base_url}/api/simulation/run",
            json=payload,
            timeout=self.timeout
        )

    def allocate_resources(self, payload: Dict[str, Any]) -> requests.Response:
        """Call POST /api/resources/allocate"""
        return self.session.post(
            f"{self.base_url}/api/resources/allocate",
            json=payload,
            timeout=self.timeout
        )
