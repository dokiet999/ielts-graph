"""Adds what the W7 offline evaluation needs to the W6 synthetic learners (docs/offline-evaluation-design.md):
the band of each criterion of each Writing or Speaking attempt, and a target band per learner and skill.

Reads interaction_logs.csv and true_mastery.csv (not changed) and the KG CSV files.
- Criterion band = round(3.5 + 5 * mean true mastery of the criterion's SubSkills + N(0, noise)), integer 1-9,
  where the true mastery is the one the generator used for the attempt (the snapshot at the start of its week).
- Target band = true band at week 0 + 0.5, 1.0 or 1.5 (at random), rounded to 0.5, at most 9.0.

Usage (repository root):
    python data/learner_sim/derive_bands.py                                   # attempt_bands.csv, targets.csv
    python data/learner_sim/derive_bands.py --noise 1.0 --bands-out attempt_bands_noise1.csv --no-targets
The same seed gives the same files.
"""
import argparse
import csv
import random
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
START = datetime(2026, 9, 7, tzinfo=timezone.utc)


def band_of(mastery):
    return 3.5 + 5 * mastery


def read_kg():
    """Criteria of each skill and SubSkills of each criterion."""
    skill_of = {}
    with open(ROOT / "kg/data/nodes.csv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if row["label"] == "Criterion":
                skill_of[row["id"]] = row["skill"]
    subskills = defaultdict(list)
    with open(ROOT / "kg/data/relationships.csv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if row["type"] == "HAS_SUBSKILL":
                subskills[row["from_id"]].append(row["to_id"])
    criteria = defaultdict(list)
    for criterion, skill in sorted(skill_of.items()):
        criteria[skill].append(criterion)
    return criteria, subskills


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--noise", type=float, default=0.5)
    ap.add_argument("--seed", type=int, default=20261108)
    ap.add_argument("--bands-out", default="attempt_bands.csv")
    ap.add_argument("--no-targets", action="store_true")
    args = ap.parse_args()
    rng = random.Random(args.seed)
    criteria, subskills = read_kg()
    skill_subskills = {s: {x for c in cs for x in subskills[c]} for s, cs in criteria.items()}
    only_writing = skill_subskills["SKILL_W"] - skill_subskills["SKILL_S"]

    truth = {}
    with open(HERE / "true_mastery.csv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            truth[(row["user_id"], int(row["week"]), row["subskill_id"])] = float(row["true_mastery"])

    # One attempt = the events with the same source_id; its skill is Writing when it covers a Writing-only SubSkill
    attempts = {}
    with open(HERE / "interaction_logs.csv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if "_attempt_" not in row["source_id"]:
                continue
            a = attempts.setdefault(row["source_id"], {"user": row["user_id"], "time": row["time"], "subs": set()})
            a["subs"].add(row["subskill_id"])

    rows = []
    for source_id, a in sorted(attempts.items(), key=lambda kv: (kv[1]["user"], kv[1]["time"], kv[0])):
        skill = "SKILL_W" if a["subs"] & only_writing else "SKILL_S"
        t = datetime.strptime(a["time"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        week = (t - START).days // 7
        for criterion in criteria[skill]:
            mean = sum(truth[(a["user"], week, s)] for s in subskills[criterion]) / len(subskills[criterion])
            band = min(9, max(1, round(band_of(mean) + rng.gauss(0, args.noise))))
            rows.append((a["user"], source_id, a["time"], skill, criterion, band))
    with open(HERE / args.bands_out, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["user_id", "source_id", "time", "skill", "criterion_id", "band"])
        w.writerows(rows)
    print(f"{args.bands_out}: {len(rows)} criterion bands of {len(attempts)} attempts (noise {args.noise})")

    if args.no_targets:
        return
    targets = []
    for user in sorted({a["user"] for a in attempts.values()}):
        for skill in ("SKILL_W", "SKILL_S"):
            subs = skill_subskills[skill]
            current = band_of(sum(truth[(user, 0, s)] for s in subs) / len(subs))
            target = min(9.0, round((current + rng.choice([0.5, 1.0, 1.5])) * 2) / 2)
            targets.append((user, skill, f"{target:.1f}"))
    with open(HERE / "targets.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["user_id", "skill", "target_band"])
        w.writerows(targets)
    print(f"targets.csv: {len(targets)} targets")


if __name__ == "__main__":
    main()
