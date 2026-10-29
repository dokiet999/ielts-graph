# Knowledge Graph (Neo4j)

Ontology v0 as a graph: Skill, Criterion, SubSkill, ErrorType, QuestionType, BandLevel, Resource.
Seed data is in `kg/data/` (`nodes.csv`, `relationships.csv`); Cypher load scripts are in `kg/load/`.

## Run

```bash
cp .env.example .env          # then set NEO4J_PASSWORD (at least 8 characters)
docker compose up -d          # Neo4j Browser: http://localhost:7474 (user: neo4j)
bash kg/load/load.sh          # Git Bash / Linux / macOS
```

The loader prints the node and relationship counts (currently 127 and 197, same as the CSV files).
Running it again does not create duplicates. To start from an empty graph: `docker compose down -v`.

## Validate

```bash
bash kg/validation/validate.sh
```

Runs the structural checks (`checks.cypher`: no orphan nodes, no `PREREQUISITE_OF` cycles, IDs and relationship
endpoints follow the schema, ...), compares counts with the CSV files, checks the `ERR_*` codes against `ai/` and the
`sql_ref` values against the Flyway migrations, then rewrites `kg/validation/coverage.csv` (coverage and verified
relations) and `kg/validation/uncovered.csv` (ontology items without a practice Resource). Exit code 1 if a check fails.

## Example query (ErrorType to practice Resource)

```cypher
MATCH (e:ErrorType {id: 'ERR_ARTICLE'})-[:AFFECTS]->(s:SubSkill)<-[:HAS_SUBSKILL]-(c:Criterion {skill: 'SKILL_W'})
MATCH (r:Resource)-[:FIXES]->(e)
RETURN e.id, s.id, c.id, r.id, r.sql_ref
```

`Resource.sql_ref` is `exercises:<uuid>`; the exercise rows come from Flyway migration `V13__seed_practice_drills.sql`.

## Editing the data

Edit the two CSV files and run the loader again. Do not change existing IDs (ontology v0 IDs are frozen for W5).
Relationship `status` is `draft` until reviewed, then `verified`.
