"""Draws the W6 figures from metrics.csv and sensitivity.csv (run after the Java simulation)."""
import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

HERE = Path(__file__).resolve().parent
FIGURES = HERE / "figures"
TARGET_CORRELATION = 0.6
TARGET_MAE = 0.15
DEFAULTS = {"etaMin": 0.10, "weightClean": 0.30, "offset": 3.0}


def read(name):
    with open(HERE / name, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def mae_by_week(rows):
    weeks = [int(r["week"]) for r in rows]
    fig, ax = plt.subplots(figsize=(7, 4.2))
    ax.plot(weeks, [float(r["mae"]) for r in rows], marker="o", label="Skill state estimate")
    ax.plot(weeks, [float(r["baseline_mae"]) for r in rows], marker="s", linestyle="--",
            label='Baseline "always 0.5"')
    ax.axhline(TARGET_MAE, color="grey", linewidth=0.8, linestyle=":", label=f"Target MAE < {TARGET_MAE}")
    ax.set_xlabel("Week")
    ax.set_ylabel("Mean absolute error (lower is better)")
    ax.set_title("MAE of estimated vs true mastery (60 learners x 25 SubSkills)")
    ax.set_xticks(weeks)
    ax.grid(alpha=0.3)
    ax.legend()
    fig.tight_layout()
    fig.savefig(FIGURES / "mae_by_week.png", dpi=150)
    plt.close(fig)


def correlation_by_week(rows):
    # Week 0 has no correlation: every estimate is the initial value
    rows = [r for r in rows if r["correlation"]]
    weeks = [int(r["week"]) for r in rows]
    fig, ax = plt.subplots(figsize=(7, 4.2))
    ax.plot(weeks, [float(r["correlation"]) for r in rows], marker="o", label="Skill state estimate")
    ax.axhline(TARGET_CORRELATION, color="grey", linewidth=0.8, linestyle=":",
               label=f"Target correlation > {TARGET_CORRELATION}")
    ax.set_xlabel("Week")
    ax.set_ylabel("Pearson correlation (higher is better)")
    ax.set_title("Correlation of estimated vs true mastery")
    ax.set_xticks(weeks)
    ax.set_ylim(0, 1)
    ax.grid(alpha=0.3)
    ax.legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(FIGURES / "correlation_by_week.png", dpi=150)
    plt.close(fig)


def sensitivity(rows):
    params = list(DEFAULTS)
    fig, axes = plt.subplots(2, len(params), figsize=(12, 6.5), sharey="row")
    for col, param in enumerate(params):
        for metric_row, metric in enumerate(("mae", "correlation")):
            ax = axes[metric_row][col]
            for week, marker in (("4", "o"), ("8", "s")):
                points = sorted((float(r["value"]), float(r[metric])) for r in rows
                                if r["parameter"] == param and r["week"] == week)
                ax.plot([p[0] for p in points], [p[1] for p in points], marker=marker, label=f"Week {week}")
            ax.axvline(DEFAULTS[param], color="grey", linewidth=0.8, linestyle=":")
            ax.grid(alpha=0.3)
            if metric_row == 1:
                ax.set_xlabel(f"{param} (dotted line: default {DEFAULTS[param]:g})")
            if col == 0:
                ax.set_ylabel("MAE (lower is better)" if metric == "mae" else "Correlation (higher is better)")
            if metric_row == 0:
                ax.set_title(param)
    axes[0][0].legend()
    fig.suptitle("Sensitivity: one parameter changed, the others at their default")
    fig.tight_layout()
    fig.savefig(FIGURES / "sensitivity.png", dpi=150)
    plt.close(fig)


def main():
    FIGURES.mkdir(exist_ok=True)
    mae_by_week(read("metrics.csv"))
    correlation_by_week(read("metrics.csv"))
    sensitivity(read("sensitivity.csv"))
    print("Wrote", ", ".join(sorted(p.name for p in FIGURES.glob("*.png"))))


if __name__ == "__main__":
    main()
