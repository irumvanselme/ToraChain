"""§5.4.6 Reliability and fault isolation (NFR-11).

The chain integration is fire-and-forget, so a chain outage must not stop
voting. This test casts a batch of ballots and reports how many were *accepted*
(voting availability) versus how many were *anchored on-chain* (audit-trail
availability). With the chain up both are ~100%; with the chain master stopped,
acceptance stays at 100% while anchoring drops — graceful degradation of the
audit trail rather than an election outage.

To exercise the fault explicitly, stop the ``chain-master`` pane in ``make dev``
and re-run with ``--only resilience``; the harness detects the down node and
records the degraded scenario.

Note: multi-week production *availability* (the report's earlier line chart) is
not scriptable here — it must come from Cloud Run uptime/monitoring data.
"""

from __future__ import annotations

import time
from pathlib import Path

from .. import chain, crypto, logutil
from ..charts import CAT, grouped_bar
from ..scenario import Harness


def run(h: Harness, out_dir: Path, batch: int = 20) -> dict:
    logutil.step("§5.4.6 Reliability and fault isolation")
    master = chain.master()
    chain_up = master.up()
    scenario = "Chain reachable" if chain_up else "Chain master stopped"
    logutil.info(f"observed chain state: {scenario}")

    voters = h.provision_voters(batch)
    accepted = 0
    commitments: list[str] = []
    for v in voters:
        sealed = crypto.seal_ballot(h.candidate_ids[0])
        out = h.api.cast(v.identity, h.election_id, v.voter_id,
                         h.candidate_ids[0], sealed.ciphertext, sealed.commitment)
        if out.accepted:
            accepted += 1
            commitments.append(sealed.commitment)

    anchored = 0
    if chain_up and commitments:
        time.sleep(3.0)  # allow fire-and-forget anchoring to catch up
        on_chain = {b["data"]["commitment"] for b in master.chain(h.election_id)}
        anchored = sum(1 for c in commitments if c in on_chain)

    total = len(voters)
    accept_pct = 100.0 * accepted / total if total else 0.0
    anchor_pct = 100.0 * anchored / total if total else 0.0
    logutil.ok(f"votes accepted: {accepted}/{total} ({accept_pct:.0f}%)")
    logutil.ok(f"votes anchored on-chain: {anchored}/{total} ({anchor_pct:.0f}%)")

    chart = out_dir / "fig-5-7-fault-isolation.png"
    grouped_bar(
        chart, categories=["Votes accepted", "Votes anchored on-chain"],
        series={"% of ballots": [accept_pct, anchor_pct]},
        ylabel="% of ballots", value_fmt="{:.0f}%", colors=[CAT[0]], ymax=118)
    logutil.ok(f"chart -> {chart.name}")

    return {
        "metric": "fault_isolation",
        "chain_up": chain_up,
        "scenario": scenario,
        "batch": total,
        "accepted": accepted,
        "anchored": anchored,
        "acceptance_pct": accept_pct,
        "anchor_pct": anchor_pct,
        "chart": str(chart),
    }
