#!/usr/bin/env python3
"""Tora-Chain evaluation harness — entrypoint.

Runs the report §5.4 evaluations against a locally running dev stack.

Typical use (from repo root, in one terminal):

    make dev                         # start every service

Then, in another terminal:

    cd evaluations
    python3 -m venv .venv && . .venv/bin/activate
    pip install -r requirements.txt
    python evaluate.py               # reset -> seed -> test -> charts

Charts and a machine-readable ``results.json`` land in ``evaluations/out/``.

Selected runs:

    python evaluate.py --only tamper,verification
    python evaluate.py --only resilience     # after stopping the chain master
    python evaluate.py --reset-only          # just clear this harness's data
    python evaluate.py --wipe --yes          # full truncate (throwaway DB only)
"""

from __future__ import annotations

import argparse
import json
import sys
import traceback
from pathlib import Path

from toraeval import dbreset, httpc, logutil, summary
from toraeval.config import OUT_DIR, SETTINGS
from toraeval.metrics import (latency, privacy, resilience, tamper, throughput,
                              usability, verification)
from toraeval.scenario import Harness

# Metrics that cast ballots need the live election + services.
CASTING_METRICS = {"tamper", "latency", "throughput", "verification",
                   "resilience", "privacy"}
ALL_METRICS = ["tamper", "latency", "throughput", "verification", "resilience",
               "privacy", "usability"]


def _check_services() -> bool:
    ok = True
    for name, url in (("identity provider", SETTINGS.idp_url),
                      ("elections API", SETTINGS.api_url)):
        if httpc.is_up(url):
            logutil.ok(f"{name} reachable at {url}")
        else:
            logutil.fail(f"{name} NOT reachable at {url}")
            ok = False
    if not ok:
        logutil.warn("Start the stack first:  make dev   (from the repo root)")
    return ok


def _scale(profile: str) -> dict:
    if profile == "quick":
        return {"tamper": 4, "latency": 8, "verification": (6, 3),
                "resilience": 6, "levels": [1, 3, 5]}
    if profile == "full":
        return {"tamper": 12, "latency": 60, "verification": (40, 12),
                "resilience": 40, "levels": [1, 5, 10, 25, 50]}
    return {"tamper": 8, "latency": 30, "verification": (20, 8),
            "resilience": 20, "levels": [1, 5, 10, 20, 40]}


def main() -> int:
    parser = argparse.ArgumentParser(description="Tora-Chain §5.4 evaluations")
    parser.add_argument("--only", help="comma-separated metrics: "
                        + ",".join(ALL_METRICS))
    parser.add_argument("--no-reset", action="store_true",
                        help="do not clear prior evaluation data first")
    parser.add_argument("--reset-only", action="store_true",
                        help="clear this harness's data and exit")
    parser.add_argument("--wipe", action="store_true",
                        help="TRUNCATE all elections tables (throwaway DB only)")
    parser.add_argument("--yes", action="store_true",
                        help="confirm a destructive --wipe")
    parser.add_argument("--scale", choices=["quick", "normal", "full"],
                        default="normal", help="workload size (default normal)")
    parser.add_argument("--out", default=str(OUT_DIR),
                        help="output directory for charts + results.json")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    # --- destructive shortcuts -------------------------------------------
    if args.wipe:
        return 0 if dbreset.wipe_all(confirm=args.yes) else 1
    if args.reset_only:
        dbreset.reset_eval_data()
        return 0

    selected = ([m.strip() for m in args.only.split(",")] if args.only
                else ALL_METRICS)
    unknown = [m for m in selected if m not in ALL_METRICS]
    if unknown:
        logutil.fail(f"unknown metric(s): {unknown}. choose from {ALL_METRICS}")
        return 2

    needs_stack = any(m in CASTING_METRICS for m in selected)
    scale = _scale(args.scale)
    results: dict = {"scale": args.scale, "metrics": {}}

    if needs_stack:
        logutil.step("Checking services")
        if not _check_services():
            return 1

    # --- reset + seed -----------------------------------------------------
    # Only touch the database when we are actually going to cast votes; a
    # chart-formatting-only run (e.g. --only usability) never needs it.
    if not args.no_reset and needs_stack:
        logutil.step("Resetting prior evaluation data")
        dbreset.reset_eval_data()

    harness = None
    if needs_stack:
        try:
            harness = Harness.bootstrap()
        except Exception as exc:
            logutil.fail(f"failed to set up the election fixture: {exc}")
            traceback.print_exc()
            return 1

    # --- run metrics ------------------------------------------------------
    runners = {
        "tamper": lambda: tamper.run(harness, out_dir, samples=scale["tamper"]),
        "latency": lambda: latency.run(harness, out_dir, samples=scale["latency"]),
        "throughput": lambda: throughput.run(harness, out_dir, levels=scale["levels"]),
        "verification": lambda: verification.run(
            harness, out_dir, valid=scale["verification"][0],
            corrupted=scale["verification"][1]),
        "resilience": lambda: resilience.run(harness, out_dir, batch=scale["resilience"]),
        "privacy": lambda: privacy.run(harness, out_dir),
        "usability": lambda: usability.run(harness, out_dir),
    }

    for metric in ALL_METRICS:  # stable order (casting before close)
        if metric not in selected:
            continue
        try:
            results["metrics"][metric] = runners[metric]()
        except Exception as exc:
            logutil.fail(f"metric '{metric}' errored: {exc}")
            traceback.print_exc()
            results["metrics"][metric] = {"metric": metric, "error": str(exc)}

    if harness is not None:
        try:
            harness.close_election()
            results["election_id"] = harness.election_id
            logutil.ok("election closed (status=ended)")
        except Exception as exc:
            logutil.warn(f"could not close election: {exc}")

    # --- write results ----------------------------------------------------
    results_path = out_dir / "results.json"
    results_path.write_text(json.dumps(results, indent=2, default=str))
    summary.write_summary(results, out_dir)
    logutil.step("Summary")
    for metric, data in results["metrics"].items():
        if data.get("skipped"):
            logutil.warn(f"{metric}: skipped ({data.get('reason')})")
        elif data.get("error"):
            logutil.fail(f"{metric}: error")
        else:
            logutil.ok(f"{metric}: done -> {Path(data.get('chart','')).name}")
    logutil.info(f"\nResults + charts in: {out_dir}")
    logutil.info(f"APA figure titles + notes: {out_dir / 'summary.txt'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
