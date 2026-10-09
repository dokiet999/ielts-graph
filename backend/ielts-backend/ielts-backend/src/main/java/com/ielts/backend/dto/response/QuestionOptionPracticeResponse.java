package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class QuestionOptionPracticeResponse {
    private UUID id;
    private String optionText;
    private Integer ordering;
}
