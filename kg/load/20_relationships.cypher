// Relationships from kg/data/relationships.csv. Run after 10_nodes.cypher.
// MERGE on (from, type, to), so running this again does not duplicate anything.

LOAD CSV WITH HEADERS FROM 'file:///relationships.csv' AS row
WITH row WHERE row.type = 'HAS_CRITERION'
MATCH (a:Skill {id: row.from_id}), (b:Criterion {id: row.to_id})
MERGE (a)-[r:HAS_CRITERION]->(b)
SET r.source = row.source, r.status = row.status, r.version = row.version;

LOAD CSV WITH HEADERS FROM 'file:///relationships.csv' AS row
WITH row WHERE row.type = 'HAS_SUBSKILL'
MATCH (a:Criterion {id: row.from_id}), (b:SubSkill {id: row.to_id})
MERGE (a)-[r:HAS_SUBSKILL]->(b)
SET r.source = row.source, r.status = row.status, r.version = row.version;

LOAD CSV WITH HEADERS FROM 'file:///relationships.csv' AS row
WITH row WHERE row.type = 'AFFECTS'
MATCH (a:ErrorType {id: row.from_id}), (b:SubSkill {id: row.to_id})
MERGE (a)-[r:AFFECTS]->(b)
SET r.source = row.source, r.status = row.status, r.version = row.version;

LOAD CSV WITH HEADERS FROM 'file:///relationships.csv' AS row
WITH row WHERE row.type = 'HAS_QUESTION_TYPE'
MATCH (a:Skill {id: row.from_id}), (b:QuestionType {id: row.to_id})
MERGE (a)-[r:HAS_QUESTION_TYPE]->(b)
SET r.source = row.source, r.status = row.status, r.version = row.version;

LOAD CSV WITH HEADERS FROM 'file:///relationships.csv' AS row
WITH row WHERE row.type = 'PREREQUISITE_OF'
MATCH (a:SubSkill {id: row.from_id}), (b:SubSkill {id: row.to_id})
MERGE (a)-[r:PREREQUISITE_OF]->(b)
SET r.source = row.source, r.status = row.status, r.version = row.version;

LOAD CSV WITH HEADERS FROM 'file:///relationships.csv' AS row
WITH row WHERE row.type = 'NEXT_LEVEL'
MATCH (a:BandLevel {id: row.from_id}), (b:BandLevel {id: row.to_id})
MERGE (a)-[r:NEXT_LEVEL]->(b)
SET r.source = row.source, r.status = row.status, r.version = row.version;

LOAD CSV WITH HEADERS FROM 'file:///relationships.csv' AS row
WITH row WHERE row.type = 'PRACTICES'
MATCH (a:Resource {id: row.from_id}), (b:SubSkill {id: row.to_id})
MERGE (a)-[r:PRACTICES]->(b)
SET r.source = row.source, r.status = row.status, r.version = row.version;

LOAD CSV WITH HEADERS FROM 'file:///relationships.csv' AS row
WITH row WHERE row.type = 'FIXES'
MATCH (a:Resource {id: row.from_id}), (b:ErrorType {id: row.to_id})
MERGE (a)-[r:FIXES]->(b)
SET r.source = row.source, r.status = row.status, r.version = row.version;

LOAD CSV WITH HEADERS FROM 'file:///relationships.csv' AS row
WITH row WHERE row.type = 'TARGETS'
MATCH (a:Resource {id: row.from_id}), (b:QuestionType {id: row.to_id})
MERGE (a)-[r:TARGETS]->(b)
SET r.source = row.source, r.status = row.status, r.version = row.version;

LOAD CSV WITH HEADERS FROM 'file:///relationships.csv' AS row
WITH row WHERE row.type = 'SUITABLE_FOR'
MATCH (a:Resource {id: row.from_id}), (b:BandLevel {id: row.to_id})
MERGE (a)-[r:SUITABLE_FOR]->(b)
SET r.source = row.source, r.status = row.status, r.version = row.version;
