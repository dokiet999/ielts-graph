package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class QuestionScoreResponse {
    private UUID questionId;
    private boolean correct;
    private BigDecimal earned;
}
