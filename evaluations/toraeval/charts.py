"""Matplotlib chart helpers with a validated, report-ready visual theme.

Figures are rendered clean for APA use: **no baked-in title or caption** — the
figure number, title, and note are written in the document (see
``out/summary.txt`` for the text). Only the data itself carries labels (axis
titles, legend, and direct value labels), so identity/magnitude never depend on
colour alone (the "relief rule" for the sub-3:1 categorical slots).
"""

from __future__ import annotations

import textwrap
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # headless: write PNG files, never open a window
import matplotlib.pyplot as plt  # noqa: E402

# --- palette (data-viz reference instance, light surface) ------------------
SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK_2 = "#52514e"
GRID = "#e4e3df"

# Categorical slots, fixed order (never cycled).
CAT = ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7", "#e34948",
       "#e87ba4", "#eb6834"]
# Status (reserved; paired with labels).
GOOD = "#0ca30c"
CRITICAL = "#d03b3b"
WARNING = "#eda100"

_BASE_RC = {
    "figure.facecolor": SURFACE,
    "axes.facecolor": SURFACE,
    "savefig.facecolor": SURFACE,
    "axes.edgecolor": GRID,
    "axes.labelcolor": INK_2,
    "axes.labelsize": 11,
    "axes.grid": True,
    "axes.axisbelow": True,
    "grid.color": GRID,
    "grid.linewidth": 0.8,
    "xtick.color": INK_2,
    "ytick.color": INK_2,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "text.color": INK,
    "legend.frameon": False,
    "legend.fontsize": 10,
    "font.size": 11,
    "figure.dpi": 130,
}


def _new_ax(width: float = 7.2, height: float = 4.4):
    plt.rcParams.update(_BASE_RC)
    fig, ax = plt.subplots(figsize=(width, height))
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    ax.grid(axis="x", visible=False)
    return fig, ax


def _save(fig, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight", pad_inches=0.2)
    plt.close(fig)
    return path


def _wrap(labels: list[str], width: int | None) -> list[str]:
    if not width:
        return labels
    return ["\n".join(textwrap.wrap(str(l), width=width)) or str(l)
            for l in labels]


# ---------------------------------------------------------------------------


def bar(path: Path, *, categories: list[str], values: list[float],
        ylabel: str, xlabel: str | None = None, value_fmt: str = "{:.0f}",
        colors: list[str] | None = None, ymax: float | None = None,
        annotations: list[str] | None = None, wrap: int | None = None,
        width: float | None = None,
        legend: dict[str, str] | None = None) -> Path:
    """Single-series vertical bar chart with direct value labels.

    ``colors`` may give a per-bar colour; pass ``legend`` (a label→colour map,
    e.g. roles) to draw a colour key without inventing phantom series.
    """
    fig, ax = _new_ax(width=width or 7.2)
    colors = colors or [CAT[0]] * len(categories)
    bars = ax.bar(range(len(categories)), values, color=colors, width=0.62,
                  zorder=3)
    ax.set_xticks(range(len(categories)))
    ax.set_xticklabels(_wrap(categories, wrap))
    ax.set_ylabel(ylabel)
    if xlabel:
        ax.set_xlabel(xlabel)
    top = ymax if ymax is not None else (max(values) * 1.18 if values else 1)
    ax.set_ylim(0, top)
    if legend:
        from matplotlib.patches import Patch
        handles = [Patch(facecolor=c, label=lbl) for lbl, c in legend.items()]
        ax.legend(handles=handles, loc="upper right", ncol=min(len(legend), 3))
    for i, b in enumerate(bars):
        label = value_fmt.format(values[i])
        if annotations and i < len(annotations) and annotations[i]:
            label = f"{label}\n{annotations[i]}"
        ax.text(b.get_x() + b.get_width() / 2, b.get_height(), label,
                ha="center", va="bottom", fontsize=9, color=INK, zorder=4)
    return _save(fig, path)


def grouped_bar(path: Path, *, categories: list[str],
                series: dict[str, list[float]], ylabel: str,
                xlabel: str | None = None, value_fmt: str = "{:.0f}",
                colors: list[str] | None = None, ymax: float | None = None,
                wrap: int | None = None, width: float | None = None) -> Path:
    """Grouped vertical bars (one group per category, one bar per series)."""
    names = list(series.keys())
    fig, ax = _new_ax(width=width or 7.2)
    colors = colors or CAT[: len(names)]
    n = len(names)
    bw = 0.8 / max(n, 1)
    x = list(range(len(categories)))
    for j, name in enumerate(names):
        offs = [xi + (j - (n - 1) / 2) * bw for xi in x]
        vals = series[name]
        bars = ax.bar(offs, vals, width=bw * 0.92, label=name, color=colors[j],
                      zorder=3)
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, b.get_height(),
                    value_fmt.format(v), ha="center", va="bottom", fontsize=8.5,
                    color=INK, zorder=4)
    ax.set_xticks(x)
    ax.set_xticklabels(_wrap(categories, wrap))
    ax.set_ylabel(ylabel)
    if xlabel:
        ax.set_xlabel(xlabel)
    default_top = max((max(v) for v in series.values()), default=1) * 1.2
    ax.set_ylim(0, ymax if ymax is not None else default_top)
    if n >= 2:  # a single series is named in the document, not a legend
        ax.legend(loc="upper right", ncol=min(n, 3))
    return _save(fig, path)


def lines(path: Path, *, x: list, series: dict[str, list[float]],
          xlabel: str, ylabel: str, colors: list[str] | None = None,
          label_last: bool = True) -> Path:
    """One or more line series over a shared x-axis."""
    fig, ax = _new_ax()
    names = list(series.keys())
    colors = colors or CAT[: len(names)]
    for j, name in enumerate(names):
        ax.plot(x, series[name], color=colors[j], linewidth=2, marker="o",
                markersize=5, label=name, zorder=3)
        if label_last and series[name]:
            ax.annotate(f"{series[name][-1]:.0f}",
                        (x[-1], series[name][-1]), textcoords="offset points",
                        xytext=(6, 0), fontsize=9, color=INK, va="center")
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.set_ylim(bottom=0)
    if len(names) >= 2:
        ax.legend(loc="center left")
    return _save(fig, path)


def table_figure(path: Path, *, headers: list[str], rows: list[list[str]],
                 statuses: list[bool] | None = None,
                 col_widths: list[float] | None = None) -> Path:
    """Render a checklist/audit table as an image (for structural results)."""
    plt.rcParams.update(_BASE_RC)
    fig, ax = plt.subplots(figsize=(10.5, 0.4 + 0.46 * (len(rows) + 1)))
    ax.axis("off")
    tbl = ax.table(cellText=rows, colLabels=headers, cellLoc="left",
                   colWidths=col_widths, loc="center")
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(10)
    tbl.scale(1, 1.6)
    for (r, _c), cell in tbl.get_celld().items():
        cell.set_edgecolor(GRID)
        if r == 0:
            cell.set_facecolor("#f0efec")
            cell.set_text_props(color=INK, fontweight="bold")
        else:
            cell.set_facecolor(SURFACE)
            if statuses is not None and (r - 1) < len(statuses):
                cell.get_text().set_color(GOOD if statuses[r - 1] else CRITICAL)
    return _save(fig, path)
