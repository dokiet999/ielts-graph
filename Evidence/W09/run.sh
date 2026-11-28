#!/usr/bin/env bash
# Reproduces Evidence/W09 on a running system. Run from anywhere:  bash Evidence/W09/run.sh
#
# Needs: Postgres with an EMPTY database (the backend creates V1-V19 on start), the ASR service
# (ai/asr_service, PRON_ENABLED=true), the backend, a Gemini key in GEMINI_API_KEY (environment only, never in a
# file), ffmpeg, and the two corpora downloaded outside the repo:
#   SANDI_DIR   Speak & Improve Corpus 2025 (registration with Cambridge), with data/flac/dev/01 unpacked
#   SO762       speechocean762 test parquet (Hugging Face mispeech/speechocean762)
#   WAV_DIR     scratch folder for the converted audio (not in the repo)
#   PSQL        command that runs psql on the empty database, e.g. "docker exec -i <container> psql -U <user> -d <db>"
#   BASE        backend URL (default http://localhost:8081)
# Real LLM calls: the AI scores can differ a little between runs.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PYTHON="${PYTHON:-python}"
BASE="${BASE:-http://localhost:8081}"
cd "$HERE"

# 1. Held-out Speaking sample (fixed seed) and the exercises that carry the prompts of both sets
"$PYTHON" select_speaking.py
PYTHONIOENCODING=utf-8 "$PYTHON" run_eval.py sql > eval_exercises.sql
$PSQL -q < eval_exercises.sql

# 2. Grade through the system (a rerun retries only the failed items)
"$PYTHON" run_eval.py writing --base "$BASE"
"$PYTHON" run_eval.py speaking --base "$BASE"

# 3. Pronunciation against experts (scorer called directly, same code as the ASR service)
"$PYTHON" eval_pron_speechocean.py --parquet "$SO762"

# 4. Metrics, figure, then the manifest (last, because it hashes the other files)
"$PYTHON" analyze.py
"$PYTHON" make_figures.py
"$PYTHON" make_manifest.py
