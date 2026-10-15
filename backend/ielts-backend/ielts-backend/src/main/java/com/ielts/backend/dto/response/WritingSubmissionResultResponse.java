package com.ielts.backend.dto.response;

import com.ielts.backend.enums.GradingMethod;
import com.ielts.backend.enums.SubmissionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Result returned upon submitting an IELTS Writing essay.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WritingSubmissionResultResponse {

    private UUID submissionId;
    private UUID exerciseId;
    private String exerciseTitle;
    private Integer attemptNumber;
    private BigDecimal overallBand;
    private Boolean outOfCalibrationRange;
    private SubmissionStatus status;
    private GradingMethod gradingMethod;
    private Integer timeSpent;
    private LocalDateTime submittedAt;
    private String taskType;

    // Structured AI feedback
    private String summary;
    private List<String> improvements;
    private String aiModel;
    private String aiPromptVersion;
    private Integer aiLatencyMs;
    private Map<String, Object> rawFeedback;
}
