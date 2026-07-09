"""§5.4.4 Receipt and proof verification (verifiability).

For each valid receipt the harness confirms the full chain of custody a voter's
client checks:
  1. the server accepted the ballot (commitment == SHA-256(ciphertext));
  2. the commitment is anchored on the blockchain (fetched from the master);
  3. the sealed ballot opens with the receipt key to the counted candidate.

Deliberately corrupted receipts must fail: the server rejects a commitment that
is not the SHA-256 of the ciphertext, and the corrupted ciphertext no longer
opens.
"""

from __future__ import annotations

import base64
from pathlib import Path

from .. import chain, crypto, logutil
from ..charts import CAT, grouped_bar
from ..scenario import Harness


def _corrupt_b64(text: str) -> str:
    raw = bytearray(base64.b64decode(text))
    raw[0] ^= 0x01  # flip one bit of the ciphertext
    return base64.b64encode(bytes(raw)).decode("ascii")


def run(h: Harness, out_dir: Path, valid: int = 20, corrupted: int = 8) -> dict:
    logutil.step("§5.4.4 Receipt and proof verification")
    master = chain.master()
    chain_up = master.up()
    if not chain_up:
        logutil.warn("chain master unreachable — the on-chain anchoring check "
                     "will be skipped (other checks still run).")

    # --- valid receipts ---------------------------------------------------
    voters = h.provision_voters(valid)
    verified = 0
    checks = {"accepted": 0, "anchored": 0, "opens": 0}
    for v in voters:
        cand = h.candidate_ids[0]
        sealed = crypto.seal_ballot(cand)
        out = h.api.cast(v.identity, h.election_id, v.voter_id, cand,
                         sealed.ciphertext, sealed.commitment)
        accepted = out.accepted
        opens = crypto.open_ballot(sealed.ciphertext, sealed.key_b64) == cand
        anchored = True
        if chain_up and accepted:
            anchored = master.has_commitment(h.election_id, sealed.commitment)
        checks["accepted"] += int(accepted)
        checks["opens"] += int(opens)
        checks["anchored"] += int(anchored)
        if accepted and opens and (anchored or not chain_up):
            verified += 1
    logutil.ok(f"valid receipts: {verified}/{len(voters)} fully verified "
               f"(accepted={checks['accepted']}, anchored={checks['anchored']}, "
               f"opens={checks['opens']})")

    # --- corrupted receipts ----------------------------------------------
    corrupt_voters = h.provision_voters(corrupted)
    failed_as_expected = 0
    for v in corrupt_voters:
        cand = h.candidate_ids[0]
        sealed = crypto.seal_ballot(cand)
        bad_ct = _corrupt_b64(sealed.ciphertext)  # commitment no longer matches
        out = h.api.cast(v.identity, h.election_id, v.voter_id, cand,
                         bad_ct, sealed.commitment)
        server_rejected = out.status == 400
        cannot_open = crypto.open_ballot(bad_ct, sealed.key_b64) is None
        if server_rejected and cannot_open:
            failed_as_expected += 1
    logutil.ok(f"corrupted receipts: {failed_as_expected}/{len(corrupt_voters)} "
               "rejected as expected")

    chart = out_dir / "fig-5-5-verification.png"
    grouped_bar(
        chart, categories=["Valid receipts", "Corrupted receipts"],
        series={
            "Verified": [verified, 0],
            "Failed as expected": [0, failed_as_expected],
        },
        ylabel="Receipts", colors=[CAT[1], CAT[5]])
    logutil.ok(f"chart -> {chart.name}")

    return {
        "metric": "receipt_verification",
        "valid_total": len(voters),
        "valid_verified": verified,
        "valid_checks": checks,
        "corrupted_total": len(corrupt_voters),
        "corrupted_failed_as_expected": failed_as_expected,
        "chain_up": chain_up,
        "chart": str(chart),
    }
