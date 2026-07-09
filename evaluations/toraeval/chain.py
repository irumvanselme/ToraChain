"""Client for the blockchain node network (``apps/torachain-cli``).

The master and worker both expose a CORS-open, read-only ``GET /api/chain`` and
a ``GET /api/status``. The harness reads these to verify block hashes and
measure replication lag — it never publishes (only the master does that, via
the backend's fire-and-forget submit).
"""

from __future__ import annotations

import requests

from .config import SETTINGS


class ChainNode:
    def __init__(self, base_url: str, label: str = "node"):
        self.base = base_url.rstrip("/")
        self.label = label

    def up(self, timeout: float = 2.0) -> bool:
        try:
            requests.get(f"{self.base}/api/status", timeout=timeout)
            return True
        except requests.RequestException:
            return False

    def status(self, timeout: float = 5.0) -> dict | None:
        try:
            r = requests.get(f"{self.base}/api/status", timeout=timeout)
            return r.json() if r.ok else None
        except requests.RequestException:
            return None

    def chain(self, election_id: str | None = None,
              timeout: float = 10.0) -> list[dict]:
        params = {"electionId": election_id} if election_id else {}
        r = requests.get(f"{self.base}/api/chain", params=params, timeout=timeout)
        r.raise_for_status()
        return r.json().get("blocks", [])

    def has_commitment(self, election_id: str, commitment: str) -> bool:
        for block in self.chain(election_id):
            if block.get("data", {}).get("commitment") == commitment:
                return True
        return False


def master() -> ChainNode:
    return ChainNode(SETTINGS.chain_master_url, "master")


def worker() -> ChainNode:
    return ChainNode(SETTINGS.chain_worker_url, "worker")
