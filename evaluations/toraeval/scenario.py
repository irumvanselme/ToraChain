"""The shared test fixture: reset, seed users, stand up an election.

A single :class:`Harness` owns an admin identity, one freshly-created election
with candidates, and a lazy voter factory. Each metric asks the harness for as
many freshly-provisioned, eligible voters as it needs; because every voter is
distinct and votes at most once, metrics never contend for the same ballot.
"""

from __future__ import annotations

import itertools
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timezone

from . import auth, logutil
from .api import ElectionsApi
from .auth import Identity
from .config import EVAL_EMAIL_DOMAIN, EVAL_PREFIX, SETTINGS
from .httpc import new_session

CANDIDATE_NAMES = [
    ("Amara Okonkwo", "Transparency and open budgets."),
    ("Thabo Mokoena", "Student welfare first."),
    ("Zainab Hassan", "Invest in campus infrastructure."),
    ("Kwame Mensah", "Fair and inclusive representation."),
]


@dataclass
class Voter:
    email: str
    voter_id: str  # backend eligibility voterId (path parameter for casting)
    identity: Identity  # bears the voter JWT


@dataclass
class Harness:
    admin: Identity
    api: ElectionsApi = field(default_factory=ElectionsApi)
    election_id: str = ""
    candidate_ids: list[str] = field(default_factory=list)
    _counter: itertools.count = field(default_factory=lambda: itertools.count(1))
    _lock: threading.Lock = field(default_factory=threading.Lock)

    # -- setup --------------------------------------------------------------

    @classmethod
    def bootstrap(cls, num_candidates: int = 3) -> "Harness":
        logutil.step("Provisioning admin + election")
        admin = auth.ensure_admin()
        logutil.ok(f"admin ready: {admin.email}")
        h = cls(admin=admin)

        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        title = f"{EVAL_PREFIX} Evaluation Election {stamp}"
        h.election_id = h.api.create_election(
            admin, title, "Automated evaluation election (report §5.4).")
        logutil.ok(f"created election {h.election_id}")

        for name, manifesto in CANDIDATE_NAMES[:num_candidates]:
            cid = h.api.add_candidate(admin, h.election_id, name, manifesto)
            h.candidate_ids.append(cid)
        logutil.ok(f"added {len(h.candidate_ids)} candidates")

        h.api.set_status(admin, h.election_id, "active")
        logutil.ok("election is active (open for voting)")
        return h

    def close_election(self) -> None:
        self.api.set_status(self.admin, self.election_id, "ended")

    # -- voter factory ------------------------------------------------------

    def _next_email(self) -> str:
        with self._lock:
            n = next(self._counter)
        return f"eval-voter-{n:05d}@{EVAL_EMAIL_DOMAIN}"

    def _make_voter(self, _idx: int) -> Voter | None:
        email = self._next_email()
        try:
            session = new_session()
            auth.sign_up(session, "voters", email, "Eval Voter", SETTINGS.password)
            elig = self.api.grant_eligibility(self.admin, self.election_id, email)
            identity = auth.mint_token("voters", email, SETTINGS.password)
            return Voter(email=email, voter_id=elig["voterId"], identity=identity)
        except Exception as exc:  # pragma: no cover - reported, not fatal
            logutil.warn(f"failed to provision {email}: {exc}")
            return None

    def provision_voters(self, n: int, workers: int = 8) -> list[Voter]:
        """Create, enrol, and authenticate ``n`` fresh eligible voters."""
        logutil.info(f"provisioning {n} voters…")
        voters: list[Voter] = []
        with ThreadPoolExecutor(max_workers=workers) as pool:
            for v in pool.map(self._make_voter, range(n)):
                if v is not None:
                    voters.append(v)
        logutil.ok(f"provisioned {len(voters)}/{n} voters")
        return voters
