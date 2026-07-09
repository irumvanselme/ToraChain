"""Thin client for the Elections REST API (``apps/backend``).

Only the endpoints the evaluation needs are wrapped. Every call carries a
Bearer JWT for the appropriate identity domain.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import requests

from .auth import Identity
from .config import SETTINGS


class ApiError(RuntimeError):
    def __init__(self, message: str, status: int | None = None, body: str = ""):
        super().__init__(message)
        self.status = status
        self.body = body


@dataclass
class CastOutcome:
    accepted: bool
    status: int
    elapsed_ms: float
    voting_number: str | None = None
    cast_at: str | None = None
    error_code: str | None = None
    body: str = ""


class ElectionsApi:
    def __init__(self, base_url: str = SETTINGS.api_url):
        self.base = base_url.rstrip("/")
        self.session = requests.Session()

    # -- elections ----------------------------------------------------------

    def create_election(self, admin: Identity, title: str,
                        description: str | None = None) -> str:
        r = self.session.post(f"{self.base}/elections",
                              json={"title": title, "description": description,
                                    "status": "draft"},
                              headers=admin.bearer(), timeout=30)
        _raise_for(r, "create election")
        return r.json()["electionId"]

    def set_status(self, admin: Identity, election_id: str, status: str) -> None:
        r = self.session.patch(f"{self.base}/elections/{election_id}",
                               json={"status": status},
                               headers=admin.bearer(), timeout=30)
        _raise_for(r, f"set status={status}")

    def list_elections(self, ident: Identity, q: str | None = None,
                       limit: int = 100) -> list[dict]:
        params = {"limit": limit}
        if q:
            params["q"] = q
        r = self.session.get(f"{self.base}/elections", params=params,
                             headers=ident.bearer(), timeout=30)
        _raise_for(r, "list elections")
        return r.json().get("data", [])

    # -- candidates ---------------------------------------------------------

    def add_candidate(self, admin: Identity, election_id: str, full_name: str,
                     manifesto: str | None = None) -> str:
        r = self.session.post(f"{self.base}/elections/{election_id}/candidates",
                              json={"fullName": full_name, "manifesto": manifesto},
                              headers=admin.bearer(), timeout=30)
        _raise_for(r, "add candidate")
        return r.json()["candidateId"]

    # -- voters / eligibility ----------------------------------------------

    def grant_eligibility(self, admin: Identity, election_id: str,
                         email: str) -> dict:
        r = self.session.post(f"{self.base}/elections/{election_id}/voters",
                              json={"email": email},
                              headers=admin.bearer(), timeout=30)
        _raise_for(r, "grant eligibility")
        return r.json()

    # -- ballots ------------------------------------------------------------

    def get_ballot(self, ident: Identity, election_id: str,
                  voter_id: str) -> dict:
        r = self.session.get(
            f"{self.base}/elections/{election_id}/voter/{voter_id}/vote",
            headers=ident.bearer(), timeout=30)
        _raise_for(r, "get ballot")
        return r.json()

    def cast(self, voter: Identity, election_id: str, voter_id: str,
             candidate_id: str, ciphertext: str | None = None,
             commitment: str | None = None) -> CastOutcome:
        body: dict = {"candidateId": candidate_id}
        if ciphertext is not None:
            body["ciphertext"] = ciphertext
        if commitment is not None:
            body["commitment"] = commitment
        start = time.perf_counter()
        r = self.session.post(
            f"{self.base}/elections/{election_id}/voter/{voter_id}/vote",
            json=body, headers=voter.bearer(), timeout=60)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        error_code = None
        if not r.ok:
            try:
                error_code = (r.json() or {}).get("code")
            except ValueError:
                pass
        return CastOutcome(
            accepted=r.status_code == 201,
            status=r.status_code,
            elapsed_ms=elapsed_ms,
            voting_number=r.json().get("votingNumber") if r.ok else None,
            cast_at=r.json().get("castAt") if r.ok else None,
            error_code=error_code,
            body=r.text[:300],
        )


def _raise_for(r: requests.Response, what: str) -> None:
    if not r.ok:
        raise ApiError(f"{what} failed: {r.status_code} {r.text[:300]}",
                       status=r.status_code, body=r.text)
