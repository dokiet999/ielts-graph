package com.ielts.backend.dto.request;

import com.ielts.backend.enums.QuestionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    private String imageUrl;

    private String audioUrl;

    private String readingPassage;

    private String explanation;

    private BigDecimal points = BigDecimal.ONE;

    private Integer ordering = 0;
}
