#!/usr/bin/env bash
# Reproduces the results of Evidence/W08 on a running system. Run from anywhere:  bash Evidence/W08/run.sh
#
# Needs: Postgres with a EMPTY database (the backend creates V1-V19 on start), Neo4j with the KG
# (bash kg/load/load.sh), the ASR service (ai/asr_service, PRON_ENABLED=true), the backend, and a Gemini key
# in GEMINI_API_KEY (environment only, never in a file). The cases use real LLM calls, so the bands can differ a
# little between runs.
#   BASE      backend URL (default http://localhost:8081)
#   RUN_TESTS=1  also run the backend and frontend tests and rewrite test-results.txt (needs DB_URL/DB_USERNAME/DB_PASSWORD
#                of an EMPTY database different from the one the cases use)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PYTHON="${PYTHON:-python}"
BASE="${BASE:-http://localhost:8081}"

cd "$HERE"

# 1. Synthetic Speaking recordings of case C (Windows only). The WAV files are kept in the repo, so skip if present.
if [ ! -f speech/c1_attempt1.wav ] || [ ! -f speech/c1_attempt2.wav ]; then
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File speech/make_speech.ps1
fi

# 2. The three learner cases against the real system: results/*.json (full trace) and summary.csv
"$PYTHON" run_cases.py --base "$BASE"

# 3. Optional: tests
if [ "${RUN_TESTS:-0}" = "1" ]; then
  {
    echo "# Backend (./mvnw test, empty PostgreSQL, Flyway V1-V19)"
    (cd "$ROOT/backend/ielts-backend/ielts-backend" && ./mvnw test | grep -E 'Tests run:|BUILD' | tail -2)
    echo
    echo "# Frontend (npx vitest run, npx tsc --noEmit)"
    (cd "$ROOT/frontend" && npx vitest run 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E 'Test Files|Tests ' && npx tsc --noEmit -p tsconfig.app.json && echo "tsc: no errors")
  } > test-results.txt
fi

# 4. Figure, then the manifest (last, because it hashes the other files)
"$PYTHON" make_figures.py
"$PYTHON" make_manifest.py
