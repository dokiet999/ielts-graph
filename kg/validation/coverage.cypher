// Coverage summary: how much of the ontology is reachable from a practice Resource.
// Output columns: metric, covered, total, percent. Run with kg/validation/validate.sh.

MATCH (e:ErrorType)
RETURN 'ErrorType with a FIXES Resource' AS metric,
       sum(CASE WHEN EXISTS { (:Resource)-[:FIXES]->(e) } THEN 1 ELSE 0 END) AS covered, count(e) AS total
UNION ALL
MATCH (s:SubSkill)
RETURN 'SubSkill with a PRACTICES Resource' AS metric, sum(CASE WHEN EXISTS { (:Resource)-[:PRACTICES]->(s) } THEN 1 ELSE 0 END) AS covered, count(s) AS total
UNION ALL
MATCH (s:SubSkill)
RETURN 'SubSkill reachable from an ErrorType' AS metric, sum(CASE WHEN EXISTS { (:ErrorType)-[:AFFECTS]->(s) } THEN 1 ELSE 0 END) AS covered, count(s) AS total
UNION ALL
MATCH (q:QuestionType)
RETURN 'QuestionType with a TARGETS Resource' AS metric, sum(CASE WHEN EXISTS { (:Resource)-[:TARGETS]->(q) } THEN 1 ELSE 0 END) AS covered, count(q) AS total
UNION ALL
MATCH (c:Criterion)
RETURN 'Criterion with a practiced SubSkill' AS metric,
       sum(CASE WHEN EXISTS { (c)-[:HAS_SUBSKILL]->(:SubSkill)<-[:PRACTICES]-(:Resource) } THEN 1 ELSE 0 END) AS covered, count(c) AS total
UNION ALL
MATCH (b:BandLevel)
RETURN 'BandLevel with a SUITABLE_FOR Resource' AS metric, sum(CASE WHEN EXISTS { (:Resource)-[:SUITABLE_FOR]->(b) } THEN 1 ELSE 0 END) AS covered, count(b) AS total
UNION ALL
MATCH ()-[r]->()
RETURN 'Relationships verified' AS metric, sum(CASE WHEN r.status = 'verified' THEN 1 ELSE 0 END) AS covered, count(r) AS total;
