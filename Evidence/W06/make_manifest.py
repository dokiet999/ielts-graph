"""Writes manifest.json: sha256 of every evidence file and of the input data, git commit, parameters, date.
Run it last, after the other files have been produced."""
import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DATA = ["data/learner_sim/interaction_logs.csv", "data/learner_sim/true_mastery.csv"]
APPLICATION_YAML = ROOT / "backend/ielts-backend/ielts-backend/src/main/resources/application.yaml"
SENSITIVITY_GRID = {
    "etaMin": [0.05, 0.10, 0.20],
    "weightClean": [0.0, 0.15, 0.30, 0.60],
    "offset": [1, 3, 5, 10],
}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()


def default_parameters():
    """Defaults of app.profile.* as written in application.yaml, e.g. eta-min: ${PROFILE_ETA_MIN:0.10}."""
    text = APPLICATION_YAML.read_text(encoding="utf-8")
    block = re.search(r"\n  profile:\n((?:    .*\n)+)", text).group(1)
    return {name: float(value) for name, value in re.findall(r"(\S+): \$\{PROFILE_\w+:([0-9.]+)\}", block)}


def main():
    files = sorted(p for p in HERE.rglob("*") if p.is_file() and p.name != "manifest.json"
                   and "__pycache__" not in p.parts)
    manifest = {
        "issue": "#36 W6: Evaluate skill state on synthetic logs",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "git_commit": git("rev-parse", "HEAD"),
        # True when the code or data differed from the commit when the evidence was produced
        "git_dirty": bool(git("status", "--porcelain", "--", "backend", "data", "docs")),
        "parameters": default_parameters(),
        "sensitivity_grid": SENSITIVITY_GRID,
        "week_cutoff": "week k = events with time < 2026-09-07T00:00:00Z + 7k days",
        "data": [{"path": p, "sha256": sha256(ROOT / p)} for p in DATA],
        "files": [{"path": p.relative_to(ROOT).as_posix(), "sha256": sha256(p)} for p in files],
    }
    (HERE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote manifest.json ({len(files)} files, commit {manifest['git_commit'][:7]})")


if __name__ == "__main__":
    main()
