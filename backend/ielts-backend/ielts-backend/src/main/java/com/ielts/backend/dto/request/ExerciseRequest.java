package com.ielts.backend.dto.request;

import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    private String audioUrl;

    private Map<String, Object> content;

    @NotNull
    private ExerciseType exerciseType;

    @NotNull
    private SkillType skillType;

    private Integer timeLimit;

    private Integer maxAttempts = 1;

    private BigDecimal passingScore = BigDecimal.ZERO;

    private Integer ordering = 0;
}
