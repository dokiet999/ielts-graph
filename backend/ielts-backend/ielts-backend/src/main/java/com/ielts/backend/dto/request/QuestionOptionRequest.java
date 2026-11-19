package com.ielts.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
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

    @DecimalMin("0.00")
    private BigDecimal point = BigDecimal.ZERO;

    private String explanation;

    @PositiveOrZero
    private Integer ordering = 0;
}
