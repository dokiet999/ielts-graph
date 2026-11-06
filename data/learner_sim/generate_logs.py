"""Generate synthetic learners and their interaction logs (W6, see docs/learner-profile-rules.md, section 7).

The generator keeps a hidden true mastery per (learner, SubSkill) and does not use the update formula of the
profile, so that evaluating the formula against the true mastery is meaningful.

Usage (repository root): python data/learner_sim/generate_logs.py [--learners 60] [--weeks 8] [--seed 20261101]
Writes interaction_logs.csv and true_mastery.csv next to this script. The same seed gives the same files.
"""
import argparse
import csv
import random
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
START = datetime(2026, 9, 7, tzinfo=timezone.utc)

ATTEMPTS_PER_WEEK = 2
DRILLS_PER_WEEK = 3
P_TRUE_ERROR = 0.8  # probability of a true error is P_TRUE_ERROR * (1 - mastery)
P_DETECT = 0.7  # the AI finds a true error
P_FALSE_ALARM = 0.05  # the AI reports an error that is not there
DRILL_QUESTIONS = 6
DRILL_GUESS = 0.25
DRILL_GAIN = 0.03  # true mastery grows after a drill of the SubSkill


def read_kg():
    """SubSkills per graded skill (via Criterion) and SubSkills that have a practice drill."""
    crit_skill = {}
    with open(ROOT / "kg/data/nodes.csv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if row["label"] == "Criterion":
                crit_skill[row["id"]] = row["skill"]
    by_skill = defaultdict(set)
    drillable = set()
    with open(ROOT / "kg/data/relationships.csv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if row["type"] == "HAS_SUBSKILL":
                by_skill[crit_skill[row["from_id"]]].add(row["to_id"])
            elif row["type"] == "PRACTICES":
                drillable.add(row["to_id"])
    return {k: sorted(v) for k, v in by_skill.items()}, sorted(drillable)


def clip(x, lo=0.02, hi=0.98):
    return max(lo, min(hi, x))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--learners", type=int, default=60)
    ap.add_argument("--weeks", type=int, default=8)
    ap.add_argument("--seed", type=int, default=20261101)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    by_skill, drillable = read_kg()
    all_subskills = sorted({s for v in by_skill.values() for s in v} | set(drillable))

    events = []
    truth = []
    for u in range(1, args.learners + 1):
        uid = f"sim_user_{u:03d}"
        ability = rng.gauss(0, 0.12)
        theta = {s: clip(rng.betavariate(4, 4) + ability) for s in all_subskills}
        for s in all_subskills:
            truth.append((uid, 0, s, theta[s]))
        n_attempt = n_drill = 0
        for week in range(args.weeks):
            week_events = []
            for _ in range(ATTEMPTS_PER_WEEK):
                n_attempt += 1
                skill = "SKILL_W" if rng.random() < 0.6 else "SKILL_S"
                when = START + timedelta(weeks=week, days=rng.random() * 7)
                src = f"{uid}_attempt_{n_attempt:03d}"
                for s in by_skill[skill]:
                    true_error = rng.random() < P_TRUE_ERROR * (1 - theta[s])
                    reported = rng.random() < (P_DETECT if true_error else P_FALSE_ALARM)
                    week_events.append((when, uid, s, "ERROR" if reported else "CLEAN", 0.0 if reported else 1.0, src))
            for _ in range(DRILLS_PER_WEEK):
                n_drill += 1
                weights = [1 - theta[s] + 0.05 for s in drillable]
                s = rng.choices(drillable, weights)[0]
                when = START + timedelta(weeks=week, days=rng.random() * 7)
                p = DRILL_GUESS + (1 - DRILL_GUESS) * theta[s]
                correct = sum(rng.random() < p for _ in range(DRILL_QUESTIONS))
                week_events.append((when, uid, s, "DRILL", round(correct / DRILL_QUESTIONS, 4), f"{uid}_drill_{n_drill:03d}"))
            # the hidden mastery grows after the drills of the week; the week snapshot is taken at the week end
            for ev in sorted(week_events, key=lambda e: e[0]):
                if ev[3] == "DRILL":
                    theta[ev[2]] = clip(theta[ev[2]] + DRILL_GAIN * (1 - theta[ev[2]]))
            events.extend(week_events)
            for s in all_subskills:
                truth.append((uid, week + 1, s, theta[s]))

    events.sort(key=lambda e: (e[1], e[0]))
    with open(OUT / "interaction_logs.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["user_id", "time", "subskill_id", "event_type", "outcome", "source_id"])
        for when, uid, s, kind, outcome, src in events:
            w.writerow([uid, when.strftime("%Y-%m-%dT%H:%M:%SZ"), s, kind, outcome, src])
    with open(OUT / "true_mastery.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["user_id", "week", "subskill_id", "true_mastery"])
        for uid, week, s, th in truth:
            w.writerow([uid, week, s, round(th, 4)])
    print(f"{args.learners} learners, {len(events)} events, {len(truth)} true-mastery rows (seed {args.seed})")


if __name__ == "__main__":
    main()
