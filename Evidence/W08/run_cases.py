"""Runs the W8 learner cases against a running system and records every step.

Needs the stack up (backend, Postgres, Neo4j with the KG, ASR service). It sends real requests with the
HTTP Basic accounts of the seed data, so the grader (Gemini) and the Speaking pipeline (Whisper) are real.
Standard library only.

    python run_cases.py --base http://localhost:8081
Writes results/<case>.json (full trace) and summary.csv (one row per step).
"""
import argparse
import base64
import csv
import json
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ESSAYS = ROOT / "data" / "writing_v1" / "essays.json"
PASSWORD = "Demo@123"
# The dev Writing exercises of V10 carry the prompt of essay w2_NNN (same order as the essays).
WRITING_EXERCISE = {
    "w2_003": "40000000-0000-0000-0000-000000000001", "w2_013": "40000000-0000-0000-0000-000000000005",
    "w2_027": "40000000-0000-0000-0000-000000000011", "w2_031": "40000000-0000-0000-0000-000000000013",
    "w2_039": "40000000-0000-0000-0000-000000000015",
}
# Essay text is not copied into the results (source licence unknown): only its id and reference band.
DROP_KEYS = {"essayText", "essay_text", "essay"}


class Client:
    def __init__(self, base, user):
        self.base = base.rstrip("/")
        self.auth = "Basic " + base64.b64encode(f"{user}:{PASSWORD}".encode()).decode()

    def call(self, method, path, body=None, headers=None, timeout=240):
        data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
        req = urllib.request.Request(self.base + path, data=data, method=method)
        req.add_header("Authorization", self.auth)
        if isinstance(body, (dict, list)):
            req.add_header("Content-Type", "application/json")
        for k, v in (headers or {}).items():
            req.add_header(k, v)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e:
            raw = e.read()
            try:
                return e.code, json.loads(raw)
            except ValueError:
                return e.code, {"raw": raw.decode("utf-8", "replace")}

    def retrying(self, method, path, body=None, headers=None, tries=5):
        """The LLM can answer 503 for a moment; a user would press "retry"."""
        for i in range(tries):
            status, payload = self.call(method, path, body, headers)
            if status in (502, 503, 504) and i < tries - 1:
                time.sleep(20)
                continue
            return status, payload
        return status, payload


def multipart(fields, file_field, file_path):
    boundary = uuid.uuid4().hex
    parts = []
    for k, v in fields.items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    parts.append((f'--{boundary}\r\nContent-Disposition: form-data; name="{file_field}"; filename="{file_path.name}"\r\n'
                  f'Content-Type: audio/wav\r\n\r\n').encode() + file_path.read_bytes() + b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), {"Content-Type": f"multipart/form-data; boundary={boundary}"}


def strip(value):
    if isinstance(value, dict):
        return {k: strip(v) for k, v in value.items() if k not in DROP_KEYS}
    if isinstance(value, list):
        return [strip(v) for v in value]
    return value


def snapshot(client, skill):
    """Learner profile of one skill as the Personalization tab shows it."""
    status, payload = client.call("GET", "/api/personalization")
    if status != 200:
        return {"error": status}
    sp = next(s for s in payload["data"]["skills"] if s["skill"] == skill)
    weak = [{
        "error": w["errorType"]["id"], "subSkill": w["subSkill"]["id"], "status": w["status"],
        "occurrences": w["occurrences"], "mastery": w["mastery"], "priority": w["priority"],
        "resources": [r["resourceId"] for r in (w.get("resources") or [])],
    } for w in (sp.get("weaknesses") or [])]
    mastery = {s["subSkill"]["id"]: round(s["mastery"], 3)
               for c in sp["criteria"] for s in c["subSkills"] if s["mastery"] is not None}
    return {
        "attemptCount": sp["attemptCount"], "currentBand": sp["currentBand"], "targetBand": sp["targetBand"],
        "criteriaBands": {c["criterion"]["id"]: c["currentBand"] for c in sp["criteria"]},
        "gaps": sp.get("gaps"), "mastery": mastery, "weaknesses": weak,
    }


def result_summary(payload):
    d = payload.get("data", {})
    raw = d.get("rawFeedback") or {}
    criteria = {k: v.get("band") for k, v in (raw.get("criteria") or {}).items()}
    errors = [e.get("error_type") for c in (raw.get("criteria") or {}).values()
              for e in (c.get("evidence") or []) if isinstance(e, dict) and e.get("error_type")]
    return {
        "submissionId": d.get("submissionId"), "attempt": d.get("attemptNumber"), "overallBand": d.get("overallBand"),
        "criteriaBands": criteria, "errorCodes": errors, "pronunciation": d.get("pronunciation"),
        "features": d.get("features"), "transcript": d.get("transcript"),
        "aiModel": d.get("aiModel"), "promptVersion": d.get("aiPromptVersion"), "latencyMs": d.get("aiLatencyMs"),
    }


def run_case(base, case, essays):
    client = Client(base, case["learner"])
    trace = {"case": case["id"], "title": case["title"], "learner": case["learner"], "skill": case["skill"],
             "purpose": case["purpose"], "before": snapshot(client, case["skill"]), "steps": []}
    if case.get("enroll"):
        client.call("POST", f"/api/courses/{case['enroll']}/enroll")
    for n, step in enumerate(case["steps"], 1):
        if step["type"] == "writing":
            essay = essays[step["essay"]]
            status, payload = client.retrying("POST", f"/api/exercises/{WRITING_EXERCISE[step['essay']]}/submit/writing",
                                              {"essayText": essay["essay"], "timeSpent": 1800})
            info = {"input": f"essay {step['essay']} (reference band {step['referenceBand']})"}
        elif step["type"] == "speaking":
            body, headers = multipart({"timeSpent": "30"}, "audio", HERE / step["audio"])
            status, payload = client.retrying("POST", f"/api/exercises/{step['exercise']}/submit/speaking", body, headers)
            info = {"input": f"audio {step['audio']}"}
        else:  # target band
            status, payload = client.call("PUT", "/api/personalization/target-band",
                                          {"skill": case["skill"], "targetBand": step["targetBand"]})
            trace["steps"].append({"step": n, "input": f"target band {step['targetBand']}", "http": status,
                                   "after": snapshot(client, case["skill"])})
            continue
        entry = {"step": n, **info, "http": status}
        if status == 200:
            entry["result"] = result_summary(payload)
            entry["rawFeedback"] = strip(payload.get("data", {}).get("rawFeedback"))
        else:
            entry["error"] = payload
        entry["after"] = snapshot(client, case["skill"])
        trace["steps"].append(entry)
    return trace


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8081")
    args = ap.parse_args()
    cases = json.loads((HERE / "cases.json").read_text(encoding="utf-8"))
    essays = {e["id"]: e for e in json.loads(ESSAYS.read_text(encoding="utf-8"))}
    out = HERE / "results"
    out.mkdir(exist_ok=True)
    rows = []
    for case in cases:
        trace = run_case(args.base, case, essays)
        (out / f"{case['id']}.json").write_text(json.dumps(trace, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        for s in trace["steps"]:
            r, a = s.get("result"), s["after"]
            top = (a.get("weaknesses") or [{}])[0] if "error" not in a else {}
            rows.append({
                "case": case["id"], "step": s["step"], "input": s["input"], "http": s["http"],
                "overall_band": r["overallBand"] if r else "", "error_codes": " ".join(filter(None, r["errorCodes"])) if r else "",
                "pron_accuracy": (r["pronunciation"] or {}).get("accuracy", "") if r else "",
                "profile_band": a.get("currentBand", ""), "target_band": a.get("targetBand", ""),
                "attempts": a.get("attemptCount", ""), "top_weakness": top.get("error", ""),
                "top_subskill": top.get("subSkill", ""), "top_priority": top.get("priority", ""),
                "top_resources": " ".join(top.get("resources", [])),
            })
        print(case["id"], "done:", [(s["step"], s["http"], (s.get("result") or {}).get("overallBand")) for s in trace["steps"]])
    with open(HERE / "summary.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    main()
