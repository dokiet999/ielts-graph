#!/usr/bin/env bash
# Loads kg/data/*.csv into the running Neo4j container. Safe to run again (constraints and MERGE).
# Usage (from the repository root, in Git Bash / Linux / macOS): bash kg/load/load.sh
set -euo pipefail

for f in 00_constraints 10_nodes 20_relationships; do
  echo "Running $f ..."
  docker compose exec -T neo4j sh -c \
    "cypher-shell -u neo4j -p \"\${NEO4J_AUTH#neo4j/}\" --fail-fast -f /kg/load/$f.cypher" > /dev/null
done

docker compose exec -T neo4j sh -c \
  "cypher-shell -u neo4j -p \"\${NEO4J_AUTH#neo4j/}\" --format plain \
   'MATCH (n) WITH count(n) AS nodes MATCH ()-[r]->() RETURN nodes, count(r) AS relationships'"
