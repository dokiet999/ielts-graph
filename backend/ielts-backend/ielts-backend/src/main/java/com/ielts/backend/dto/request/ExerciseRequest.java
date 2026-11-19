package com.ielts.backend.dto.request;

import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Data
public class ExerciseRequest {

    private UUID lessonId;

    @NotBlank
    @Size(max = 512)
    private String title;

    private String instruction;

    @Size(max = 512)
    private String audioUrl;

    private Map<String, Object> content;

    @NotNull
    private ExerciseType exerciseType;

    @NotNull
    private SkillType skillType;

    @Positive
    private Integer timeLimit;

    @Min(1)
    private Integer maxAttempts = 1;

    @DecimalMin("0.00")
    private BigDecimal passingScore = BigDecimal.ZERO;

    @PositiveOrZero
    private Integer ordering = 0;
}
