package com.ielts.backend.dto.response;

import com.ielts.backend.enums.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/** Result for one question type in a submission (SRS 2.2.2.1: statistics by QuestionType). */
@Data
@Builder
public class QuestionTypeStatResponse {
    private QuestionType questionType;
    private int correct;
    private int total;
    private BigDecimal percentage;
}
