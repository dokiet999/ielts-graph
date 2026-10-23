package com.ielts.backend.service.grading;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ielts.backend.exception.SpeakingGradingException;
import com.ielts.backend.service.asr.SpeakingAsrResult;
import com.ielts.backend.service.llm.LlmClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SpeakingGraderTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AtomicReference<String> nextResponse = new AtomicReference<>();
    private final AtomicReference<String> lastUserPrompt = new AtomicReference<>();
    private final AtomicInteger callCount = new AtomicInteger();

    private final LlmClient stubLlmClient = new LlmClient() {
        @Override
        public String chat(String userMessage) {
            return chat("", userMessage);
        }

        @Override
        public String chat(String systemPrompt, String userMessage) {
            callCount.incrementAndGet();
            lastUserPrompt.set(userMessage);
            return nextResponse.get();
        }

        @Override
        public String getModelName() {
            return "gemini-2.5-flash";
        }
    };

    private SpeakingGrader grader;
    private String sampleFeedbackJson;
    private SpeakingAsrResult sampleAsr;

    @BeforeEach
    void setUp() throws Exception {
        callCount.set(0);
        lastUserPrompt.set(null);
        grader = new SpeakingGrader(stubLlmClient, objectMapper);
        grader.init();

        try (InputStream is = new ClassPathResource("ai/schema/speaking_feedback.sample.json").getInputStream()) {
            sampleFeedbackJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
        try (InputStream is = new ClassPathResource("ai/schema/speaking_asr.sample.json").getInputStream()) {
            sampleAsr = objectMapper.readValue(is, SpeakingAsrResult.class);
        }
    }

    @Test
    void grade_validResponse_returnsCorrectBandsAndStructure() {
        nextResponse.set(sampleFeedbackJson);

        SpeakingGradingResult result = grader.grade("QT_S_PART2", "Describe a city you visited.", sampleAsr);

        assertThat(result).isNotNull();
        assertThat(result.getPart()).isEqualTo("QT_S_PART2");
        assertThat(result.getOverallBand()).isEqualByComparingTo(BigDecimal.valueOf(6.0));
        assertThat(result.isOutOfCalibrationRange()).isFalse();
        assertThat(result.getCriteria()).hasSize(4);
        assertThat(result.getSummary()).isNotBlank();
        assertThat(result.getImprovements()).hasSize(3);
        assertThat(callCount.get()).isEqualTo(1);
    }

    @Test
    void grade_hallucinatedQuote_removesQuoteWithoutThrowing() {
        SpeakingAsrResult differentAsr = SpeakingAsrResult.builder()
                .transcript("This spoken answer is about cooking pasta at home on weekends.")
                .features(sampleAsr.getFeatures())
                .build();
        nextResponse.set(sampleFeedbackJson);

        SpeakingGradingResult result = grader.grade("QT_S_PART2", "Prompt", differentAsr);
        assertThat(result).isNotNull();
        boolean hasAnyQuotes = result.getCriteria().stream()
                .flatMap(c -> c.getEvidence().stream())
                .anyMatch(e -> e.getQuote() != null && !e.getQuote().isBlank());
        assertThat(hasAnyQuotes).isFalse();
    }

    @Test
    void grade_malformedJson_retriesOnceAndThrows() {
        nextResponse.set("Not valid JSON");

        assertThatThrownBy(() -> grader.grade("QT_S_PART2", "Prompt", sampleAsr))
                .isInstanceOf(SpeakingGradingException.class)
                .hasMessageContaining("LLM response is not valid JSON");

        assertThat(callCount.get()).isEqualTo(2);
    }

    @Test
    void grade_partFromExercise_overridesPartReturnedByLlm() {
        nextResponse.set(sampleFeedbackJson);

        SpeakingGradingResult result = grader.grade("QT_S_PART1", "Do you like travelling?", sampleAsr);

        assertThat(result.getPart()).isEqualTo("QT_S_PART1");
        assertThat(result.getRawJson().path("part").asText()).isEqualTo("QT_S_PART1");
        assertThat(lastUserPrompt.get()).contains("Part: QT_S_PART1");
    }

    @Test
    void grade_wrongOverallBandFromLlm_isRecomputedWithoutRetry() throws Exception {
        ObjectNode json = (ObjectNode) objectMapper.readTree(sampleFeedbackJson);
        json.put("overall_band", 6.3);
        json.put("out_of_calibration_range", true);
        nextResponse.set(objectMapper.writeValueAsString(json));

        SpeakingGradingResult result = grader.grade("QT_S_PART2", "Prompt", sampleAsr);

        assertThat(result.getOverallBand()).isEqualByComparingTo(BigDecimal.valueOf(6.0));
        assertThat(result.isOutOfCalibrationRange()).isFalse();
        assertThat(callCount.get()).isEqualTo(1);
    }
}
