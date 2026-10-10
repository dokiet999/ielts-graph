package com.ielts.backend.service.progress;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Size of an exercise and the attempts of one user on it.
 *
 * @param bestScore        highest graded score, null when nothing was graded yet
 * @param lastSubmissionId latest attempt, null when the user never submitted
 */
public record ExerciseStats(int questionCount, BigDecimal maxScore, int attemptCount,
                            BigDecimal bestScore, UUID lastSubmissionId) {

    public static final ExerciseStats EMPTY = new ExerciseStats(0, BigDecimal.ZERO, 0, null, null);
}
