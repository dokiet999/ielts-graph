"""Agreement between the AI grader and human scores, before and after calibration. Writes metrics.csv, errors.csv
and calibration.json from results/writing.jsonl, results/speaking.jsonl and pron_speechocean.csv. Standard library only.

Rules (fixed before looking at the held-out numbers):
- Calibration is fitted on the calibration split only and applied unchanged to the held-out split.
  Two calibrations: "offset" (subtract the mean error) and "linear" (least squares human = a * AI + b).
  Calibrated bands are rounded to the nearest 0.5 and kept in [0, 9].
- Writing: human = reference band of writing_v1 (4 criteria and overall). QWK on half-band classes (overall)
  or whole bands (criteria).
- Speaking: human = Speak & Improve Part 3 mark (0-6, about CEFR: 3 = B1, 4 = B2, 5 = C1). The AI band is put on the
  same scale with the CEFR comparison of Cambridge (IELTS 4.0-5.0 = B1, 5.5-6.5 = B2, 7.0-8.0 = C1), taking the
  middle of each range: mark = (band - 4.5) / 1.5 + 3. Errors are also given in IELTS-band units (x 1.5).
  QWK on 0.5-step classes of the mark scale.
- Pronunciation: speechocean762 expert scores (0-10, x 10) against the Gemini scores (0-100).
- Large error: |AI - human| >= 1 IELTS band (Writing overall, Speaking after conversion).
"""
import csv
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
CRIT_W = ["CRIT_W_TR", "CRIT_W_CC", "CRIT_W_LR", "CRIT_W_GRA"]


def load_jsonl(name):
    path = HERE / "results" / name
    return [json.loads(l) for l in open(path, encoding="utf-8")] if path.exists() else []


def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")


def ranks(xs):
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    r = [0.0] * len(xs)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        for k in range(i, j + 1):
            r[order[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def pearson(a, b):
    if len(a) < 3:
        return float("nan")
    ma, mb = mean(a), mean(b)
    sa = math.sqrt(sum((x - ma) ** 2 for x in a))
    sb = math.sqrt(sum((y - mb) ** 2 for y in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb) if sa and sb else float("nan")


def spearman(a, b):
    return pearson(ranks(a), ranks(b))


def qwk(a, b):
    """Quadratic weighted kappa of two lists of integer classes."""
    lo, hi = min(a + b), max(a + b)
    n = hi - lo + 1
    if n < 2:
        return float("nan")
    obs = [[0] * n for _ in range(n)]
    for x, y in zip(a, b):
        obs[x - lo][y - lo] += 1
    ha = [sum(row) for row in obs]
    hb = [sum(obs[i][j] for i in range(n)) for j in range(n)]
    total = len(a)
    num = den = 0.0
    for i in range(n):
        for j in range(n):
            w = (i - j) ** 2 / (n - 1) ** 2
            num += w * obs[i][j]
            den += w * ha[i] * hb[j] / total
    return 1 - num / den if den else float("nan")


def half(x):
    return min(9.0, max(0.0, math.floor(x * 2 + 0.5) / 2))


def fit(ai, human):
    offset = mean([h - a for a, h in zip(ai, human)])
    ma, mh = mean(ai), mean(human)
    var = sum((a - ma) ** 2 for a in ai)
    slope = sum((a - ma) * (h - mh) for a, h in zip(ai, human)) / var if var else 1.0
    return {"offset": round(offset, 4), "linear": {"a": round(slope, 4), "b": round(mh - slope * ma, 4)}}


def apply(cal, kind, x):
    if kind == "raw":
        return x
    if kind == "offset":
        return half(x + cal["offset"])
    return half(cal["linear"]["a"] * x + cal["linear"]["b"])


def stats(ai, human, classes, unit=1.0, within=0.5):
    """ai and human on the same scale; classes(x) gives the integer class for QWK; unit converts errors to bands."""
    err = [(a - h) * unit for a, h in zip(ai, human)]
    return {
        "n": len(ai),
        "mae_band": round(mean([abs(e) for e in err]), 3),
        "bias_band": round(mean(err), 3),
        "within_0.5": round(mean([abs(e) <= within + 1e-9 for e in err]), 3),
        "within_1.0": round(mean([abs(e) <= 1.0 + 1e-9 for e in err]), 3),
        "qwk": round(qwk([classes(a) for a in ai], [classes(h) for h in human]), 3),
        "spearman": round(spearman(ai, human), 3),
    }


def writing(rows, out, errors, cal_out):
    ok = [r for r in rows if r.get("ai_overall") is not None]
    calib = [r for r in ok if r["split"] == "calibration"]
    cal = fit([r["ai_overall"] for r in calib], [r["human"]["overall"] for r in calib])
    cal_out["writing_overall"] = cal
    for split in ("calibration", "heldout"):
        part = [r for r in ok if r["split"] == split]
        for kind in ("raw", "offset", "linear"):
            ai = [apply(cal, kind, r["ai_overall"]) for r in part]
            out.append({"skill": "writing", "target": "overall", "split": split, "calibration": kind,
                        **stats(ai, [r["human"]["overall"] for r in part], lambda x: round(x * 2))})
        for c in CRIT_W:
            pairs = [(r["ai_criteria"].get(c), r["human"][c]) for r in part if r["ai_criteria"].get(c) is not None]
            out.append({"skill": "writing", "target": c, "split": split, "calibration": "raw",
                        **stats([p[0] for p in pairs], [p[1] for p in pairs], round, within=0.0)})
    for r in ok:
        diff = r["ai_overall"] - r["human"]["overall"]
        if abs(diff) >= 1.0:
            worst = max(CRIT_W, key=lambda c: abs((r["ai_criteria"].get(c) or 0) - r["human"][c]))
            errors.append({"skill": "writing", "id": r["id"], "split": r["split"], "human": r["human"]["overall"],
                           "ai": r["ai_overall"], "diff_band": diff, "kind": kind_of(diff, r["human"]["overall"]),
                           "largest_criterion_gap": worst, "word_count": r["word_count"], "task": r["task"],
                           "duration_sec": "", "speech_rate_wpm": ""})


def to_mark(band):
    return (band - 4.5) / 1.5 + 3


def to_band(mark):
    return (mark - 3) * 1.5 + 4.5


def kind_of(diff, human_band):
    if diff < 0:
        return "under-scored, high band" if human_band >= 7 else "under-scored"
    return "over-scored, low band" if human_band <= 5 else "over-scored"


def speaking(rows, out, errors, cal_out):
    ok = [r for r in rows if r.get("ai_overall") is not None]
    calib = [r for r in ok if r["split"] == "calibration"]
    # Calibration in band units: AI band -> IELTS band equivalent of the human mark
    cal = fit([r["ai_overall"] for r in calib], [to_band(r["human_p3"]) for r in calib])
    cal_out["speaking_overall"] = cal
    classes = lambda m: round(m * 2)
    for split in ("calibration", "heldout"):
        part = [r for r in ok if r["split"] == split]
        human = [r["human_p3"] for r in part]
        for kind in ("raw", "offset", "linear"):
            ai = [to_mark(apply(cal, kind, r["ai_overall"])) for r in part]
            out.append({"skill": "speaking", "target": "overall vs P3 mark", "split": split, "calibration": kind,
                        **stats(ai, human, classes, unit=1.5, within=0.5)})
        for c in ("CRIT_S_FC", "CRIT_S_LR", "CRIT_S_GRA", "CRIT_S_P"):
            ai = [r["ai_criteria"].get(c) for r in part]
            pairs = [(a, h) for a, h in zip(ai, human) if a is not None]
            out.append({"skill": "speaking", "target": f"{c} vs P3 mark (rank only)", "split": split,
                        "calibration": "raw", "n": len(pairs),
                        "spearman": round(spearman([p[0] for p in pairs], [p[1] for p in pairs]), 3)})
        for k in ("accuracy", "fluency", "prosody"):
            pairs = [((r.get("pronunciation") or {}).get(k), r["human_p3"]) for r in part]
            pairs = [p for p in pairs if p[0] is not None]
            out.append({"skill": "speaking", "target": f"pronunciation {k} vs P3 mark (rank only)", "split": split,
                        "calibration": "raw", "n": len(pairs),
                        "spearman": round(spearman([p[0] for p in pairs], [p[1] for p in pairs]), 3)})
    for r in ok:
        diff = r["ai_overall"] - to_band(r["human_p3"])
        if abs(diff) >= 1.0:
            worst = max(("CRIT_S_FC", "CRIT_S_LR", "CRIT_S_GRA", "CRIT_S_P"),
                        key=lambda c: abs((r["ai_criteria"].get(c) or 0) - to_band(r["human_p3"])))
            errors.append({"skill": "speaking", "id": r["id"], "split": r["split"],
                           "human": round(to_band(r["human_p3"]), 2), "ai": r["ai_overall"], "diff_band": round(diff, 2),
                           "kind": kind_of(diff, to_band(r["human_p3"])), "largest_criterion_gap": worst,
                           "word_count": r.get("word_count"), "task": "S&I P3",
                           "duration_sec": r.get("duration_sec"), "speech_rate_wpm": r.get("speech_rate_wpm")})


def pron(out):
    path = HERE / "pron_speechocean.csv"
    if not path.exists():
        return
    rows = [r for r in csv.DictReader(open(path, encoding="utf-8")) if r["ai_accuracy"] != ""]
    for ai_key, human_key in (("ai_accuracy", "human_accuracy"), ("ai_fluency", "human_fluency"),
                              ("ai_prosody", "human_prosodic")):
        pairs = [(float(r[ai_key]), float(r[human_key]) * 10) for r in rows if r[ai_key] != ""]
        ai, human = [p[0] for p in pairs], [p[1] for p in pairs]
        out.append({"skill": "pronunciation", "target": f"{ai_key} vs expert {human_key} (0-100)",
                    "split": "heldout", "calibration": "raw", "n": len(pairs),
                    "mae_band": round(mean([abs(a - h) for a, h in pairs]), 2),
                    "bias_band": round(mean([a - h for a, h in pairs]), 2),
                    "spearman": round(spearman(ai, human), 3), "pearson": round(pearson(ai, human), 3)})


def main():
    out, errors, cal = [], [], {}
    writing(load_jsonl("writing.jsonl"), out, errors, cal)
    sp = load_jsonl("speaking.jsonl")
    if sp:
        speaking(sp, out, errors, cal)
    pron(out)
    fields = ["skill", "target", "split", "calibration", "n", "mae_band", "bias_band", "within_0.5", "within_1.0",
              "qwk", "spearman", "pearson"]
    with open(HERE / "metrics.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(out)
    with open(HERE / "errors.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(errors[0]) if errors else ["id"])
        w.writeheader()
        w.writerows(errors)
    (HERE / "calibration.json").write_text(json.dumps(cal, indent=2) + "\n", encoding="utf-8")
    for r in out:
        print({k: v for k, v in r.items() if v not in ("", None)})
    print(len(errors), "large errors")


if __name__ == "__main__":
    main()
