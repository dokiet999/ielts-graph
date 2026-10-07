package com.ielts.backend.dto.response;

import com.ielts.backend.enums.GradingMethod;
import com.ielts.backend.enums.SubmissionStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class SubmissionResponse {
    private UUID id;
    private UUID userId;
    private String userFullName;
    private UUID exerciseId;
    private String exerciseTitle;
    private Integer attemptNumber;
    private Map<String, Object> answers;
    private BigDecimal score;
    private BigDecimal maxScore;
    private BigDecimal aiScore;
    private String aiFeedback;
    private BigDecimal teacherScore;
    private String teacherFeedback;
    private GradingMethod gradingMethod;
    private UUID gradedById;
    private String gradedByName;
    private LocalDateTime gradedAt;
    private SubmissionStatus status;
    private LocalDateTime submittedAt;
    private List<QuestionAnswerResponse> questionAnswers;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
