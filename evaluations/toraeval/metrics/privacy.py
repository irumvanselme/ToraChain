"""§5.4.5 Unlinkability (privacy — NFR-01, NFR-02).

A structural inspection rather than a statistical test: it downloads every
block on the election's public chain and asserts that the only vote-related
fields exposed are the pseudonymous voter number, the SHA-256 commitment,
timestamps, and hashes — never a voter identity (email) or a candidate choice.
"""

from __future__ import annotations

import json
from pathlib import Path

from .. import chain, crypto, logutil
from ..charts import table_figure
from ..scenario import Harness

ALLOWED_BLOCK_KEYS = {"index", "electionId", "data", "timestamp", "prevHash",
                      "hash"}
ALLOWED_DATA_KEYS = {"voter", "commitment"}


def run(h: Harness, out_dir: Path) -> dict:
    logutil.step("§5.4.5 Unlinkability (privacy)")
    master = chain.master()
    if not master.up():
        logutil.warn("chain master unreachable — skipping privacy inspection.")
        return {"metric": "unlinkability", "skipped": True,
                "reason": "chain master unreachable"}

    # Guarantee at least one vote block to inspect.
    blocks = master.chain(h.election_id)
    if len([b for b in blocks if int(b["index"]) > 0]) == 0:
        v = h.provision_voters(1)
        if v:
            sealed = crypto.seal_ballot(h.candidate_ids[0])
            h.api.cast(v[0].identity, h.election_id, v[0].voter_id,
                       h.candidate_ids[0], sealed.ciphertext, sealed.commitment)
        blocks = master.chain(h.election_id)

    blob = json.dumps(blocks)
    checks: list[tuple[str, bool, str]] = []

    # 1. No block exposes fields beyond the allowed set.
    extra_block = {k for b in blocks for k in b if k not in ALLOWED_BLOCK_KEYS}
    extra_data = {k for b in blocks for k in b.get("data", {})
                  if k not in ALLOWED_DATA_KEYS}
    checks.append(("Block exposes only index/electionId/data/ts/hashes",
                   not extra_block,
                   "no extra keys" if not extra_block else str(extra_block)))
    checks.append(("Block data limited to voter + commitment", not extra_data,
                   "ok" if not extra_data else str(extra_data)))

    # 2. No candidate id appears anywhere on the chain.
    leaked_candidates = [c for c in h.candidate_ids if c in blob]
    checks.append(("No candidate id present on the chain",
                   not leaked_candidates,
                   "none found" if not leaked_candidates
                   else f"{len(leaked_candidates)} leaked"))

    # 3. No voter email / identity appears anywhere on the chain.
    email_leak = "@" in blob or "tora-eval.local" in blob
    checks.append(("No voter identity (email) on the chain", not email_leak,
                   "none found" if not email_leak else "identity present"))

    # 4. Voter field is a pseudonymous decimal number, not the voting number.
    voter_numeric = all(str(b["data"]["voter"]).isdigit()
                        for b in blocks if int(b["index"]) > 0)
    checks.append(("On-chain voter field is a pseudonymous number",
                   voter_numeric, "confirmed" if voter_numeric else "unexpected"))

    all_pass = all(ok for _, ok, _ in checks)
    for name, ok, detail in checks:
        (logutil.ok if ok else logutil.fail)(f"{name} — {detail}")

    chart = out_dir / "fig-5-6-unlinkability.png"
    table_figure(
        chart, headers=["Structural check", "Result", "Detail"],
        rows=[[n, "PASS" if ok else "FAIL", d] for n, ok, d in checks],
        statuses=[ok for _, ok, _ in checks], col_widths=[0.6, 0.13, 0.27])
    logutil.ok(f"chart -> {chart.name}")

    return {
        "metric": "unlinkability",
        "blocks_inspected": len(blocks),
        "all_checks_pass": all_pass,
        "checks": [{"check": n, "pass": ok, "detail": d}
                   for n, ok, d in checks],
        "chart": str(chart),
    }
