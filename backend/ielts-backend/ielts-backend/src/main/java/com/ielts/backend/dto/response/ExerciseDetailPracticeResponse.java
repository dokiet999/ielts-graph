package com.ielts.backend.dto.response;

import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class ExerciseDetailPracticeResponse {
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
    private Integer totalQuestions;
    private List<QuestionGroupPracticeResponse> questionGroups;
}
