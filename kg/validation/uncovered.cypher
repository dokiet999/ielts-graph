// Ontology items that no practice Resource covers yet. Output columns: type, id, name_en.

MATCH (e:ErrorType) WHERE NOT EXISTS { (:Resource)-[:FIXES]->(e) }
RETURN 'ErrorType without FIXES Resource' AS type, e.id AS id, e.name_en AS name_en
UNION ALL
MATCH (s:SubSkill) WHERE NOT EXISTS { (:Resource)-[:PRACTICES]->(s) }
RETURN 'SubSkill without PRACTICES Resource' AS type, s.id AS id, s.name_en AS name_en
UNION ALL
MATCH (q:QuestionType) WHERE NOT EXISTS { (:Resource)-[:TARGETS]->(q) }
RETURN 'QuestionType without TARGETS Resource' AS type, q.id AS id, q.name_en AS name_en
UNION ALL
MATCH (b:BandLevel) WHERE NOT EXISTS { (:Resource)-[:SUITABLE_FOR]->(b) }
RETURN 'BandLevel without SUITABLE_FOR Resource' AS type, b.id AS id, b.name_en AS name_en;
