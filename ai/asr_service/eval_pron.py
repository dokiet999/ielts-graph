"""Compare pronunciation scores (Gemini estimate) with the reference Pronunciation band of Speaking set v1.

Two modes:

1. Evaluation (default): sends every audio of the manifest to the RUNNING ASR service (started with
   PRON_ENABLED=true and the provider key), reads the "pronunciation" object of each response and joins it with
   reference_criteria.CRIT_S_P of data/speaking_v1/references.json.
       python eval_pron.py --out-prefix results/pron_speaking_v1
       python eval_pron.py --repeat 3 --out-prefix results/pron_speaking_v1_r3   # also measures stability
   Writes <out-prefix>.csv (one row per sample and run) and <out-prefix>.json (summary per split).
   With --repeat N each file is scored N times: an AI estimate can change between identical calls, and the
   summary reports by how much (mean absolute difference between runs).

2. Raw probe: calls the configured provider directly (no service, no Whisper) on ONE file and prints its raw
   answer, to see exactly what it returns.
       python eval_pron.py --raw ../../data/speaking_v1/audio/sp_01_p2.wav
   Reads the same environment variables as the service (PRON_PROVIDER, GEMINI_API_KEY).

Limits to keep in mind when reading the numbers: the reference band is the band of the WHOLE test given by the
source (the 3 Parts of one speaker share it), there are only 7 speakers, and the bands are 6-9 only. The result
shows a trend, it is not enough to set band thresholds.
"""
import argparse
import csv
import itertools
import json
import sys
from pathlib import Path

import numpy as np

DATA = Path(__file__).parents[2] / "data" / "speaking_v1"
SCORES = ("accuracy", "fluency", "prosody", "completeness")


def pearson(xs, ys):
    pairs = [(x, y) for x, y in zip(xs, ys) if x is not None and y is not None]
    if len(pairs) < 3:
        return None
    a, b = np.array(pairs, dtype=float).T
    if a.std() == 0 or b.std() == 0:
        return None
    return round(float(np.corrcoef(a, b)[0, 1]), 3)


def run_stability(rows):
    """Mean absolute difference of each score between runs of the same file (None with a single run)."""
    by_id = {}
    for r in rows:
        by_id.setdefault(r["id"], []).append(r)
    result = {}
    for k in SCORES:
        diffs = [abs(a[k] - b[k]) for runs in by_id.values() for a, b in itertools.combinations(runs, 2)
                 if a[k] is not None and b[k] is not None]
        result[k] = round(float(np.mean(diffs)), 2) if diffs else None
    return result


def summarize(rows):
    first = [r for r in rows if r["run"] == 1]
    labelled = [r for r in first if r["reference_band"] is not None]
    by_band = {}
    for r in labelled:
        by_band.setdefault(r["reference_band"], []).append(r)

    def mean(rs, k):
        values = [r[k] for r in rs if r[k] is not None]
        return round(float(np.mean(values)), 1) if values else None

    return {
        "samples": len(first),
        "with_scores": sum(r["accuracy"] is not None for r in first),
        "speakers": len({r["speaker_id"] for r in first}),
        "sources": sorted({r["source"] for r in first if r["source"]}),
        "pearson_vs_reference_band": {k: pearson([r[k] for r in labelled], [r["reference_band"] for r in labelled])
                                      for k in SCORES},
        "mean_scores_by_reference_band": {str(band): {k: mean(rs, k) for k in SCORES} | {"n": len(rs)}
                                          for band, rs in sorted(by_band.items())},
        "runs_per_file": max((r["run"] for r in rows), default=0),
        "mean_abs_diff_between_runs": run_stability(rows),
    }


def evaluate(args):
    import httpx

    refs = {r["id"]: r for r in json.loads((args.data_dir / "references.json").read_text(encoding="utf-8"))}
    with open(args.data_dir / "manifest.csv", encoding="utf-8") as f:
        manifest = list(csv.DictReader(f))

    rows = []
    with httpx.Client(timeout=900) as client:
        health = client.get(f"{args.url}/health").json()
        if health.get("pronunciation") != "enabled":
            sys.exit(f"The service reports pronunciation={health.get('pronunciation')!r}: start it with "
                     "PRON_ENABLED=true and the provider key (see README.md).")
        for m in manifest:
            audio = args.data_dir / "audio" / m["audio_file"]
            if not audio.exists():
                print(f"SKIP {m['id']}: {audio.name} not found (audio is shared via Drive)")
                continue
            band = (refs.get(m["id"], {}).get("reference_criteria") or {}).get("CRIT_S_P")
            for run in range(1, args.repeat + 1):
                r = client.post(f"{args.url}/transcribe", files={"audio": (audio.name, audio.read_bytes())})
                if r.status_code != 200:
                    print(f"FAIL {m['id']} run {run}: {r.status_code} {r.text}")
                    continue
                pron = r.json()["pronunciation"] or {}
                rows.append({
                    "id": m["id"], "run": run, "part": m["part"], "split": m["split"], "speaker_id": m["speaker_id"],
                    "duration_sec": float(m["duration_sec"]), "reference_band": band,
                    **{k: pron.get(k) for k in SCORES}, "source": pron.get("source"),
                    "pronunciation_sec": float(r.headers.get("x-pronunciation-sec", 0)),
                    "whisper_sec": float(r.headers.get("x-processing-sec", 0)),
                })
                print(f"{m['id']} run {run}: band={band} accuracy={pron.get('accuracy')} "
                      f"fluency={pron.get('fluency')} prosody={pron.get('prosody')} "
                      f"({rows[-1]['pronunciation_sec']:.1f}s)")

    if not rows:
        sys.exit("No sample was scored.")
    args.out_prefix.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out_prefix.with_suffix(".csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    summary = {split: summarize([r for r in rows if r["split"] == split]) for split in ("dev", "test")}
    summary["all"] = summarize(rows)
    summary["note"] = ("reference_band is the whole-test Pronunciation band of the source, shared by the 3 Parts "
                       "of a speaker; 7 speakers, bands 6-9 only: a trend, not a calibration. Correlations use "
                       "run 1 only.")
    args.out_prefix.with_suffix(".json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(summary["all"], indent=2))


def probe(path: Path):
    from faster_whisper import decode_audio

    from pronunciation import PronConfig, PronunciationError, gemini_assess

    config = PronConfig.from_env()
    if config.provider == "gemini" and not config.gemini_key:
        sys.exit("Set GEMINI_API_KEY first.")
    if config.provider != "gemini":
        sys.exit(f"Unknown PRON_PROVIDER {config.provider!r}.")
    if not path.exists():
        sys.exit(f"Audio file not found: {path}")

    samples = decode_audio(str(path), sampling_rate=16000)
    raw = []
    try:
        result = gemini_assess(config, samples, raw_sink=raw)
    except PronunciationError as exc:
        result = f"ERROR {exc}"
    print(f"provider: {config.describe()}, audio: {len(samples) / 16000:.1f} s")
    for i, item in enumerate(raw, 1):
        print(f"--- raw answer {i} ---")
        try:
            print(json.dumps(json.loads(item), indent=2, ensure_ascii=False))
        except (TypeError, ValueError):
            print(item)
    print(f"=== parsed: {result}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", type=Path, help="probe the configured provider directly on one audio file")
    ap.add_argument("--repeat", type=int, default=1, help="score each file N times to measure stability")
    ap.add_argument("--data-dir", type=Path, default=DATA)
    ap.add_argument("--out-prefix", type=Path, default=Path(__file__).parent / "results" / "pron_speaking_v1")
    ap.add_argument("--url", default="http://127.0.0.1:8000")
    args = ap.parse_args()
    if args.repeat < 1:
        ap.error("--repeat must be at least 1")
    probe(args.raw) if args.raw else evaluate(args)


if __name__ == "__main__":
    main()
