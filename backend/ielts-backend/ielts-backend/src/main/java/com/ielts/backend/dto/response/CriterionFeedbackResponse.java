package com.ielts.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Detailed feedback for an IELTS Writing criterion.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CriterionFeedbackResponse {

    private String criterionId;
    private String name;
    private BigDecimal band;
    private String feedback;
    private List<EvidenceResponse> evidence;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EvidenceResponse {
        private String quote;
        private String comment;
        private String errorType;
    }

    public static String resolveName(String criterionId) {
        if (criterionId == null) return "Criterion";
        return switch (criterionId) {
            case "CRIT_W2_TA", "CRIT_W_TA" -> "Task Achievement";
            case "CRIT_W_TR" -> "Task Response";
            case "CRIT_W2_CC", "CRIT_W_CC" -> "Coherence and Cohesion";
            case "CRIT_W2_LR", "CRIT_W_LR" -> "Lexical Resource";
            case "CRIT_W2_GRA", "CRIT_W_GRA" -> "Grammatical Range and Accuracy";
            default -> criterionId;
        };
    }
}
