package com.ielts.backend.dto.response;

import com.ielts.backend.enums.GradingMethod;
import com.ielts.backend.enums.SubmissionStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class SubmissionResultResponse {
    private UUID submissionId;
    private UUID exerciseId;
    private String exerciseTitle;
    private Integer attemptNumber;
    private BigDecimal score;
    private BigDecimal maxScore;
    private BigDecimal percentage;
    private Double bandScore;
    private Integer correctCount;
    private Integer totalQuestions;
    private Boolean passed;
    private GradingMethod gradingMethod;
    private SubmissionStatus status;
    private Integer timeSpent;
    private LocalDateTime submittedAt;
    private List<QuestionResultResponse> details;
}
