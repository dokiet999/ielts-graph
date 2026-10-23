package com.ielts.backend.service.grading;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Result of grading one Speaking answer. Shaped like {@link WritingGradingResult} so the callers can treat both alike. */
@Getter
@Builder
public class SpeakingGradingResult {

    /** QuestionType ID: QT_S_PART1, QT_S_PART2 or QT_S_PART3. */
    private final String part;
    private final BigDecimal overallBand;
    private final boolean outOfCalibrationRange;
    private final List<CriterionResult> criteria;
    private final String summary;
    private final List<String> improvements;
    /** The validated speaking_feedback JSON after filtering, ready to store as a map. */
    private final Map<String, Object> feedbackMap;
    private final JsonNode rawJson;
    private final Integer latencyMs;
    private final String promptVersion;

    @Getter
    @Builder
    public static class CriterionResult {
        private final String criterionId;
        private final BigDecimal band;
        private final String feedback;
        private final List<EvidenceResult> evidence;
    }

    @Getter
    @Builder
    public static class EvidenceResult {
        private final String quote;
        private final String comment;
        private final String errorType;
    }
}
