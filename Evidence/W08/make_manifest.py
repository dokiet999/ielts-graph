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
    "data/writing_v1/essays.json",
    "kg/data/nodes.csv",
    "kg/data/relationships.csv",
    "ai/prompts/writing_v1.system.txt",
    "ai/prompts/speaking_v1.system.txt",
]
SETTINGS = {
    "issue": "#42 W8: End-to-end demo of Writing/Speaking -> KG -> recommendation",
    "cases": "Evidence/W08/cases.json",
    "learners": "seed accounts student_new, student_enrolled (empty history), student_profile (seeded demo history)",
    "writing": "Gemini grader, prompt writing-v1.2; essays from data/writing_v1 with the dev prompt of the same id",
    "speaking": "Whisper small (faster-whisper), pronunciation scored by Gemini (source 'gemini'), grader prompt speaking-v1.2; "
                "audio synthesised with the Windows voice Microsoft Zira",
    "profile_rules": "application.yaml: initial-mastery 0.5, eta-min 0.10, offset 3, weight-error 1.0, weight-clean 0.5, drills do not count",
    "ranking": "priority = 0.5 (1 - mastery) + 0.3 recent error rate + 0.2 min(gap to target, 2) / 2",
    "pronunciation_model": "gemini-3.5-flash-lite (default of PRON_GEMINI_MODEL; the earlier default gemini-4-argon answered HTTP 429)",
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
    files = sorted(p for p in HERE.rglob("*") if p.is_file() and p.name != "manifest.json" and "__pycache__" not in p.parts
                   and p.suffix != ".wav")  # the audio is generated locally and not kept in Git
    manifest = {
        "issue": SETTINGS["issue"],
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "git_commit": git("rev-parse", "HEAD"),
        "git_dirty": bool(git("status", "--porcelain", "--", "backend", "frontend", "kg", "ai", "data")),
        "settings": SETTINGS,
        "data": [{"path": p, "sha256": sha256(ROOT / p)} for p in DATA],
        "files": [{"path": p.relative_to(ROOT).as_posix(), "sha256": sha256(p)} for p in files],
    }
    (HERE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote manifest.json ({len(files)} files, commit {manifest['git_commit'][:7]})")


if __name__ == "__main__":
    main()
