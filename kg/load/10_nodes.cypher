// Nodes from kg/data/nodes.csv. MERGE on id, so running this again does not duplicate anything.
// Empty CSV cells are null (nullIf) so unused properties are not stored.

LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
WITH row WHERE row.label = 'Skill'
MERGE (n:Skill {id: row.id})
SET n.name_vi = row.name_vi, n.name_en = row.name_en, n.version = row.version;

LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
WITH row WHERE row.label = 'Criterion'
MERGE (n:Criterion {id: row.id})
SET n.name_vi = row.name_vi, n.name_en = row.name_en, n.version = row.version,
    n.skill = nullIf(row.skill, ''), n.applies_to = nullIf(row.applies_to, '');

LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
WITH row WHERE row.label = 'SubSkill'
MERGE (n:SubSkill {id: row.id})
SET n.name_vi = row.name_vi, n.name_en = row.name_en, n.version = row.version;

LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
WITH row WHERE row.label = 'ErrorType'
MERGE (n:ErrorType {id: row.id})
SET n.name_vi = row.name_vi, n.name_en = row.name_en, n.version = row.version,
    n.errant_code = nullIf(row.errant_code, '');

LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
WITH row WHERE row.label = 'QuestionType'
MERGE (n:QuestionType {id: row.id})
SET n.name_vi = row.name_vi, n.name_en = row.name_en, n.version = row.version,
    n.skill = nullIf(row.skill, ''), n.task = nullIf(row.task, '');

LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
WITH row WHERE row.label = 'BandLevel'
MERGE (n:BandLevel {id: row.id})
SET n.name_vi = row.name_vi, n.name_en = row.name_en, n.version = row.version,
    n.value = toInteger(row.value);

LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
WITH row WHERE row.label = 'Resource'
MERGE (n:Resource {id: row.id})
SET n.name_vi = row.name_vi, n.name_en = row.name_en, n.version = row.version,
    n.resource_type = nullIf(row.resource_type, ''), n.sql_ref = nullIf(row.sql_ref, '');
