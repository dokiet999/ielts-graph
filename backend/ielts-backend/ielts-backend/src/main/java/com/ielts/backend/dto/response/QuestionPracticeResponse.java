package com.ielts.backend.dto.response;

import com.ielts.backend.enums.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class QuestionPracticeResponse {
    private UUID id;
    private String questionText;
    private QuestionType questionType;
    private String imageUrl;
    private String audioUrl;
    private String readingPassage;
    private BigDecimal points;
    private Integer ordering;
    private List<QuestionOptionPracticeResponse> options;
}
