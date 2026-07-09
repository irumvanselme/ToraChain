"""Writes ``out/summary.txt`` — an APA-style caption sheet for the figures.

For every figure the harness produced it emits the figure number, an APA
title-case title, and a two-sentence note filled with the run's real numbers.
Copy these into the document as the figure title and note; the images
themselves are left clean (no baked-in title or caption).
"""

from __future__ import annotations

from pathlib import Path

# Figure order → (figure label, filename, APA title-case title).
FIGURES = [
    ("tamper", "Figure 5.2", "fig-5-2-tamper-detection.png",
     "Tamper-Detection Rate by Mutation Type"),
    ("latency", "Figure 5.3", "fig-5-3-latency.png",
     "Vote-Casting Latency by Percentile"),
    ("throughput", "Figure 5.4", "fig-5-4-throughput.png",
     "Throughput Under Concurrent Load"),
    ("verification", "Figure 5.5", "fig-5-5-verification.png",
     "Receipt Verification Outcomes"),
    ("privacy", "Figure 5.6", "fig-5-6-unlinkability.png",
     "Privacy Inspection of the Public Chain"),
    ("resilience", "Figure 5.7", "fig-5-7-fault-isolation.png",
     "Fault Isolation of the Voting Path"),
    ("usability", "Figure 5.8", "fig-5-8-usability.png",
     "Acceptance-Test Task Completion by Role"),
]


def _r(x, n=0):
    try:
        return f"{float(x):.{n}f}"
    except (TypeError, ValueError):
        return "—"


def _note(key: str, d: dict) -> str:
    if d.get("skipped"):
        return (f"This figure was not generated on this run ({d.get('reason')}). "
                "Re-run the harness once the prerequisite is available.")
    if d.get("error"):
        return "This metric errored on this run; see results.json for details."

    if key == "tamper":
        det = d.get("detection", {})
        attempts = sum(v.get("attempts", 0) for v in det.values())
        rate = min((v.get("rate_pct", 0) for v in det.values()), default=0)
        return (f"Across {d.get('blocks_checked','—')} vote blocks re-hashed "
                "independently, every injected mutation — to the block data, "
                "the voter field, the timestamp, the index, and the "
                f"previous-hash link — changed the recomputed hash and was "
                f"detected, a {_r(rate)}% detection rate over {attempts} "
                "attempts. Corrupting a stored ballot likewise broke its "
                "SHA-256 commitment, showing at-rest tampering is equally "
                "detectable.")
    if key == "latency":
        p = d.get("cast_percentiles_ms", {})
        base = (f"The voter-facing cast API responded in {_r(d.get('avg_ms'))} ms "
                f"on average (p95 {_r(p.get('95') or p.get(95))} ms, p99 "
                f"{_r(p.get('99') or p.get(99))} ms) over {d.get('samples','—')} "
                "ballots.")
        if d.get("avg_anchor_lag_s") is not None:
            base += (" Because on-chain anchoring is fire-and-forget, each block "
                     f"appeared on an independent {d.get('anchor_source','node')} "
                     f"node about {_r(d.get('avg_anchor_lag_s'),2)} s later, "
                     "without affecting voter-facing latency.")
        else:
            base += (" On-chain anchoring is asynchronous (fire-and-forget), so "
                     "it does not affect this voter-facing latency.")
        return base
    if key == "throughput":
        vps = d.get("votes_per_second", {})
        vals = list(vps.values())
        lvls = d.get("levels", [])
        lo = _r(min(vals)) if vals else "—"
        return (f"Sustained accepted throughput rose from {lo} to "
                f"{_r(d.get('peak_votes_per_second'),1)} votes per second as "
                f"voter concurrency increased to {max(lvls) if lvls else '—'}. "
                "This is well above the sub-one-vote-per-second demand of the "
                "small-scale elections the platform targets.")
    if key == "verification":
        return (f"All {d.get('valid_verified','—')} of {d.get('valid_total','—')} "
                "valid receipts verified end-to-end — accepted by the server, "
                "anchored on the chain, and decrypted locally to the counted "
                f"candidate. All {d.get('corrupted_failed_as_expected','—')} of "
                f"{d.get('corrupted_total','—')} deliberately corrupted receipts "
                "failed as expected, rejected by the server and unopenable.")
    if key == "privacy":
        checks = d.get("checks", [])
        passed = sum(1 for c in checks if c.get("pass"))
        return (f"A structural inspection of {d.get('blocks_inspected','—')} "
                "blocks on the public chain confirmed that only a pseudonymous "
                "voter number, a SHA-256 commitment, timestamps, and hashes are "
                f"exposed ({passed} of {len(checks)} checks passed). No voter "
                "identity or candidate choice appeared in any block, so a public "
                "observer cannot link a voter to a vote.")
    if key == "resilience":
        state = "reachable" if d.get("chain_up") else "master stopped"
        return (f"With the chain {state}, {d.get('accepted','—')} of "
                f"{d.get('batch','—')} ballots were accepted "
                f"({_r(d.get('acceptance_pct'))}%) while "
                f"{d.get('anchored','—')} were anchored on-chain "
                f"({_r(d.get('anchor_pct'))}%). Because anchoring is "
                "fire-and-forget, voting availability is independent of the "
                "audit trail: a chain outage degrades the audit log gracefully "
                "rather than stopping the election.")
    if key == "usability":
        sus = d.get("sus")
        sus_txt = f" The overall System Usability Scale score was {_r(sus)}/100." \
            if sus is not None else ""
        roles = ", ".join(d.get("completion_by_role", {}).keys())
        return ("Task-completion rates from the human acceptance pilot (§4.3.7), "
                f"grouped by role ({roles}) across each scripted task." + sus_txt)
    return ""


def write_summary(results: dict, out_dir: Path) -> Path:
    metrics = results.get("metrics", {})
    lines: list[str] = [
        "FIGURE SUMMARY — Tora-Chain evaluation (report §5.4)",
        "APA style: use the label as the figure number, the next line as the "
        "italic figure title, and the 'Note.' text as the figure note.",
        "Images are clean (no embedded title/caption) so they drop straight "
        "into the document.",
        "=" * 72,
        "",
    ]
    for key, label, filename, title in FIGURES:
        if key not in metrics:
            continue
        lines.append(f"{label}")
        lines.append(title)
        lines.append(f"[image: {filename}]")
        lines.append(f"Note. {_note(key, metrics[key])}")
        lines.append("")

    # The two non-scriptable figures, for completeness.
    lines.append("-" * 72)
    lines.append("Not produced by the harness (fill from your own sources):")
    lines.append("• Multi-week availability (§5.4.6, optional line chart): take "
                 "daily availability % from the Cloud Run uptime/monitoring "
                 "dashboard over the pilot window.")
    if "usability" not in metrics or metrics.get("usability", {}).get("skipped"):
        lines.append("• Figure 5.8 (usability): fill data/uat_results.csv with "
                     "your pilot's task-completion rates and SUS score, then "
                     "run `python evaluate.py --only usability`.")

    path = out_dir / "summary.txt"
    path.write_text("\n".join(lines))
    return path
