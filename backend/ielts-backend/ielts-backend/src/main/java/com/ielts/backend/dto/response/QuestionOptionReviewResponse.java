package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class QuestionOptionReviewResponse {
    private UUID id;
    private String optionText;
    private Integer ordering;
    /** For FILL_BLANK every correct option is an accepted spelling. */
    private Boolean isCorrect;
}
