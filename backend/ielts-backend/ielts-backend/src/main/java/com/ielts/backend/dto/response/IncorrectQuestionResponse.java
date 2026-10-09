package com.ielts.backend.dto.response;

import com.ielts.backend.enums.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/** A question answered wrongly or left blank, with the key and explanation (issue #5). */
@Data
@Builder
public class IncorrectQuestionResponse {
    private UUID questionId;
    private Integer number;
    private QuestionType questionType;
    private String questionText;
    /** null when the question was left blank */
    private String userAnswer;
    private String correctAnswer;
    private String explanation;
}
