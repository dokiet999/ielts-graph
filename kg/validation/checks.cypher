// Structural checks on the loaded graph. Every row is one check; `violations` must be 0.
// Run with kg/validation/validate.sh. Each branch counts first (WITH count(..)) and only then names the check,
// so that a check without violations still returns one row with 0.

MATCH (n) WHERE NOT (n)--()
WITH count(n) AS violations
RETURN 'no orphan nodes' AS check, violations
UNION ALL
MATCH (s:SubSkill)-[:PREREQUISITE_OF*1..]->(s)
WITH count(DISTINCT s) AS violations
RETURN 'no PREREQUISITE_OF cycles' AS check, violations
UNION ALL
MATCH (e:ErrorType) WHERE NOT (e)-[:AFFECTS]->(:SubSkill)
WITH count(e) AS violations
RETURN 'every ErrorType has AFFECTS' AS check, violations
UNION ALL
MATCH (s:SubSkill) WHERE NOT (:Criterion)-[:HAS_SUBSKILL]->(s)
WITH count(s) AS violations
RETURN 'every SubSkill belongs to a Criterion' AS check, violations
UNION ALL
MATCH (c:Criterion) WHERE NOT (:Skill)-[:HAS_CRITERION]->(c) OR NOT (c)-[:HAS_SUBSKILL]->(:SubSkill)
WITH count(c) AS violations
RETURN 'every Criterion has a Skill and SubSkills' AS check, violations
UNION ALL
MATCH (q:QuestionType) WHERE NOT (:Skill)-[:HAS_QUESTION_TYPE]->(q)
WITH count(q) AS violations
RETURN 'every QuestionType belongs to a Skill' AS check, violations
UNION ALL
MATCH (n)
WITH n, {Skill: 'SKILL_', Criterion: 'CRIT_', SubSkill: 'SUB_', ErrorType: 'ERR_',
         QuestionType: 'QT_', BandLevel: 'BAND_', Resource: 'RES_'}[labels(n)[0]] AS prefix
WHERE prefix IS NULL OR NOT n.id STARTS WITH prefix
WITH count(n) AS violations
RETURN 'IDs have the prefix of their label' AS check, violations
UNION ALL
MATCH (a)-[r]->(b)
WITH type(r) AS t, [labels(a)[0], labels(b)[0]] AS ends
WHERE ends <> {HAS_CRITERION: ['Skill', 'Criterion'], HAS_SUBSKILL: ['Criterion', 'SubSkill'],
               AFFECTS: ['ErrorType', 'SubSkill'], HAS_QUESTION_TYPE: ['Skill', 'QuestionType'],
               PREREQUISITE_OF: ['SubSkill', 'SubSkill'], NEXT_LEVEL: ['BandLevel', 'BandLevel'],
               PRACTICES: ['Resource', 'SubSkill'], FIXES: ['Resource', 'ErrorType'],
               TARGETS: ['Resource', 'QuestionType'], SUITABLE_FOR: ['Resource', 'BandLevel']}[t]
WITH count(*) AS violations
RETURN 'relationship endpoints match the schema' AS check, violations
UNION ALL
MATCH ()-[r]->()
WHERE NOT r.status IN ['draft', 'verified'] OR coalesce(r.source, '') = '' OR coalesce(r.version, '') = ''
WITH count(r) AS violations
RETURN 'relationships have status, source, version' AS check, violations
UNION ALL
MATCH (r:Resource)
WHERE r.sql_ref IS NULL OR NOT r.sql_ref =~ '^exercises:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
WITH count(r) AS violations
RETURN 'every Resource has a valid sql_ref' AS check, violations
UNION ALL
MATCH (r:Resource)
WHERE NOT (r)-[:SUITABLE_FOR]->(:BandLevel)
   OR NOT (EXISTS { (r)-[:FIXES]->() } OR EXISTS { (r)-[:PRACTICES]->() } OR EXISTS { (r)-[:TARGETS]->() })
WITH count(r) AS violations
RETURN 'every Resource has a band and a target' AS check, violations;
