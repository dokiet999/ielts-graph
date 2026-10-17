package com.ielts.backend.service.grading;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ielts.backend.exception.WritingGradingException;
import com.ielts.backend.service.llm.LlmClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WritingEssayGraderTest {

    @Mock
    private LlmClient llmClient;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private WritingEssayGrader grader;
    private String sampleJson;

    // Student essay matching quotes in writing_feedback.sample.json
    private final String sampleEssay = """
            In modern society, many people argue that governments should invest more in renewable energy
            because this is a very important issue in today society.
            Furthermore, renewable power protects nature. Moreover, green energy creates jobs. In addition, it reduces bills.
            However, fossil fuel reliance remains a very important important factor in industrial progress.
            Some factories make the environment polluted due to lack of regulation.
            Therefore, The governments are responsible for provide clean energy to citizens.
            In conclusion, environment is important resource that needs preservation.
            """;

    @BeforeEach
    void setUp() throws Exception {
        grader = new WritingEssayGrader(llmClient, objectMapper);
        grader.init();

        ClassPathResource sampleResource = new ClassPathResource("ai/schema/writing_feedback.sample.json");
        try (InputStream is = sampleResource.getInputStream()) {
            sampleJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    void grade_validResponse_returnsCorrectBandsAndStructure() {
        when(llmClient.chat(any(), any())).thenReturn(sampleJson);

        WritingGradingResult result = grader.grade("Discuss renewable energy", sampleEssay);

        assertThat(result).isNotNull();
        assertThat(result.getTaskType()).isEqualTo("QT_W2_OPINION");
        assertThat(result.getOverallBand()).isEqualByComparingTo(BigDecimal.valueOf(6.5));
        assertThat(result.isOutOfCalibrationRange()).isFalse();
        assertThat(result.getCriteria()).hasSize(4);
        assertThat(result.getSummary()).isNotBlank();
        assertThat(result.getImprovements()).hasSize(4);
        assertThat(result.getImprovements().get(0)).contains("250");

        verify(llmClient, times(1)).chat(any(), any());
    }

    @Test
    void grade_markdownCodeBlockWrapped_parsesSuccessfully() {
        String wrappedJson = "```json\n" + sampleJson + "\n```";
        when(llmClient.chat(any(), any())).thenReturn(wrappedJson);

        WritingGradingResult result = grader.grade("Discuss renewable energy", sampleEssay);

        assertThat(result).isNotNull();
        assertThat(result.getOverallBand()).isEqualByComparingTo(BigDecimal.valueOf(6.5));
    }

    @Test
    void grade_hallucinatedQuote_removesQuoteWithoutThrowing() {
        // Essay does not contain the sample quotes -> hallucinated quotes removed
        String differentEssay = "This is a completely different essay about art and history in museums.";
        when(llmClient.chat(any(), any())).thenReturn(sampleJson);

        WritingGradingResult result = grader.grade("Prompt", differentEssay);
        assertThat(result).isNotNull();
        boolean hasAnyQuotes = result.getCriteria().stream()
                .flatMap(c -> c.getEvidence().stream())
                .anyMatch(e -> e.getQuote() != null && !e.getQuote().isBlank());
        assertThat(hasAnyQuotes).isFalse();
    }

    @Test
    void grade_malformedJson_retriesOnceAndThrows() {
        when(llmClient.chat(any(), any())).thenReturn("Sorry, I cannot grade this essay.");

        assertThatThrownBy(() -> grader.grade("Prompt", sampleEssay))
                .isInstanceOf(WritingGradingException.class)
                .hasMessageContaining("LLM response is not valid JSON");

        verify(llmClient, times(2)).chat(any(), any());
    }

    @Test
    void grade_schemaViolation_retriesOnceAndThrows() {
        String badSchemaJson = """
                {
                  "task_type": "TASK_2",
                  "overall_band": 6.5,
                  "summary": "Too short",
                  "improvements": []
                }
                """;
        when(llmClient.chat(any(), any())).thenReturn(badSchemaJson);

        assertThatThrownBy(() -> grader.grade("Prompt", sampleEssay))
                .isInstanceOf(WritingGradingException.class);

        verify(llmClient, times(2)).chat(any(), any());
    }

    @Test
    void parseAndValidate_ieltsRoundingRule_verifications() {
        // sampleJson has: TR=6, CC=6, LR=7, GRA=6 -> sum = 25, mean = 6.25 -> rounds to 6.5
        WritingGradingResult result625 = grader.parseAndValidate(sampleJson, sampleEssay);
        assertThat(result625.getOverallBand()).isEqualByComparingTo(BigDecimal.valueOf(6.5));

        // Test mean 6.0 (bands: 6, 6, 6, 6) -> sum = 24 -> rounds to 6.0
        String jsonMean60 = sampleJson.replace("\"band\": 7", "\"band\": 6");
        WritingGradingResult result60 = grader.parseAndValidate(jsonMean60, sampleEssay);
        assertThat(result60.getOverallBand()).isEqualByComparingTo(BigDecimal.valueOf(6.0));
    }

    @Test
    void grade_wrongOverallBandFromLlm_isRecomputedWithoutRetry() throws Exception {
        ObjectNode json = (ObjectNode) objectMapper.readTree(sampleJson);
        json.put("overall_band", 6.3);          // not a multiple of 0.5, would fail the schema
        json.put("out_of_calibration_range", true);
        when(llmClient.chat(any(), any())).thenReturn(objectMapper.writeValueAsString(json));

        WritingGradingResult result = grader.grade("QT_W2_OPINION", "Prompt", sampleEssay, 300);

        assertThat(result.getOverallBand()).isEqualByComparingTo(BigDecimal.valueOf(6.5));
        assertThat(result.isOutOfCalibrationRange()).isFalse();
        verify(llmClient, times(1)).chat(any(), any());
    }

    @Test
    void grade_missingOverallBandFromLlm_isFilledIn() throws Exception {
        ObjectNode json = (ObjectNode) objectMapper.readTree(sampleJson);
        json.remove("overall_band");
        json.remove("out_of_calibration_range");
        when(llmClient.chat(any(), any())).thenReturn(objectMapper.writeValueAsString(json));

        WritingGradingResult result = grader.grade("QT_W2_OPINION", "Prompt", sampleEssay, 300);

        assertThat(result.getOverallBand()).isEqualByComparingTo(BigDecimal.valueOf(6.5));
        assertThat(result.getRawJson().path("overall_band").asDouble()).isEqualTo(6.5);
        verify(llmClient, times(1)).chat(any(), any());
    }

    @Test
    void grade_taskFromExercise_overridesTaskReturnedByLlm() {
        when(llmClient.chat(any(), any())).thenReturn(sampleJson);   // sample says QT_W2_OPINION

        WritingGradingResult result = grader.grade("QT_W2_DISCUSSION", "Prompt", sampleEssay, 300);

        assertThat(result.getTaskType()).isEqualTo("QT_W2_DISCUSSION");
        assertThat(result.getRawJson().path("task").asText()).isEqualTo("QT_W2_DISCUSSION");

        ArgumentCaptor<String> userMessage = ArgumentCaptor.forClass(String.class);
        verify(llmClient).chat(any(), userMessage.capture());
        assertThat(userMessage.getValue()).contains("Task: QT_W2_DISCUSSION");
    }

    @Test
    void grade_exerciseWithoutTask_defaultsToOpinion() {
        when(llmClient.chat(any(), any())).thenReturn(sampleJson);

        WritingGradingResult result = grader.grade(null, "Prompt", sampleEssay, 300);

        assertThat(result.getTaskType()).isEqualTo("QT_W2_OPINION");
    }
}
