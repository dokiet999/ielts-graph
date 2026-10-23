"""Smoke test of a running ASR service: validates responses against speaking_asr.schema.json.

Usage: python test_service.py [audio_dir]   (default: ./tmp)
"""
import json
import sys
from pathlib import Path

import httpx
from jsonschema import Draft202012Validator

BASE = "http://127.0.0.1:8000"
SCHEMA = json.loads((Path(__file__).parents[1] / "schema" / "speaking_asr.schema.json").read_text(encoding="utf-8"))
validator = Draft202012Validator(SCHEMA)
audio_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "tmp"

# file -> expected HTTP status
CASES = {
    "t1.webm": 200, "t2.ogg": 200, "t3.mp3": 200, "t1.wav": 200,
    "silence.wav": 200, "notaudio.mp3": 400, "empty.wav": 400, "big.wav": 413,
}
failed = 0
with httpx.Client(timeout=600) as client:
    print("health:", client.get(f"{BASE}/health").json())
    for name, expected in CASES.items():
        p = audio_dir / name
        if not p.exists():
            print(f"SKIP {name}")
            continue
        r = client.post(f"{BASE}/transcribe", files={"audio": (name, p.read_bytes())})
        body = r.json()
        ok = r.status_code == expected
        if expected == 200:
            errs = [e.message for e in validator.iter_errors(body)]
            ok = ok and not errs
            print(f"{'OK  ' if ok else 'FAIL'} {name} {r.status_code} {r.headers.get('x-processing-sec')}s "
                  f"schema_errors={errs} features={body.get('features')}\n     transcript={body.get('transcript')!r}")
        else:
            ok = ok and set(body) == {"code", "message"}
            print(f"{'OK  ' if ok else 'FAIL'} {name} {r.status_code} {body}")
        failed += not ok
print("FAILED:", failed)
sys.exit(1 if failed else 0)
