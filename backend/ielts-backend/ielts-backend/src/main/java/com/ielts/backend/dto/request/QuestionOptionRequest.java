package com.ielts.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class QuestionOptionRequest {

    @NotNull
    private UUID questionId;

    @NotBlank
    private String optionText;

    private Boolean isCorrect = false;

    private BigDecimal point = BigDecimal.ZERO;

    private String explanation;

    private Integer ordering = 0;
}
