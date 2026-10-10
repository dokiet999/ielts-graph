package com.ielts.backend.dto.response;

import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import lombok.Data;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** One attempt in the learner's history. */
@Data
@SuperBuilder
public class SubmissionSummaryResponse {
    private UUID id;
    private UUID exerciseId;
    private String exerciseTitle;
    private SkillType skillType;
    private ExerciseType exerciseType;
    /** Null when the exercise does not belong to a lesson. */
    private UUID courseId;
    private UUID sectionId;
    private Integer attemptNumber;
    private SubmissionStatus status;
    private BigDecimal score;
    private BigDecimal maxScore;
    private int correctCount;
    private int questionCount;
    /** Seconds, as sent by the client; null when not sent. */
    private Integer timeSpent;
    private LocalDateTime submittedAt;
}
