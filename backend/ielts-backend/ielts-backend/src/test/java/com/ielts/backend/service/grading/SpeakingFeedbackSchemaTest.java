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

class SpeakingFeedbackSchemaTest {

    private static JsonSchema feedbackSchema;
    private static JsonSchema asrSchema;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeAll
    static void setUp() throws Exception {
        JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
        try (InputStream is = new ClassPathResource("ai/schema/speaking_feedback.schema.json").getInputStream()) {
            feedbackSchema = factory.getSchema(is);
        }
        try (InputStream is = new ClassPathResource("ai/schema/speaking_asr.schema.json").getInputStream()) {
            asrSchema = factory.getSchema(is);
        }
    }

    private JsonNode loadFeedbackSample() throws Exception {
        try (InputStream is = new ClassPathResource("ai/schema/speaking_feedback.sample.json").getInputStream()) {
            return objectMapper.readTree(is);
        }
    }

    private JsonNode loadAsrSample() throws Exception {
        try (InputStream is = new ClassPathResource("ai/schema/speaking_asr.sample.json").getInputStream()) {
            return objectMapper.readTree(is);
        }
    }

    @Test
    void feedbackSampleJson_passesValidation() throws Exception {
        JsonNode sampleNode = loadFeedbackSample();
        Set<ValidationMessage> errors = feedbackSchema.validate(sampleNode);
        assertThat(errors).isEmpty();
    }

    @Test
    void asrSampleJson_passesValidation() throws Exception {
        JsonNode sampleNode = loadAsrSample();
        Set<ValidationMessage> errors = asrSchema.validate(sampleNode);
        assertThat(errors).isEmpty();
    }

    @Test
    void asrWithNullPronunciation_passesValidation() throws Exception {
        ObjectNode sampleNode = (ObjectNode) loadAsrSample();
        sampleNode.putNull("pronunciation");
        Set<ValidationMessage> errors = asrSchema.validate(sampleNode);
        assertThat(errors).isEmpty();
    }

    @Test
    void asrWithNullProsody_passesValidation() throws Exception {
        ObjectNode sampleNode = (ObjectNode) loadAsrSample();
        ObjectNode pron = (ObjectNode) sampleNode.get("pronunciation");
        pron.putNull("prosody");
        Set<ValidationMessage> errors = asrSchema.validate(sampleNode);
        assertThat(errors).isEmpty();
    }

    @Test
    void missingOverallBand_failsValidation() throws Exception {
        ObjectNode sampleNode = (ObjectNode) loadFeedbackSample();
        sampleNode.remove("overall_band");
        Set<ValidationMessage> errors = feedbackSchema.validate(sampleNode);
        assertThat(errors).isNotEmpty();
    }

    @Test
    void wrongCriteriaCount_failsValidation() throws Exception {
        ObjectNode sampleNode = (ObjectNode) loadFeedbackSample();
        ObjectNode criteria = (ObjectNode) sampleNode.get("criteria");
        criteria.remove("CRIT_S_P");
        Set<ValidationMessage> errors = feedbackSchema.validate(sampleNode);
        assertThat(errors).isNotEmpty();
    }

    @Test
    void invalidSpeakingErrorType_failsValidation() throws Exception {
        ObjectNode sampleNode = (ObjectNode) loadFeedbackSample();
        ObjectNode criteria = (ObjectNode) sampleNode.get("criteria");
        ArrayNode evidence = (ArrayNode) criteria.get("CRIT_S_FC").get("evidence");
        ((ObjectNode) evidence.get(0)).put("error_type", "ERR_NOT_VALID");
        Set<ValidationMessage> errors = feedbackSchema.validate(sampleNode);
        assertThat(errors).isNotEmpty();
    }
}
