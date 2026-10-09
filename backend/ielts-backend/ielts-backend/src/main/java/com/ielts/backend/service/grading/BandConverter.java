package com.ielts.backend.service.grading;

import org.springframework.stereotype.Component;

/**
 * Converts a raw score to an IELTS band, for mock tests only (SRS 1.5.1, FR-4.03):
 * practice is never converted to a band (SRS 2.2.2.1). The table is a reference
 * convention of the system, not an official IELTS rule.
 * <p>
 * Moved unchanged from the Listening grading service. The Reading table uses
 * different thresholds and is added with the mock test module.
 */
@Component
public class BandConverter {

    private static final int FULL_TEST_QUESTIONS = 40;

    /**
     * @param correctCount   correct answers
     * @param totalQuestions questions in the test; scaled to 40 when different
     */
    public double listening(int correctCount, int totalQuestions) {
        if (totalQuestions <= 0 || correctCount <= 0) {
            return 0.0;
        }

        int scaledCorrect = totalQuestions == FULL_TEST_QUESTIONS
                ? correctCount
                : (int) Math.round(((double) correctCount / totalQuestions) * FULL_TEST_QUESTIONS);

        scaledCorrect = Math.max(0, Math.min(FULL_TEST_QUESTIONS, scaledCorrect));

        if (scaledCorrect >= 39) return 9.0;
        if (scaledCorrect >= 37) return 8.5;
        if (scaledCorrect >= 35) return 8.0;
        if (scaledCorrect >= 32) return 7.5;
        if (scaledCorrect >= 30) return 7.0;
        if (scaledCorrect >= 26) return 6.5;
        if (scaledCorrect >= 23) return 6.0;
        if (scaledCorrect >= 18) return 5.5;
        if (scaledCorrect >= 16) return 5.0;
        if (scaledCorrect >= 13) return 4.5;
        if (scaledCorrect >= 10) return 4.0;
        if (scaledCorrect >= 8) return 3.5;
        if (scaledCorrect >= 6) return 3.0;
        if (scaledCorrect >= 4) return 2.5;
        if (scaledCorrect >= 2) return 2.0;
        return 1.0;
    }
}
