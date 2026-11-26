"""Pronunciation scores of the system (Gemini estimate, ai/asr_service/pronunciation.py) against human experts.

Data: speechocean762 test split (Apache-2.0, 5 expert raters, scores 0-10 per sentence: accuracy, fluency, prosodic,
total). Read sentences, Mandarin L1 speakers. Sample: adults (age >= 16), stratified by the human total score
(levels 3-9, 7 sentences each, at most one sentence per speaker, fixed seed). The prompt of the scorer is NOT
changed for this run.

    GEMINI_API_KEY=... python eval_pron_speechocean.py --parquet <speechocean762 test parquet>
Needs pyarrow, pandas, numpy, soundfile, httpx. Writes pron_speechocean.csv (no audio, no sentence text).
"""
import argparse
import csv
import io
import random
import sys
import time
from pathlib import Path

import numpy as np
import pyarrow.parquet as pq
import soundfile as sf

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "ai" / "asr_service"))
from pronunciation import PronConfig, PronunciationError, gemini_assess  # noqa: E402

SEED = 9
LEVELS = range(3, 10)
PER_LEVEL = 7


def sample(table):
    rng = random.Random(SEED)
    adults = table[table.age >= 16]
    picked, speakers = [], set()
    for level in LEVELS:
        rows = adults[adults.total == level].index.tolist()
        rng.shuffle(rows)
        n = 0
        for i in rows:
            if n == PER_LEVEL:
                break
            if adults.loc[i, "speaker"] in speakers:
                continue
            speakers.add(adults.loc[i, "speaker"])
            picked.append(i)
            n += 1
    return picked


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parquet", required=True)
    ap.add_argument("--out", default=str(HERE / "pron_speechocean.csv"))
    args = ap.parse_args()

    table = pq.read_table(args.parquet).to_pandas()
    config = PronConfig.from_env({**__import__("os").environ, "PRON_ENABLED": "true"})
    if config.status() != "enabled":
        sys.exit("GEMINI_API_KEY is not set")

    rows = []
    for i in sample(table):
        r = table.loc[i]
        samples, rate = sf.read(io.BytesIO(r["audio"]["bytes"]), dtype="float32")
        if samples.ndim > 1:
            samples = samples.mean(axis=1)
        assert rate == 16000, rate
        scores, error = None, ""
        for attempt in range(5):
            try:
                scores = gemini_assess(config, samples)
                error = ""
                break
            except PronunciationError as exc:
                error = str(exc)[:80]
                time.sleep(20 if ("429" in error or "503" in error) else 3)
        rows.append({
            "utt": Path(r["audio"]["path"]).stem, "speaker": r["speaker"], "age": int(r["age"]),
            "seconds": round(len(samples) / 16000, 1),
            "human_accuracy": int(r["accuracy"]), "human_fluency": int(r["fluency"]),
            "human_prosodic": int(r["prosodic"]), "human_total": int(r["total"]),
            "ai_accuracy": (scores or {}).get("accuracy", ""), "ai_fluency": (scores or {}).get("fluency", ""),
            "ai_prosody": (scores or {}).get("prosody", ""), "error": error,
        })
        print(rows[-1]["utt"], rows[-1]["human_total"], scores, error, flush=True)
        time.sleep(2)

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(len(rows), "sentences,", sum(1 for r in rows if r["ai_accuracy"] == ""), "without a score")


if __name__ == "__main__":
    main()
