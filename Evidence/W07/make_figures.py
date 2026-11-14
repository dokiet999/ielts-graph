"""Draws the W7 figures from metrics.csv and comparison.csv (run after the Java evaluation)."""
import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

HERE = Path(__file__).resolve().parent
FIGURES = HERE / "figures"
RANDOM_PRECISION = 3 / 25
LABELS = {
    "B1_latest_attempt": "B1 latest attempt (W5 rule)",
    "B2_error_count": "B2 error count",
    "G_graph_method": "G graph method",
    "G_mastery_only": "G mastery only (ablation)",
    "G_no_gap": "G without gap (ablation)",
}
STYLES = {
    "B1_latest_attempt": dict(linestyle="--", marker="s"),
    "B2_error_count": dict(linestyle="--", marker="^"),
    "G_graph_method": dict(linewidth=2.5, marker="o"),
    "G_mastery_only": dict(linestyle=":", marker="."),
    "G_no_gap": dict(linestyle=":", marker="x"),
}


def read(name):
    with open(HERE / name, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def by_week(rows, metric, ylabel, title, out, chance=None):
    main = [r for r in rows if r["scenario"] == "main"]
    fig, ax = plt.subplots(figsize=(7.5, 4.5))
    for method in LABELS:
        points = [(int(r["week"]), float(r[metric])) for r in main if r["method"] == method]
        ax.plot([p[0] for p in points], [p[1] for p in points], label=LABELS[method], **STYLES[method])
    if chance is not None:
        ax.axhline(chance, color="grey", linewidth=0.8, linestyle=":", label="Random ranking")
    ax.set_xlabel("Week (graded attempts so far)")
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.set_xticks(range(1, 9))
    ax.grid(alpha=0.3)
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(FIGURES / out, dpi=150)
    plt.close(fig)


def week8_by_scenario(rows):
    scenarios = ["main", "band_noise_1", "rules_w8"]
    methods = list(LABELS)
    width = 0.16
    fig, ax = plt.subplots(figsize=(8.5, 4.5))
    for i, method in enumerate(methods):
        values = [next(float(r["precision_at_3"]) for r in rows
                       if r["scenario"] == s and r["method"] == method and r["week"] == "8") for s in scenarios]
        ax.bar([x + (i - 2) * width for x in range(len(scenarios))], values, width, label=LABELS[method])
    ax.axhline(RANDOM_PRECISION, color="grey", linewidth=0.8, linestyle=":", label="Random ranking")
    ax.set_xticks(range(len(scenarios)), ["Main", "Band noise 1.0", "Rules planned for W8"])
    ax.set_ylabel("Precision@3 at week 8 (higher is better)")
    ax.set_title("Week 8: every method in each scenario")
    ax.set_ylim(0, 0.5)
    ax.grid(alpha=0.3, axis="y")
    ax.legend(fontsize=8, loc="upper left", ncol=3)
    fig.tight_layout()
    fig.savefig(FIGURES / "week8_by_scenario.png", dpi=150)
    plt.close(fig)


def main():
    FIGURES.mkdir(exist_ok=True)
    rows = read("metrics.csv")
    by_week(rows, "precision_at_3", "Precision@3 (higher is better)",
            "Share of the top 3 that are among the 3 truly weakest SubSkills", "precision_by_week.png",
            chance=RANDOM_PRECISION)
    by_week(rows, "spearman", "Spearman rho (higher is better)",
            "Rank correlation with the true weakness order", "spearman_by_week.png", chance=0)
    week8_by_scenario(rows)
    print("Wrote", ", ".join(sorted(p.name for p in FIGURES.glob("*.png"))))


if __name__ == "__main__":
    main()
