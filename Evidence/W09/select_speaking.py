"""Picks the Speaking held-out sample from the Speak & Improve Corpus 2025 (dev set) and writes speaking_sample.csv.

Only Part 3 answers (60 s long turn on an opinion question, with a "You should say" cue: the closest part to IELTS
Speaking Part 2). Each answer has a human mark for that part (0-6 scale, 0.5 steps, about CEFR: 3 = B1, 4 = B2, 5 = C1).
The sample is stratified by mark (fixed seed). In each mark level, one answer goes to the calibration split and the
rest to the held-out split: the calibration split is the only one used to fit the calibration.

    SANDI_DIR=<path to sandi-corpus-2025> python select_speaking.py
The corpus is not redistributed: speaking_sample.csv keeps file ids, marks and question text only.
"""
import csv
import json
import os
import random
import re
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
SEED = 9
PER_LEVEL = {2.0: 3, 2.5: 3, 3.0: 4, 3.5: 4, 4.0: 4, 4.5: 4, 5.0: 4, 5.5: 4}  # 30 answers


def clean(text):
    """Question text without its line breaks (stored as the two characters backslash-n) and markdown bullets."""
    text = text.replace("\\n", " ").replace("\n", " ").replace("**", "").replace("* ", "")
    return re.sub(r"\s+", " ", text).strip()


def main():
    root = Path(os.environ["SANDI_DIR"])
    ref = root / "reference-materials"
    p3 = {fid: float(m) for fid, m in (l.split() for l in open(ref / "sla-marks" / "dev-sla-P3.tsv"))}
    overall = {fid: float(m) for fid, m in (l.split() for l in open(ref / "sla-marks" / "dev-sla-overall.tsv"))}
    audio = dict(l.split() for l in open(ref / "flists.flac" / "dev-sla-P3.tsv"))
    questions = {f["File-id"]: json.loads(f["Question"])
                 for f in json.load(open(ref / "annotations" / "dev-trans-ref.json", encoding="utf-8"))["files"]}

    by_level = defaultdict(list)
    for test_id, mark in sorted(p3.items()):
        fid = next((f for f in audio if f.startswith(test_id + "-P3")), None)
        if fid and fid in questions:
            by_level[mark].append((test_id, fid))

    rng = random.Random(SEED)
    rows = []
    for level, n in PER_LEVEL.items():
        picked = rng.sample(by_level[level], n)
        for i, (test_id, fid) in enumerate(picked):
            q = questions[fid]
            rows.append({
                "file_id": fid, "test_id": test_id, "split": "calibration" if i == 0 else "heldout",
                "human_p3": level, "human_overall": overall.get(test_id, ""), "audio": audio[fid],
                "speaking_time": q.get("speaking-time"), "question": clean(q["text"]),
            })
    with open(HERE / "speaking_sample.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(len(rows), "answers:", sum(r["split"] == "calibration" for r in rows), "calibration,",
          sum(r["split"] == "heldout" for r in rows), "held-out")


if __name__ == "__main__":
    main()
