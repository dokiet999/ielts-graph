#!/usr/bin/env bash
# Reproduces every file of Evidence/W07. Run from anywhere: bash Evidence/W07/run.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PYTHON="${PYTHON:-python}"

cd "$ROOT"

# 1. Criterion bands and target bands of the synthetic learners (same seed, same files)
"$PYTHON" data/learner_sim/derive_bands.py
"$PYTHON" data/learner_sim/derive_bands.py --noise 1.0 --bands-out attempt_bands_noise1.csv --no-targets

cd "$ROOT/backend/ielts-backend/ielts-backend"

# 2. Rank the SubSkills of the 60 learners with every method and write metrics.csv and comparison.csv
./mvnw -q test -Dtest=RecommendationOfflineEvaluationTest -Dsim.write=true

# 3. Unit tests of the rankers and the evaluation (summary only)
./mvnw test -Dtest='WeaknessRankerTest,RecommendationOfflineEvaluationTest' \
  | grep -E 'Tests run:|BUILD' > "$HERE/test-results.txt"

cd "$ROOT"

# 4. Figures, then the manifest (last, because it hashes the other files)
"$PYTHON" "$HERE/make_figures.py"
"$PYTHON" "$HERE/make_manifest.py"
