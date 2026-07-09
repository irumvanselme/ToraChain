"""§5.4.3 Throughput (scalability — NFR-10).

Casts votes concurrently at increasing concurrency levels and records the
sustained accepted-votes-per-second. Each voter is distinct (one ballot per
eligibility), so the load is real, not repeated writes to the same row.
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from .. import crypto, logutil
from ..charts import CAT, bar
from ..scenario import Harness

DEFAULT_LEVELS = [1, 5, 10, 20, 40]


def run(h: Harness, out_dir: Path, levels: list[int] | None = None) -> dict:
    logutil.step("§5.4.3 Throughput under concurrent load")
    levels = levels or DEFAULT_LEVELS

    per_level: dict[int, float] = {}
    accepted_counts: dict[int, int] = {}
    for c in levels:
        voters = h.provision_voters(c)
        if not voters:
            continue

        def _cast(v):
            sealed = crypto.seal_ballot(h.candidate_ids[0])
            return h.api.cast(v.identity, h.election_id, v.voter_id,
                              h.candidate_ids[0], sealed.ciphertext,
                              sealed.commitment)

        start = time.perf_counter()
        with ThreadPoolExecutor(max_workers=c) as pool:
            outcomes = list(pool.map(_cast, voters))
        elapsed = time.perf_counter() - start
        accepted = sum(1 for o in outcomes if o.accepted)
        rate = accepted / elapsed if elapsed > 0 else 0.0
        per_level[c] = rate
        accepted_counts[c] = accepted
        logutil.ok(f"concurrency {c:>3}: {accepted}/{len(voters)} accepted in "
                   f"{elapsed:.2f}s -> {rate:.1f} votes/s")

    if not per_level:
        return {"metric": "throughput", "skipped": True,
                "reason": "no voters provisioned"}

    ordered = sorted(per_level)
    chart = out_dir / "fig-5-4-throughput.png"
    bar(chart, categories=[str(c) for c in ordered],
        values=[per_level[c] for c in ordered], ylabel="Accepted votes / second",
        xlabel="Concurrent voters", value_fmt="{:.1f}",
        colors=[CAT[0]] * len(ordered))
    logutil.ok(f"chart -> {chart.name}")

    return {
        "metric": "throughput",
        "levels": ordered,
        "votes_per_second": {c: per_level[c] for c in ordered},
        "accepted": {c: accepted_counts[c] for c in ordered},
        "peak_votes_per_second": max(per_level.values()),
        "chart": str(chart),
    }
