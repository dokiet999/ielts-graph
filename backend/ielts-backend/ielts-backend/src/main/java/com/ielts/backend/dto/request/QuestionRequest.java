package com.ielts.backend.dto.request;

import com.ielts.backend.enums.QuestionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class QuestionRequest {

    @NotNull
    private UUID exerciseId;

    private UUID questionGroupId;

    @NotBlank
    private String questionText;

    @NotNull
    private QuestionType questionType;

    @Size(max = 512)
    private String imageUrl;

    @Size(max = 512)
    private String audioUrl;

    private String readingPassage;

    private String explanation;

    @DecimalMin("0.00")
    private BigDecimal points = BigDecimal.ONE;

    @PositiveOrZero
    private Integer ordering = 0;
}
