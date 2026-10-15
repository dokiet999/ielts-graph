package com.ielts.backend.service.grading;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class WritingGradingResult {

    private final String taskType;
    private final BigDecimal overallBand;
    private final boolean outOfCalibrationRange;
    private final List<CriterionResult> criteria;
    private final String summary;
    private final List<String> improvements;
    private final JsonNode rawJson;
    private final java.util.Map<String, Object> feedbackMap;
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
