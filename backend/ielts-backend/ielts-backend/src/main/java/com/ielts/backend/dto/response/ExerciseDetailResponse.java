package com.ielts.backend.dto.response;

import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * An exercise as the learner sees it before submitting: no answer keys,
 * no explanations and no transcript (see ExerciseMapper).
 */
@Data
@Builder
public class ExerciseDetailResponse {
    private UUID id;
    private UUID lessonId;
    private String title;
    private String instruction;
    private String audioUrl;
    private Map<String, Object> content;
    private ExerciseType exerciseType;
    private SkillType skillType;
    private DifficultyLevel difficultyLevel;
    private Integer timeLimit;
    private Integer maxAttempts;
    private int totalQuestions;
    private List<ExerciseQuestionGroupResponse> groups;
}
