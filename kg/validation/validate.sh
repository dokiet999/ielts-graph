#!/usr/bin/env bash
# Validates the graph loaded in Neo4j and refreshes the coverage reports.
# Usage (repository root, Git Bash / Linux / macOS): bash kg/validation/validate.sh
# Exit code is 1 if any check fails. Writes kg/validation/coverage.csv and kg/validation/uncovered.csv.
set -uo pipefail

VAL=kg/validation
MIGRATIONS=backend/ielts-backend/ielts-backend/src/main/resources/db/migration
fails=0

cypher() {
  docker compose exec -T neo4j sh -c \
    "cypher-shell -u neo4j -p \"\${NEO4J_AUTH#neo4j/}\" --format plain $*" | tr -d '\r'
}
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }

echo "Structural checks (kg/validation/checks.cypher)"
while IFS= read -r line; do
  name=$(printf '%s' "$line" | sed -E 's/^"(.*)", [0-9]+$/\1/')
  n=$(printf '%s' "$line" | sed -E 's/^.*, ([0-9]+)$/\1/')
  if [ "$n" = "0" ]; then pass "$name"; else fail "$name ($n violations)"; fi
done < <(cypher "-f /kg/validation/checks.cypher" | tail -n +2)

echo "Counts against the CSV seed"
graph_nodes=$(cypher "'MATCH (n) RETURN count(n)'" | tail -n 1)
graph_rels=$(cypher "'MATCH ()-[r]->() RETURN count(r)'" | tail -n 1)
csv_nodes=$(($(wc -l < kg/data/nodes.csv) - 1))
csv_rels=$(($(wc -l < kg/data/relationships.csv) - 1))
[ "$graph_nodes" = "$csv_nodes" ] && pass "nodes: graph $graph_nodes = nodes.csv $csv_nodes" || fail "nodes: graph $graph_nodes, nodes.csv $csv_nodes"
[ "$graph_rels" = "$csv_rels" ] && pass "relationships: graph $graph_rels = relationships.csv $csv_rels" || fail "relationships: graph $graph_rels, relationships.csv $csv_rels"

echo "ErrorType IDs against the AI contract (ai/schema, ai/rubric, ai/prompts)"
grep -ohE 'ERR_[A-Z_]+' ai/schema/*.json ai/rubric/*.json ai/prompts/* | sort -u > /tmp/ai_err.$$
awk -F, '$1 == "ErrorType" {print $2}' kg/data/nodes.csv | sort -u > /tmp/kg_err.$$
only_ai=$(comm -23 /tmp/ai_err.$$ /tmp/kg_err.$$ | tr '\n' ' ')
only_kg=$(comm -13 /tmp/ai_err.$$ /tmp/kg_err.$$ | tr '\n' ' ')
[ -z "$only_ai" ] && pass "every ERR_* used by the AI exists in the KG" || fail "ERR_* in AI files but not in KG: $only_ai"
[ -z "$only_kg" ] && pass "every ErrorType in the KG is known to the AI" || fail "ErrorType in KG but not in AI files: $only_kg"
rm -f /tmp/ai_err.$$ /tmp/kg_err.$$

echo "Resource sql_ref against the Flyway migrations"
missing=""
for id in $(awk -F, '$1 == "Resource" {print $11}' kg/data/nodes.csv | sed 's/^exercises://' | sort -u); do
  grep -rqF "$id" "$MIGRATIONS" || missing="$missing $id"
done
[ -z "$missing" ] && pass "every sql_ref exists in db/migration" || fail "sql_ref not found in migrations:$missing"

echo "Reports"
{
  echo "metric,covered,total,percent"
  cypher "-f /kg/validation/coverage.cypher" | tail -n +2 | awk -F', ' '
    { total = $NF; covered = $(NF - 1); metric = $1; for (i = 2; i < NF - 1; i++) metric = metric ", " $i
      printf "%s,%d,%d,%.1f\n", metric, covered, total, (total ? 100 * covered / total : 0) }'
} > "$VAL/coverage.csv"
cypher "-f /kg/validation/uncovered.cypher" | sed -e '1s/, /,/g' -e '2,$s/", "/","/g' > "$VAL/uncovered.csv"
echo "  wrote $VAL/coverage.csv ($(($(wc -l < $VAL/coverage.csv) - 1)) metrics) and $VAL/uncovered.csv ($(($(wc -l < $VAL/uncovered.csv) - 1)) items)"

if [ "$fails" -eq 0 ]; then echo "All checks passed."; else echo "$fails check(s) failed."; exit 1; fi
