package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class QuestionOptionResponse {
    private UUID id;
    private UUID questionId;
    private String optionText;
    private Boolean isCorrect;
    private BigDecimal point;
    private String explanation;
    private Integer ordering;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
