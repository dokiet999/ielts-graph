package com.ielts.backend.dto.response;

import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Exercise with its answer key (correct options, explanations). Only returned after a submission,
 * never for practice; see {@link ExerciseDetailPracticeResponse} for the version without answers.
 */
@Data
@Builder
public class ExerciseReviewResponse {
    private UUID id;
    private UUID lessonId;
    private UUID sectionId;
    private UUID courseId;
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
    private List<QuestionGroupReviewResponse> questionGroups;
}
