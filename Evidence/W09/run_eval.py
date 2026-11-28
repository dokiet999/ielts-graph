"""Grades the W9 calibration sets with the running system and writes results/writing.jsonl and results/speaking.jsonl.

Same path as a learner: HTTP submit -> backend -> Gemini grader (Writing), or -> ASR service (Whisper + pronunciation)
-> Gemini grader (Speaking). Prompts and rubrics are the ones in the repo (writing-v1.2, speaking-v1.2), not changed
for this run.

    python run_eval.py sql > eval_exercises.sql          # exercises that carry the prompts of the sets
    python run_eval.py writing --base http://localhost:8081
    WAV_DIR=<dir> SANDI_DIR=<corpus> python run_eval.py speaking --base http://localhost:8081
Speaking audio (FLAC) is converted to 16 kHz mono WAV with ffmpeg into WAV_DIR (outside the repo: the corpus
licence does not allow redistribution). Results keep ids, scores and error codes, never the essay, the audio or
the transcript.
"""
import argparse
import base64
import csv
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ESSAYS = ROOT / "data" / "writing_v1" / "essays.json"
SAMPLE = HERE / "speaking_sample.csv"
LEARNER, PASSWORD = "student_enrolled", "Demo@123"
MIN_GAP_SEC = 10  # Gemini key limits: 15 requests and 250K tokens per minute, 500 requests per day
MAX_SUBMITS = 60  # per run, changed with --max-submits
SPEAKING_PART = "QT_S_PART3"  # S&I Part 3: 60 s opinion answer with reasons; IELTS Part 2 expects 1-2 min


def writing_exercise_id(i):
    return f"49000000-0000-0000-0000-{i:012d}"


def speaking_exercise_id(i):
    return f"49000000-0000-0000-0001-{i:012d}"


def sql_text(s):
    return "'" + s.replace("'", "''") + "'"


def questions():
    rows = list(csv.DictReader(open(SAMPLE, encoding="utf-8")))
    return rows, sorted({r["question"] for r in rows})


def make_sql():
    essays = json.loads(ESSAYS.read_text(encoding="utf-8"))
    out = ["-- W9 evaluation exercises (temporary database only, not a migration)",
           "INSERT INTO exercises (id, lesson_id, title, instruction, exercise_type, skill_type, time_limit, "
           "max_attempts, ordering, content) VALUES"]
    values = []
    for i, e in enumerate(essays, 1):
        instruction = ("You should spend about 40 minutes on this task. Write about the following topic: "
                       f"{e['prompt']} Write at least 250 words.")
        values.append(f"({sql_text(writing_exercise_id(i))}, NULL, {sql_text('W9 eval ' + e['id'])}, "
                      f"{sql_text(instruction)}, 'PRACTICE', 'WRITING', 2400, 0, {900 + i}, "
                      f"{sql_text(json.dumps({'task': e['task']}))}::jsonb)")
    _, qs = questions()
    for i, q in enumerate(qs, 1):
        values.append(f"({sql_text(speaking_exercise_id(i))}, NULL, {sql_text(f'W9 eval speaking {i}')}, "
                      f"{sql_text(q)}, 'PRACTICE', 'SPEAKING', 120, 0, {950 + i}, "
                      f"{sql_text(json.dumps({'part': SPEAKING_PART, 'prompt': q}))}::jsonb)")
    out.append(",\n".join(values) + ";")
    print("\n".join(out))


class Client:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.auth = "Basic " + base64.b64encode(f"{LEARNER}:{PASSWORD}".encode()).decode()
        self.last = 0.0
        self.submits = 0
        self.max_submits = MAX_SUBMITS

    def call(self, path, body, headers, timeout=300):
        req = urllib.request.Request(self.base + path, data=body, method="POST")
        req.add_header("Authorization", self.auth)
        for k, v in headers.items():
            req.add_header(k, v)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e:
            raw = e.read()
            try:
                return e.code, json.loads(raw)
            except ValueError:
                return e.code, {"raw": raw.decode("utf-8", "replace")[:300]}
        except (urllib.error.URLError, TimeoutError) as e:
            return 599, {"raw": type(e).__name__}

    def submit(self, path, body, headers):
        """One try per item and pass: a failed item (Gemini 429/503) is left for the next pass, so an overloaded
        model does not burn the daily quota (500 requests). At most one submission every MIN_GAP_SEC (a Speaking
        submission makes 2 Gemini calls), and at most max_submits submissions per run."""
        if self.submits >= self.max_submits:
            return 0, {"raw": "request budget of this run used up"}
        wait = self.last + MIN_GAP_SEC - time.time()
        if wait > 0:
            time.sleep(wait)
        self.submits += 1
        status, payload = self.call(path, body, headers)
        self.last = time.time() + (30 if status in (429, 502, 503, 504, 599) else 0)  # back off after a failure
        return status, payload


def summary(payload):
    d = payload.get("data", {})
    raw = d.get("rawFeedback") or {}
    crit = raw.get("criteria") or {}
    return {
        "ai_overall": d.get("overallBand"),
        "ai_criteria": {k: v.get("band") for k, v in crit.items()},
        "error_codes": [e.get("error_type") for c in crit.values() for e in (c.get("evidence") or [])
                        if isinstance(e, dict) and e.get("error_type")],
        "out_of_calibration": d.get("outOfCalibrationRange"),
        "model": d.get("aiModel"), "prompt_version": d.get("aiPromptVersion"), "latency_ms": d.get("aiLatencyMs"),
    }


def run_items(name, items, grade):
    """Grades every item once. Rows already graded (HTTP 200) are kept, so a rerun only retries the failed ones."""
    out = HERE / "results" / name
    out.parent.mkdir(exist_ok=True)
    done = {}
    if out.exists():
        for line in open(out, encoding="utf-8"):
            row = json.loads(line)
            if row.get("http") == 200:
                done[row["id"]] = row
    rows = []
    for item_id, item in items:
        row = done.get(item_id) or grade(item)
        rows.append(row)
        if item_id not in done:
            print(item_id, row["split"], row["http"], row.get("ai_overall"), flush=True)
        later = [done[i] for i, _ in items[len(rows):] if i in done]  # keep them if the run stops here
        with open(out, "w", encoding="utf-8") as f:
            f.writelines(json.dumps(r, ensure_ascii=False) + "\n" for r in rows + later)
    graded = sum(r["http"] == 200 for r in rows)
    print(name, graded, "/", len(rows), "graded", flush=True)
    return len(rows) - graded


def run_writing(client):
    essays = json.loads(ESSAYS.read_text(encoding="utf-8"))

    def grade(pair):
        i, e = pair
        body = json.dumps({"essayText": e["essay"], "timeSpent": 2400}).encode()
        status, payload = client.submit(f"/api/exercises/{writing_exercise_id(i)}/submit/writing", body,
                                        {"Content-Type": "application/json"})
        row = {"id": e["id"], "split": "calibration" if e["split"] == "dev" else "heldout", "task": e["task"],
               "word_count": e["word_count"], "human": e["reference_bands"], "http": status}
        row.update(summary(payload) if status == 200 else {"error": payload})
        return row

    return run_items("writing.jsonl", [(e["id"], (i, e)) for i, e in enumerate(essays, 1)], grade)


def to_wav(src, dst):
    if not dst.exists():
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-ac", "1", "-ar", "16000", str(dst)],
                       check=True)
    return dst


def run_speaking(client):
    corpus, wav_dir = Path(os.environ["SANDI_DIR"]), Path(os.environ["WAV_DIR"])
    wav_dir.mkdir(parents=True, exist_ok=True)
    rows, qs = questions()

    def grade(r):
        wav = to_wav(corpus / r["audio"], wav_dir / (r["file_id"] + ".wav"))
        boundary = uuid.uuid4().hex
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="timeSpent"\r\n\r\n60\r\n'
                f'--{boundary}\r\nContent-Disposition: form-data; name="audio"; filename="{wav.name}"\r\n'
                f'Content-Type: audio/wav\r\n\r\n').encode() + wav.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
        ex = speaking_exercise_id(qs.index(r["question"]) + 1)
        status, payload = client.submit(f"/api/exercises/{ex}/submit/speaking", body,
                                        {"Content-Type": f"multipart/form-data; boundary={boundary}"})
        row = {"id": r["file_id"], "split": r["split"], "human_p3": float(r["human_p3"]),
               "human_overall": float(r["human_overall"]) if r["human_overall"] else None, "http": status}
        if status == 200:
            d = payload.get("data", {})
            feats = d.get("features") or {}
            pick = lambda snake, camel: feats.get(snake, feats.get(camel))
            row.update(summary(payload))
            row.update({"pronunciation": d.get("pronunciation"),
                        "duration_sec": pick("duration_sec", "durationSec"),
                        "word_count": pick("word_count", "wordCount"),
                        "speech_rate_wpm": pick("speech_rate_wpm", "speechRateWpm")})
        else:
            row["error"] = payload
        return row

    return run_items("speaking.jsonl", [(r["file_id"], r) for r in rows], grade)


def main():
    global MAX_SUBMITS
    ap = argparse.ArgumentParser()
    ap.add_argument("what", choices=["sql", "writing", "speaking"])
    ap.add_argument("--base", default="http://localhost:8081")
    ap.add_argument("--max-submits", type=int, default=MAX_SUBMITS, help="request budget of this run")
    ap.add_argument("--passes", type=int, default=4, help="passes over the items not graded yet")
    args = ap.parse_args()
    if args.what == "sql":
        make_sql()
        return
    MAX_SUBMITS = args.max_submits
    client = Client(args.base)
    run = run_writing if args.what == "writing" else run_speaking
    for n in range(args.passes):
        left = run(client)
        print(f"pass {n + 1}: {left} left, {client.submits} submissions used", flush=True)
        if left == 0 or client.submits >= client.max_submits:
            break
        time.sleep(120)  # give the overloaded model time before the next pass


if __name__ == "__main__":
    sys.exit(main())
