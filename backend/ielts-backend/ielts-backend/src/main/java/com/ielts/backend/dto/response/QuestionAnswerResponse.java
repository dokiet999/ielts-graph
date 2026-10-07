package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class QuestionAnswerResponse {
    private UUID id;
    private UUID submissionId;
    private UUID questionId;
    private String answerText;
    private List<UUID> selectedOptions;
    private String mediaUrl;
    private Boolean isCorrect;
    private BigDecimal pointsEarned;
    private BigDecimal aiPoints;
    private String aiFeedback;
    private BigDecimal teacherPoints;
    private String teacherFeedback;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
