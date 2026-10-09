package com.ielts.backend.dto.response;

import com.ielts.backend.enums.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Learner view of a question: no explanation. */
@Data
@Builder
public class ExerciseQuestionResponse {
    private UUID id;
    private Integer number;
    private String questionText;
    private QuestionType questionType;
    private String imageUrl;
    private String audioUrl;
    private String readingPassage;
    private BigDecimal points;
    private List<ExerciseOptionResponse> options;
}
