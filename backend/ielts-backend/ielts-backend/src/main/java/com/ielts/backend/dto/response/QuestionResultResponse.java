package com.ielts.backend.dto.response;

import com.ielts.backend.enums.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class QuestionResultResponse {
    private UUID questionId;
    private String questionText;
    private QuestionType questionType;
    private Object userAnswer;
    private Object correctAnswer;
    private Boolean isCorrect;
    private BigDecimal pointsEarned;
    private BigDecimal maxPoints;
    private String explanation;
}
