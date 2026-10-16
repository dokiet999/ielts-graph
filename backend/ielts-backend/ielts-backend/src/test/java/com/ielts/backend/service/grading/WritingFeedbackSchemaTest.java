package com.ielts.backend.service.grading;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class WritingFeedbackSchemaTest {

    private static JsonSchema schema;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeAll
    static void setUp() throws Exception {
        ClassPathResource schemaResource = new ClassPathResource("ai/schema/writing_feedback.schema.json");
        try (InputStream is = schemaResource.getInputStream()) {
            JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
            schema = factory.getSchema(is);
        }
    }

    private JsonNode loadSampleJson() throws Exception {
        ClassPathResource sampleResource = new ClassPathResource("ai/schema/writing_feedback.sample.json");
        try (InputStream is = sampleResource.getInputStream()) {
            return objectMapper.readTree(is);
        }
    }

    @Test
    void sampleJson_passesValidation() throws Exception {
        JsonNode sampleNode = loadSampleJson();
        Set<ValidationMessage> errors = schema.validate(sampleNode);
        assertThat(errors).isEmpty();
    }

    @Test
    void missingOverallBand_failsValidation() throws Exception {
        JsonNode sampleNode = loadSampleJson();
        ((ObjectNode) sampleNode).remove("overall_band");

        Set<ValidationMessage> errors = schema.validate(sampleNode);
        assertThat(errors).isNotEmpty();
        assertThat(errors.stream().anyMatch(e -> e.getMessage().contains("overall_band"))).isTrue();
    }

    @Test
    void invalidOverallBandStep_failsValidation() throws Exception {
        JsonNode sampleNode = loadSampleJson();
        // 6.3 is not a multiple of 0.5
        ((ObjectNode) sampleNode).put("overall_band", 6.3);

        Set<ValidationMessage> errors = schema.validate(sampleNode);
        assertThat(errors).isNotEmpty();
    }

    @Test
    void wrongCriteriaCount_failsValidation() throws Exception {
        JsonNode sampleNode = loadSampleJson();
        ObjectNode criteria = (ObjectNode) sampleNode.get("criteria");
        criteria.remove("CRIT_W_GRA"); // Remove 4th criterion -> 3 criteria left

        Set<ValidationMessage> errors = schema.validate(sampleNode);
        assertThat(errors).isNotEmpty();
    }

    @Test
    void invalidCriterionId_failsValidation() throws Exception {
        JsonNode sampleNode = loadSampleJson();
        ObjectNode criteria = (ObjectNode) sampleNode.get("criteria");
        criteria.put("INVALID_CRITERION", objectMapper.createObjectNode());

        Set<ValidationMessage> errors = schema.validate(sampleNode);
        assertThat(errors).isNotEmpty();
    }

    @Test
    void invalidErrorType_failsValidation() throws Exception {
        JsonNode sampleNode = loadSampleJson();
        ObjectNode criteria = (ObjectNode) sampleNode.get("criteria");
        ArrayNode evidence = (ArrayNode) criteria.get("CRIT_W_TR").get("evidence");
        ((ObjectNode) evidence.get(0)).put("error_type", "NOT_A_VALID_ERROR_TYPE");

        Set<ValidationMessage> errors = schema.validate(sampleNode);
        assertThat(errors).isNotEmpty();
    }
}
