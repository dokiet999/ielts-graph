"""figures/agreement.png: AI score against the human score on the held-out sets (one panel per comparison)."""
import csv
import json
from collections import Counter
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

HERE = Path(__file__).resolve().parent
BLUE, INK, MUTED, GRID, SURFACE = "#2a78d6", "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb"


def load(name):
    return [json.loads(l) for l in open(HERE / "results" / name, encoding="utf-8")]


def panel(ax, xs, ys, lo, hi, title, xlabel, ylabel, tol):
    ax.set_facecolor(SURFACE)
    ax.fill_between([lo, hi], [lo - tol, hi - tol], [lo + tol, hi + tol], color=GRID, alpha=0.6, lw=0)
    ax.plot([lo, hi], [lo, hi], color=MUTED, lw=1, ls="--")
    counts = Counter(zip(xs, ys))  # repeated points drawn bigger instead of hidden
    ax.scatter([p[0] for p in counts], [p[1] for p in counts], s=[40 * n for n in counts.values()],
               color=BLUE, edgecolor=SURFACE, linewidth=1.5, zorder=3)
    ax.set_xlim(lo, hi)
    ax.set_ylim(lo, hi)
    ax.set_aspect("equal")
    ax.set_title(title, fontsize=10, color=INK, loc="left")
    ax.set_xlabel(xlabel, fontsize=9, color=MUTED)
    ax.set_ylabel(ylabel, fontsize=9, color=MUTED)
    ax.tick_params(colors=MUTED, labelsize=8)
    ax.grid(color=GRID, lw=0.6)
    for s in ax.spines.values():
        s.set_visible(False)


def main():
    w = [r for r in load("writing.jsonl") if r["split"] == "heldout" and r.get("ai_overall") is not None]
    s = [r for r in load("speaking.jsonl") if r["split"] == "heldout" and r.get("ai_overall") is not None]
    p = [r for r in csv.DictReader(open(HERE / "pron_speechocean.csv", encoding="utf-8")) if r["ai_accuracy"]]

    fig, axes = plt.subplots(1, 3, figsize=(12, 4.3), facecolor=SURFACE)
    panel(axes[0], [r["human"]["overall"] for r in w], [r["ai_overall"] for r in w], 3, 9,
          f"Writing, held-out ({len(w)} essays)", "Reference band", "AI band", 0.5)
    panel(axes[1], [round((r["human_p3"] - 3) * 1.5 + 4.5, 2) for r in s], [r["ai_overall"] for r in s], 2.5, 9,
          f"Speaking, held-out ({len(s)} answers)", "Human mark as IELTS band (approx.)", "AI band", 0.5)
    panel(axes[2], [int(r["human_accuracy"]) * 10 for r in p], [float(r["ai_accuracy"]) for r in p], 20, 100,
          f"Pronunciation accuracy ({len(p)} sentences)", "Expert score x 10", "AI score (0-100)", 10)
    fig.text(0.01, 0.01, "Dashed line: AI = human. Grey band: within 0.5 band (10 points for pronunciation). "
             "Bigger dot: several items at the same point.", fontsize=8, color=MUTED)
    fig.tight_layout(rect=(0, 0.04, 1, 1))
    (HERE / "figures").mkdir(exist_ok=True)
    fig.savefig(HERE / "figures" / "agreement.png", dpi=150)


if __name__ == "__main__":
    main()
