"""Writes manifest.json: sha256 of every evidence file and of the input data, git commit, settings, date.
Run it last, after the other files have been produced."""
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DATA = [
    "data/learner_sim/interaction_logs.csv",
    "data/learner_sim/true_mastery.csv",
    "data/learner_sim/attempt_bands.csv",
    "data/learner_sim/attempt_bands_noise1.csv",
    "data/learner_sim/targets.csv",
    "kg/data/relationships.csv",
]
SETTINGS = {
    "design": "docs/offline-evaluation-design.md",
    "methods": {
        "B1_latest_attempt": "errors of the latest graded attempt (W5 rule)",
        "B2_error_count": "ERROR events so far",
        "G_graph_method": "0.5 (1 - mastery) + 0.3 recent error rate + 0.2 min(gap, 2) / 2",
        "G_mastery_only": "1 - mastery",
        "G_no_gap": "0.625 (1 - mastery) + 0.375 recent error rate",
    },
    "scenarios": {
        "main": "attempt_bands.csv (noise 0.5), profile rules of application.yaml (drills count, CLEAN 0.3)",
        "band_noise_1": "attempt_bands_noise1.csv (noise 1.0), same profile rules",
        "rules_w8": "attempt_bands.csv, drills do not count, CLEAN 0.5",
    },
    "top": 3,
    "recent_observations": 3,
    "bootstrap_resamples": 2000,
    "seed": 20261108,
    "week_cutoff": "week k = events and bands with time < 2026-09-07T00:00:00Z + 7k days",
}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()


def main():
    files = sorted(p for p in HERE.rglob("*") if p.is_file() and p.name != "manifest.json"
                   and "__pycache__" not in p.parts)
    manifest = {
        "issue": "#38 W7: Recommendation baseline, graph method and offline evaluation",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "git_commit": git("rev-parse", "HEAD"),
        # True when the code or data differed from the commit when the evidence was produced
        "git_dirty": bool(git("status", "--porcelain", "--", "backend", "data", "docs")),
        "settings": SETTINGS,
        "data": [{"path": p, "sha256": sha256(ROOT / p)} for p in DATA],
        "files": [{"path": p.relative_to(ROOT).as_posix(), "sha256": sha256(p)} for p in files],
    }
    (HERE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote manifest.json ({len(files)} files, commit {manifest['git_commit'][:7]})")


if __name__ == "__main__":
    main()
