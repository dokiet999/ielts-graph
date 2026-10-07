package com.ielts.backend.dto.response;

import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class ExerciseResponse {
    private UUID id;
    private UUID lessonId;
    private String title;
    private String instruction;
    private String audioUrl;
    private Map<String, Object> content;
    private ExerciseType exerciseType;
    private SkillType skillType;
    private Integer timeLimit;
    private Integer maxAttempts;
    private BigDecimal passingScore;
    private Integer ordering;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
