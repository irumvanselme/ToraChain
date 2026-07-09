"""§5.4.2 Vote-casting latency (performance — NFR-09).

Measures two things:
  (i)  the voter-facing ``cast`` API response time (eligibility check +
       commitment re-derivation + database write), and
  (ii) the anchoring lag — the delay from the cast returning until the block is
       visible on an independent node (a worker if one is up, else the master).

Because anchoring is fire-and-forget, (i) is independent of chain load.
"""

from __future__ import annotations

import time
from pathlib import Path

from .. import chain, crypto, logutil
from ..charts import CAT, lines
from ..scenario import Harness

PERCENTILES = [50, 75, 90, 95, 99]


def _pct(sorted_vals: list[float], p: float) -> float:
    if not sorted_vals:
        return 0.0
    k = (len(sorted_vals) - 1) * (p / 100.0)
    lo, hi = int(k), min(int(k) + 1, len(sorted_vals) - 1)
    if lo == hi:
        return sorted_vals[lo]
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (k - lo)


def run(h: Harness, out_dir: Path, samples: int = 30) -> dict:
    logutil.step("§5.4.2 Vote-casting latency")
    voters = h.provision_voters(samples)

    node = chain.worker()
    measure_anchor = node.up()
    if not measure_anchor:
        node = chain.master()
        measure_anchor = node.up()
    anchor_source = node.label if measure_anchor else None

    cast_ms: list[float] = []
    anchor_s: list[float] = []
    for v in voters:
        sealed = crypto.seal_ballot(h.candidate_ids[0])
        out = h.api.cast(v.identity, h.election_id, v.voter_id,
                         h.candidate_ids[0], sealed.ciphertext, sealed.commitment)
        if not out.accepted:
            continue
        cast_ms.append(out.elapsed_ms)
        if measure_anchor:
            t0 = time.perf_counter()
            deadline = t0 + 15.0
            while time.perf_counter() < deadline:
                try:
                    if node.has_commitment(h.election_id, sealed.commitment):
                        anchor_s.append(time.perf_counter() - t0)
                        break
                except Exception:
                    pass
                time.sleep(0.25)

    cast_ms.sort()
    anchor_s.sort()
    cast_p = {p: _pct(cast_ms, p) for p in PERCENTILES}
    avg = sum(cast_ms) / len(cast_ms) if cast_ms else 0.0
    logutil.ok(f"cast latency: avg {avg:.0f} ms, p95 {cast_p[95]:.0f} ms "
               f"(n={len(cast_ms)})")

    series = {"Cast API response (ms)": [cast_p[p] for p in PERCENTILES]}
    result: dict = {
        "metric": "vote_casting_latency",
        "samples": len(cast_ms),
        "avg_ms": avg,
        "cast_percentiles_ms": cast_p,
    }
    if anchor_s:
        anchor_ms = [s * 1000 for s in anchor_s]
        anchor_ms.sort()
        series[f"Anchor lag on {anchor_source} (ms)"] = [
            _pct(anchor_ms, p) for p in PERCENTILES]
        avg_anchor = sum(anchor_s) / len(anchor_s)
        result["avg_anchor_lag_s"] = avg_anchor
        result["anchor_source"] = anchor_source
        logutil.ok(f"anchor lag: avg {avg_anchor:.2f} s on {anchor_source} "
                   f"(n={len(anchor_s)})")
    else:
        logutil.warn("no chain node reachable — anchor lag not measured.")

    chart = out_dir / "fig-5-3-latency.png"
    lines(chart, x=[f"p{p}" for p in PERCENTILES], series=series,
          xlabel="Percentile", ylabel="Latency (ms)", colors=[CAT[0], CAT[2]])
    logutil.ok(f"chart -> {chart.name}")
    result["chart"] = str(chart)
    return result
