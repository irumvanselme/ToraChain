"""§5.4.1 Tamper detection (integrity — NFR-03, NFR-04).

Casts a few real, sealed ballots, waits for their blocks to replicate to the
chain master, then acts as a receiving worker would: it recomputes each block's
hash from the block's own fields and confirms it matches (integrity), then
mutates each field in turn and confirms the recomputed hash no longer matches
(detection). It also corrupts a stored ballot and confirms the SHA-256
commitment no longer binds it. Every mutation must be detected.
"""

from __future__ import annotations

import time
from pathlib import Path

from .. import chain, crypto, logutil
from ..charts import GOOD, bar
from ..scenario import Harness

MUTATIONS = ["block data", "voter", "timestamp", "index", "previous-hash",
             "stored ballot"]


def _wait_for_blocks(node: chain.ChainNode, election_id: str, minimum: int,
                     timeout: float = 25.0) -> list[dict]:
    deadline = time.time() + timeout
    blocks: list[dict] = []
    while time.time() < deadline:
        try:
            blocks = node.chain(election_id)
        except Exception:
            blocks = []
        if len(blocks) >= minimum:
            return blocks
        time.sleep(1.0)
    return blocks


def run(h: Harness, out_dir: Path, samples: int = 8) -> dict:
    logutil.step("§5.4.1 Tamper detection")
    master = chain.master()
    if not master.up():
        logutil.warn(f"chain master not reachable at {master.base} — "
                     "skipping tamper detection (start `make dev`).")
        return {"metric": "tamper_detection", "skipped": True,
                "reason": "chain master unreachable"}

    voters = h.provision_voters(samples)
    receipts = []
    for v in voters:
        sealed = crypto.seal_ballot(h.candidate_ids[0])
        out = h.api.cast(v.identity, h.election_id, v.voter_id,
                         h.candidate_ids[0], sealed.ciphertext, sealed.commitment)
        if out.accepted:
            receipts.append(sealed)
    logutil.info(f"cast {len(receipts)} sealed ballots; waiting for blocks…")

    # +1 for the genesis block.
    blocks = _wait_for_blocks(master, h.election_id, len(receipts) + 1)
    real = [b for b in blocks if int(b["index"]) > 0]
    if not real:
        logutil.warn("no vote blocks appeared on the chain — skipping.")
        return {"metric": "tamper_detection", "skipped": True,
                "reason": "no blocks on chain"}

    # Integrity: every untouched block must re-hash to its stored hash.
    intact = sum(1 for b in real
                 if crypto.recompute_wire_block_hash(b) == b["hash"])
    logutil.ok(f"integrity: {intact}/{len(real)} blocks re-hash correctly")

    results: dict[str, tuple[int, int]] = {}  # mutation -> (detected, attempts)

    def mutate_and_check(field: str) -> tuple[int, int]:
        detected = attempts = 0
        for b in real:
            m = {**b, "data": dict(b["data"])}
            if field == "block data":
                m["data"]["commitment"] = m["data"]["commitment"] + "00"
            elif field == "voter":
                m["data"]["voter"] = str(int(m["data"]["voter"]) + 1)
            elif field == "timestamp":
                m["timestamp"] = int(m["timestamp"]) + 1
            elif field == "index":
                m["index"] = int(m["index"]) + 1
            elif field == "previous-hash":
                m["prevHash"] = "deadbeef"
            attempts += 1
            if crypto.recompute_wire_block_hash(m) != b["hash"]:
                detected += 1
        return detected, attempts

    for field in MUTATIONS[:-1]:
        results[field] = mutate_and_check(field)

    # Stored-ballot tamper: flip a byte of the sealed ballot and confirm the
    # commitment (SHA-256 of the ciphertext) no longer matches — the exact
    # check a voter's receipt verification performs.
    sb_detected = sb_attempts = 0
    for sealed in receipts:
        tampered_ct = sealed.ciphertext[:-2] + ("AA" if sealed.ciphertext[-2:] != "AA" else "BB")
        sb_attempts += 1
        if crypto.sha256_hex(tampered_ct) != sealed.commitment:
            sb_detected += 1
    results["stored ballot"] = (sb_detected, sb_attempts)

    rates = {k: (100.0 * d / a if a else 0.0) for k, (d, a) in results.items()}
    for k, (d, a) in results.items():
        logutil.ok(f"{k}: {d}/{a} detected ({rates[k]:.0f}%)")

    chart = out_dir / "fig-5-2-tamper-detection.png"
    bar(chart, categories=[m for m in MUTATIONS],
        values=[rates[m] for m in MUTATIONS], ylabel="% detected",
        xlabel="Mutation type", value_fmt="{:.0f}%",
        colors=[GOOD] * len(MUTATIONS), ymax=118,
        annotations=[f"n={results[m][1]}" for m in MUTATIONS])
    logutil.ok(f"chart -> {chart.name}")

    return {
        "metric": "tamper_detection",
        "blocks_checked": len(real),
        "integrity_ok": intact == len(real),
        "detection": {k: {"detected": d, "attempts": a, "rate_pct": rates[k]}
                      for k, (d, a) in results.items()},
        "chart": str(chart),
    }
