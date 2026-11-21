"""Draws the W8 figure from results/*.json: AI band, profile band and (Writing) reference band per attempt."""
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

HERE = Path(__file__).resolve().parent
CASES = json.loads((HERE / "cases.json").read_text(encoding="utf-8"))
LABELS = {"case_a_weak_writer": "A: Writing, low-band essays", "case_b_high_band_writer": "B: Writing, high-band essays",
          "case_c_speaker": "C: Speaking (synthetic voice)"}


def main():
    (HERE / "figures").mkdir(exist_ok=True)
    fig, axes = plt.subplots(1, 3, figsize=(13, 4), sharey=True)
    for ax, case in zip(axes, CASES):
        trace = json.loads((HERE / "results" / f"{case['id']}.json").read_text(encoding="utf-8"))
        graded = [(s, c) for s, c in zip(trace["steps"], [x for x in case["steps"]]) if "result" in s]
        x = list(range(1, len(graded) + 1))
        ax.plot(x, [s["result"]["overallBand"] for s, _ in graded], "o-", label="AI band of the attempt", linewidth=2)
        ax.plot(x, [s["after"]["currentBand"] for s, _ in graded], "s--", label="Profile band (after)")
        refs = [c.get("referenceBand") for _, c in graded]
        if all(r is not None for r in refs):
            ax.plot(x, refs, "^:", color="grey", label="Reference band of the essay")
        ax.set_title(LABELS[case["id"]], fontsize=10)
        ax.set_xlabel("Attempt")
        ax.set_xticks(x)
        ax.grid(alpha=0.3)
    axes[0].set_ylabel("Band")
    axes[0].legend(fontsize=8, loc="lower right")
    fig.tight_layout()
    fig.savefig(HERE / "figures" / "bands_by_attempt.png", dpi=150)
    print("Wrote figures/bands_by_attempt.png")


if __name__ == "__main__":
    main()
