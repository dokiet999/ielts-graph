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
    "ai/prompts/writing_v1.system.txt",
    "ai/prompts/speaking_v1.system.txt",
    "ai/rubric/writing_rubric.json",
    "ai/rubric/speaking_rubric.json",
]
SETTINGS = {
    "issue": "W9: Calibration with human scoring subset",
    "writing": "writing_v1, 40 essays: dev (16) = calibration, test (24) = held-out; reference bands of the source "
               "(community scores, 4 criteria and overall); grader prompt writing-v1.2, gemini-3.5-flash-lite",
    "speaking": "Speak & Improve Corpus 2025 dev set, Part 3 (60 s opinion answer), 30 answers stratified by human mark "
                "(seed 9): 8 calibration, 22 held-out; graded as QT_S_PART3; Whisper small, pronunciation by Gemini, "
                "grader prompt speaking-v1.2",
    "speaking_scale": "human mark 0-6 (3 = B1, 4 = B2, 5 = C1) vs AI band through mark = (band - 4.5) / 1.5 + 3",
    "pronunciation": "speechocean762 test split, adults, 49 sentences stratified by expert total (seed 9), "
                     "pronunciation.py gemini_assess with gemini-3.5-flash-lite",
    "calibration": "fitted on the calibration split only: offset and linear least squares, rounded to 0.5",
    "not_in_git": "corpus audio, essays text and transcripts (licences), only ids and scores are kept",
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
