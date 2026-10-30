package com.ielts.backend.service.kg;

import com.ielts.backend.exception.KgUnavailableException;
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
}

