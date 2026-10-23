"""Measure WER of the running ASR service on a set of audio files with hand-typed references.

Layout: <audio-dir>/<id>.<wav|mp3|m4a|ogg|webm|...> and <ref-dir>/<id>.txt (reference transcript).
Usage:  python eval_wer.py --audio-dir DIR --ref-dir DIR --out-prefix PATH
Writes <out-prefix>.csv and <out-prefix>.json. The service must be running (default http://127.0.0.1:8000).

Normalisation (applied to BOTH reference and hypothesis):
  lowercase; curly apostrophes -> '; hyphens/slashes -> space; thousands commas removed;
  integers -> English words (num2words); every other punctuation removed (apostrophes inside words kept);
  fillers {um, uh, er, erm, ah, hmm, mm, mhm} removed; whitespace collapsed.
"""
import argparse
import csv
import json
import re
from pathlib import Path

import httpx
import jiwer
from num2words import num2words

FILLERS = {"um", "uh", "er", "erm", "ah", "hmm", "mm", "mhm"}
AUDIO_EXT = {".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac", ".opus"}


def normalize(text: str) -> str:
    t = text.lower().replace("’", "'").replace("‘", "'")
    t = re.sub(r"(?<=\d),(?=\d{3})", "", t)
    t = re.sub(r"[-/]", " ", t)
    t = re.sub(r"\d+", lambda m: " " + num2words(int(m.group())).replace("-", " ").replace(",", "") + " ", t)
    t = re.sub(r"[^a-z' ]", " ", t)
    t = re.sub(r"(?<![a-z])'|'(?![a-z])", " ", t)
    return " ".join(w for w in t.split() if w not in FILLERS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio-dir", required=True, type=Path)
    ap.add_argument("--ref-dir", required=True, type=Path)
    ap.add_argument("--out-prefix", required=True, type=Path)
    ap.add_argument("--url", default="http://127.0.0.1:8000")
    args = ap.parse_args()

    rows = []
    with httpx.Client(timeout=900) as client:
        for audio in sorted(p for p in args.audio_dir.iterdir() if p.suffix.lower() in AUDIO_EXT):
            ref_file = args.ref_dir / f"{audio.stem}.txt"
            if not ref_file.exists():
                print(f"SKIP {audio.name}: no reference")
                continue
            r = client.post(f"{args.url}/transcribe", files={"audio": (audio.name, audio.read_bytes())})
            if r.status_code != 200:
                print(f"FAIL {audio.name}: {r.status_code} {r.text}")
                continue
            body = r.json()
            ref, hyp = normalize(ref_file.read_text(encoding="utf-8")), normalize(body["transcript"])
            o = jiwer.process_words(ref, hyp)
            n = len(ref.split())
            rows.append({
                "id": audio.stem, "reference": ref, "hypothesis": hyp,
                "wer": round((o.substitutions + o.deletions + o.insertions) / n, 4) if n else None,
                "ref_words": n, "substitutions": o.substitutions, "deletions": o.deletions, "insertions": o.insertions,
                "duration_sec": body["features"]["duration_sec"],
                "processing_sec": float(r.headers["x-processing-sec"]),
                "asr_model": body["asr_model"],
            })
            print(f"{audio.stem}: WER={rows[-1]['wer']} ({n} words)")

    scored = [r for r in rows if r["wer"] is not None]
    tot = lambda k: sum(r[k] for r in scored)
    summary = {
        "samples": len(scored),
        "asr_model": rows[0]["asr_model"] if rows else None,
        "mean_wer": round(sum(r["wer"] for r in scored) / len(scored), 4) if scored else None,
        "micro_wer": round((tot("substitutions") + tot("deletions") + tot("insertions")) / tot("ref_words"), 4) if scored else None,
        "total_ref_words": tot("ref_words"),
        "total_substitutions": tot("substitutions"), "total_deletions": tot("deletions"), "total_insertions": tot("insertions"),
        "mean_processing_sec": round(tot("processing_sec") / len(scored), 2) if scored else None,
        "mean_duration_sec": round(tot("duration_sec") / len(scored), 2) if scored else None,
    }
    args.out_prefix.parent.mkdir(parents=True, exist_ok=True)
    with open(f"{args.out_prefix}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    Path(f"{args.out_prefix}.json").write_text(json.dumps({"summary": summary, "samples": rows}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
