package com.ielts.backend.dto.response;

import com.ielts.backend.enums.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class QuestionResponse {
    private UUID id;
    private UUID exerciseId;
    private UUID questionGroupId;
    private String questionText;
    private QuestionType questionType;
    private String imageUrl;
    private String audioUrl;
    private String readingPassage;
    private String explanation;
    private BigDecimal points;
    private Integer ordering;
    private List<QuestionOptionResponse> options;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
