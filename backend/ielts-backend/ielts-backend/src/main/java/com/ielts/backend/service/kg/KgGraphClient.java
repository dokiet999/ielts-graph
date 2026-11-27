package com.ielts.backend.service.kg;

import com.ielts.backend.exception.customException.KgUnavailableException;
import lombok.RequiredArgsConstructor;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Session;
import org.neo4j.driver.TransactionConfig;
import org.neo4j.driver.Value;
import org.neo4j.driver.Values;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

/**
 * Low-level Neo4j client for the Knowledge Graph.
 * This is the only class in the backend that runs Cypher queries.
 */
@Component
@RequiredArgsConstructor
public class KgGraphClient {

    private static final Duration QUERY_TIMEOUT = Duration.ofSeconds(5);

    private static final String QUERY_CLASSIFY_ERRORS = """
            MATCH (e:ErrorType) WHERE e.id IN $errors
            RETURN e.id AS id, e.name_vi AS nameVi, e.name_en AS nameEn,
                   EXISTS { (e)-[:AFFECTS]->(:SubSkill)<-[:HAS_SUBSKILL]-(:Criterion {skill: $skill}) } AS validForSkill
            """;

    private static final String QUERY_CANDIDATE_RESOURCES = """
            UNWIND $errors AS errId
            MATCH (e:ErrorType {id: errId})-[:AFFECTS]->(s:SubSkill)<-[:HAS_SUBSKILL]-(c:Criterion {skill: $skill})
            MATCH (r:Resource)
            WHERE EXISTS { (r)-[:PRACTICES]->(:SubSkill)<-[:HAS_SUBSKILL]-(:Criterion {skill: $skill}) }
              AND (EXISTS { (r)-[:FIXES]->(e) } OR EXISTS { (r)-[:PRACTICES]->(s) })
            RETURN e.id AS errorId, e.name_vi AS errorNameVi, e.name_en AS errorNameEn,
                   s.id AS subSkillId, s.name_vi AS subSkillNameVi, s.name_en AS subSkillNameEn,
                   c.id AS criterionId, c.name_vi AS criterionNameVi, c.name_en AS criterionNameEn,
                   r.id AS resourceId, r.name_vi AS resourceNameVi, r.name_en AS resourceNameEn,
                   r.resource_type AS resourceType, r.sql_ref AS sqlRef,
                   EXISTS { (r)-[:FIXES]->(e) } AS fixes, EXISTS { (r)-[:PRACTICES]->(s) } AS practicesSubSkill,
                   [(r)-[:SUITABLE_FOR]->(b:BandLevel) | b.value] AS bands
            """;

    private static final String QUERY_AFFECTED_SUBSKILLS = """
            MATCH (e:ErrorType)-[:AFFECTS]->(s:SubSkill)<-[:HAS_SUBSKILL]-(:Criterion {skill: $skill})
            WHERE e.id IN $errors
            RETURN DISTINCT s.id AS id
            ORDER BY id
            """;

    private static final String QUERY_SUBSKILLS_BY_CRITERIA = """
            MATCH (c:Criterion)-[:HAS_SUBSKILL]->(s:SubSkill)
            WHERE c.id IN $criteria
            RETURN DISTINCT s.id AS id
            ORDER BY id
            """;

    private static final String QUERY_SKILL_STRUCTURE = """
            MATCH (c:Criterion {skill: $skill})-[:HAS_SUBSKILL]->(s:SubSkill)
            OPTIONAL MATCH (e:ErrorType)-[:AFFECTS]->(s)
            RETURN c.id AS criterionId, c.name_vi AS criterionNameVi, c.name_en AS criterionNameEn,
                   s.id AS subSkillId, s.name_vi AS subSkillNameVi, s.name_en AS subSkillNameEn,
                   e.id AS errorId, e.name_vi AS errorNameVi, e.name_en AS errorNameEn
            ORDER BY criterionId, subSkillId, errorId
            """;

    private static final String QUERY_SUBSKILL_RESOURCES = """
            MATCH (:Criterion {skill: $skill})-[:HAS_SUBSKILL]->(s:SubSkill)<-[:PRACTICES]-(r:Resource)
            RETURN DISTINCT s.id AS subSkillId, r.id AS resourceId, r.name_vi AS nameVi, r.name_en AS nameEn,
                   r.sql_ref AS sqlRef,
                   [(r)-[:FIXES]->(e:ErrorType) | e.id] AS fixes,
                   [(r)-[:SUITABLE_FOR]->(b:BandLevel) | b.value] AS bands
            ORDER BY subSkillId, resourceId
            """;

    private static final String QUERY_PREREQUISITES = """
            MATCH (p:SubSkill)-[:PREREQUISITE_OF]->(s:SubSkill)
            RETURN p.id AS prerequisiteId, s.id AS subSkillId
            ORDER BY subSkillId, prerequisiteId
            """;

    private final Driver driver;

    public record ErrorClassification(
            String id,
            String nameVi,
            String nameEn,
            boolean validForSkill
    ) {}

    public record CandidateResourceRow(
            String errorId,
            String errorNameVi,
            String errorNameEn,
            String subSkillId,
            String subSkillNameVi,
            String subSkillNameEn,
            String criterionId,
            String criterionNameVi,
            String criterionNameEn,
            String resourceId,
            String resourceNameVi,
            String resourceNameEn,
            String resourceType,
            String sqlRef,
            boolean fixes,
            boolean practicesSubSkill,
            List<Integer> bands
    ) {}

    /** One Criterion - SubSkill - ErrorType path of a skill; the error fields are null for a SubSkill without ErrorType. */
    public record SkillStructureRow(
            String criterionId,
            String criterionNameVi,
            String criterionNameEn,
            String subSkillId,
            String subSkillNameVi,
            String subSkillNameEn,
            String errorId,
            String errorNameVi,
            String errorNameEn
    ) {}

    /** A Resource that PRACTICES a SubSkill of the skill, with the ErrorTypes it FIXES and its bands. */
    public record SubSkillResourceRow(
            String subSkillId,
            String resourceId,
            String nameVi,
            String nameEn,
            String sqlRef,
            List<String> fixes,
            List<Integer> bands
    ) {}

    /** {@code prerequisiteId} should be mastered before {@code subSkillId} (PREREQUISITE_OF). */
    public record PrerequisiteRow(String prerequisiteId, String subSkillId) {}

    public List<ErrorClassification> classifyErrors(String skill, List<String> errors) {
        if (errors == null || errors.isEmpty()) {
            return List.of();
        }
        TransactionConfig txConfig = TransactionConfig.builder().withTimeout(QUERY_TIMEOUT).build();
        try (Session session = driver.session()) {
            return session.executeRead(tx -> tx.run(
                    QUERY_CLASSIFY_ERRORS,
                    Values.parameters("skill", skill, "errors", errors)
            ).list(record -> new ErrorClassification(
                    record.get("id").asString(),
                    record.get("nameVi").asString(null),
                    record.get("nameEn").asString(null),
                    record.get("validForSkill").asBoolean(false)
            )), txConfig);
        } catch (Exception e) {
            throw new KgUnavailableException("Knowledge graph query failed", e);
        }
    }

    public List<CandidateResourceRow> findCandidateResources(String skill, List<String> errors) {
        if (errors == null || errors.isEmpty()) {
            return List.of();
        }
        TransactionConfig txConfig = TransactionConfig.builder().withTimeout(QUERY_TIMEOUT).build();
        try (Session session = driver.session()) {
            return session.executeRead(tx -> tx.run(
                    QUERY_CANDIDATE_RESOURCES,
                    Values.parameters("skill", skill, "errors", errors)
            ).list(record -> new CandidateResourceRow(
                    record.get("errorId").asString(),
                    record.get("errorNameVi").asString(null),
                    record.get("errorNameEn").asString(null),
                    record.get("subSkillId").asString(),
                    record.get("subSkillNameVi").asString(null),
                    record.get("subSkillNameEn").asString(null),
                    record.get("criterionId").asString(),
                    record.get("criterionNameVi").asString(null),
                    record.get("criterionNameEn").asString(null),
                    record.get("resourceId").asString(),
                    record.get("resourceNameVi").asString(null),
                    record.get("resourceNameEn").asString(null),
                    record.get("resourceType").asString(null),
                    record.get("sqlRef").asString(null),
                    record.get("fixes").asBoolean(false),
                    record.get("practicesSubSkill").asBoolean(false),
                    record.get("bands").asList(Value::asInt)
            )), txConfig);
        } catch (Exception e) {
            throw new KgUnavailableException("Knowledge graph query failed", e);
        }
    }

    /**
     * Query 1 (W6): SubSkills affected by the given ErrorTypes, restricted to the skill being graded.
     */
    public List<String> findAffectedSubSkills(String skill, List<String> errors) {
        if (skill == null || skill.isBlank() || errors == null || errors.isEmpty()) {
            return List.of();
        }
        TransactionConfig txConfig = TransactionConfig.builder().withTimeout(QUERY_TIMEOUT).build();
        try (Session session = driver.session()) {
            return session.executeRead(tx -> tx.run(
                    QUERY_AFFECTED_SUBSKILLS,
                    Values.parameters("skill", skill, "errors", errors)
            ).list(record -> record.get("id").asString()), txConfig);
        } catch (Exception e) {
            throw new KgUnavailableException("Knowledge graph query failed", e);
        }
    }

    /**
     * Query 2 (W6): SubSkills belonging to the given graded Criteria.
     */
    public List<String> findSubSkillsByCriteria(List<String> criteria) {
        if (criteria == null || criteria.isEmpty()) {
            return List.of();
        }
        TransactionConfig txConfig = TransactionConfig.builder().withTimeout(QUERY_TIMEOUT).build();
        try (Session session = driver.session()) {
            return session.executeRead(tx -> tx.run(
                    QUERY_SUBSKILLS_BY_CRITERIA,
                    Values.parameters("criteria", criteria)
            ).list(record -> record.get("id").asString()), txConfig);
        } catch (Exception e) {
            throw new KgUnavailableException("Knowledge graph query failed", e);
        }
    }

    /**
     * Personalization (W7): every Criterion, SubSkill and ErrorType of a skill (SKILL_W or SKILL_S).
     */
    public List<SkillStructureRow> findSkillStructure(String skill) {
        TransactionConfig txConfig = TransactionConfig.builder().withTimeout(QUERY_TIMEOUT).build();
        try (Session session = driver.session()) {
            return session.executeRead(tx -> tx.run(
                    QUERY_SKILL_STRUCTURE,
                    Values.parameters("skill", skill)
            ).list(record -> new SkillStructureRow(
                    record.get("criterionId").asString(),
                    record.get("criterionNameVi").asString(null),
                    record.get("criterionNameEn").asString(null),
                    record.get("subSkillId").asString(),
                    record.get("subSkillNameVi").asString(null),
                    record.get("subSkillNameEn").asString(null),
                    record.get("errorId").asString(null),
                    record.get("errorNameVi").asString(null),
                    record.get("errorNameEn").asString(null)
            )), txConfig);
        } catch (Exception e) {
            throw new KgUnavailableException("Knowledge graph query failed", e);
        }
    }

    /**
     * Personalization (W7): the practice Resources of the SubSkills of a skill.
     */
    public List<SubSkillResourceRow> findSubSkillResources(String skill) {
        TransactionConfig txConfig = TransactionConfig.builder().withTimeout(QUERY_TIMEOUT).build();
        try (Session session = driver.session()) {
            return session.executeRead(tx -> tx.run(
                    QUERY_SUBSKILL_RESOURCES,
                    Values.parameters("skill", skill)
            ).list(record -> new SubSkillResourceRow(
                    record.get("subSkillId").asString(),
                    record.get("resourceId").asString(),
                    record.get("nameVi").asString(null),
                    record.get("nameEn").asString(null),
                    record.get("sqlRef").asString(null),
                    record.get("fixes").asList(Value::asString),
                    record.get("bands").asList(Value::asInt)
            )), txConfig);
        } catch (Exception e) {
            throw new KgUnavailableException("Knowledge graph query failed", e);
        }
    }

    /**
     * Personalization (W7): all PREREQUISITE_OF relationships between SubSkills.
     */
    public List<PrerequisiteRow> findPrerequisites() {
        TransactionConfig txConfig = TransactionConfig.builder().withTimeout(QUERY_TIMEOUT).build();
        try (Session session = driver.session()) {
            return session.executeRead(tx -> tx.run(QUERY_PREREQUISITES).list(record -> new PrerequisiteRow(
                    record.get("prerequisiteId").asString(),
                    record.get("subSkillId").asString()
            )), txConfig);
        } catch (Exception e) {
            throw new KgUnavailableException("Knowledge graph query failed", e);
        }
    }
}
