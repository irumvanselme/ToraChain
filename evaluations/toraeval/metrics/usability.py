"""§5.4.7 Usability and accessibility (NFR-06/07/08).

Usability (SUS score, task-completion rate) is *human* data — it comes from the
acceptance-test pilot (§4.3.7), so the harness cannot generate it. Instead it
**formats** results you collected from the pilot: drop a CSV at
``data/uat_results.csv`` and this produces Figure 5.8. If the file is absent a
template is written and the metric is skipped.

CSV columns: ``task,role,completion_rate``  (completion_rate is 0–100).
A row whose task is ``SUS`` carries the overall SUS score in ``completion_rate``.
"""

from __future__ import annotations

import csv
from pathlib import Path

from .. import logutil
from ..charts import CAT, bar
from ..config import DATA_DIR
from ..scenario import Harness

SAMPLE = """task,role,completion_rate
Register and sign in,Voter,100
Complete eligibility form and enroll,Voter,93
Cast a ballot and save the receipt,Voter,100
Verify the vote from the receipt,Voter,87
Create and activate an election,Admin,100
Approve an auditor organization,Admin,100
Verify results and download the chain,Auditor,95
SUS,,82
"""


def _write_template(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(SAMPLE)


def run(_h: Harness | None, out_dir: Path,
        csv_path: Path | None = None) -> dict:
    logutil.step("§5.4.7 Usability and accessibility")
    csv_path = csv_path or (DATA_DIR / "uat_results.csv")
    if not csv_path.exists():
        template = DATA_DIR / "uat_results.sample.csv"
        _write_template(template)
        logutil.warn(f"no pilot data at {csv_path} — SUS/task-completion is "
                     "human data from the acceptance pilot (§4.3.7).")
        logutil.info(f"a template was written to {template.name}; fill it in "
                     "with your pilot results and re-run `--only usability`.")
        return {"metric": "usability", "skipped": True,
                "reason": "no pilot data provided"}

    tasks: list[str] = []
    task_role: dict[str, str] = {}
    task_rate: dict[str, float] = {}
    roles: list[str] = []
    sus: float | None = None
    with csv_path.open() as f:
        for row in csv.DictReader(f):
            task = (row.get("task") or "").strip()
            role = (row.get("role") or "").strip()
            try:
                rate = float(row.get("completion_rate") or 0)
            except ValueError:
                continue
            if task.upper() == "SUS":
                sus = rate
                continue
            if not task or not role:
                continue
            if task not in tasks:
                tasks.append(task)
            task_role[task] = role
            task_rate[task] = rate
            if role not in roles:
                roles.append(role)

    if not tasks:
        logutil.warn("pilot CSV contained no task rows — skipping.")
        return {"metric": "usability", "skipped": True, "reason": "empty CSV"}

    # One bar per task, coloured by the task's role. A colour key (the "map")
    # names each role; the y-axis ceiling is raised to 150 so that key sits in
    # the headroom above the (<=100%) bars, and long task names are wrapped so
    # the x-axis labels don't collide.
    role_color = {role: CAT[i % len(CAT)] for i, role in enumerate(roles)}
    chart = out_dir / "fig-5-8-usability.png"
    bar(chart, categories=tasks, values=[task_rate[t] for t in tasks],
        ylabel="Completion rate (%)", value_fmt="{:.0f}",
        colors=[role_color[task_role[t]] for t in tasks],
        legend=role_color, ymax=150, wrap=14,
        width=max(9.5, 1.55 * len(tasks)))
    logutil.ok(f"chart -> {chart.name}")

    completion_by_role: dict[str, dict[str, float]] = {}
    for t in tasks:
        completion_by_role.setdefault(task_role[t], {})[t] = task_rate[t]

    return {
        "metric": "usability",
        "sus": sus,
        "tasks": tasks,
        "completion_by_role": completion_by_role,
        "chart": str(chart),
    }
