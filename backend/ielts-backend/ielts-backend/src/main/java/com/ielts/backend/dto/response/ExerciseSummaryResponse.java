package com.ielts.backend.dto.response;

import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class ExerciseSummaryResponse {
    private UUID id;
    private String title;
    private ExerciseType exerciseType;
    private SkillType skillType;
    private Integer timeLimit;
    private Integer ordering;
    private UUID lessonId;
    private String lessonTitle;
    private UUID sectionId;
    private UUID courseId;
    private int questionCount;
    /** Sum of the question points. */
    private BigDecimal maxScore;
    /** Attempts of the current user; 0 when anonymous. */
    private int attemptCount;
    /** Highest graded score of the current user, null when nothing was graded yet. */
    private BigDecimal bestScore;
    private UUID lastSubmissionId;
}
