#!/usr/bin/env bash
# Reproduces every file of Evidence/W06. Run from anywhere: bash Evidence/W06/run.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PYTHON="${PYTHON:-python}"

cd "$ROOT/backend/ielts-backend/ielts-backend"

# 1. Replay the synthetic logs and write metrics.csv and sensitivity.csv
./mvnw -q test -Dtest=SkillStateSimulationTest -Dsim.write=true

# 2. Unit tests of the learner profile (summary only)
./mvnw test -Dtest='SkillStateUpdaterTest,ProfileEventBuilderTest,LearnerProfileServiceTest,SkillStateSimulationTest' \
  | grep -E 'Tests run:|BUILD' > "$HERE/test-results.txt"

cd "$ROOT"

# 3. Figures, then the manifest (last, because it hashes the other files)
"$PYTHON" "$HERE/make_figures.py"
"$PYTHON" "$HERE/make_manifest.py"
