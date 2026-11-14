package com.ielts.backend.service.grading;

import com.ielts.backend.enums.SkillType;
import org.springframework.stereotype.Component;

/**
 * Converts a raw score to an IELTS band, for mock tests only (SRS 1.5.1, FR-4.03):
 * practice is never converted to a band (SRS 2.2.2.1). The table is a reference
 * convention of the system, not an official IELTS rule.
 */
@Component
public class BandConverter {

    private static final int FULL_TEST_QUESTIONS = 40;

    public Double convert(SkillType skillType, int correctCount, int totalQuestions) {
        if (skillType == SkillType.LISTENING) {
            return listening(correctCount, totalQuestions);
        }
        if (skillType == SkillType.READING) {
            return reading(correctCount, totalQuestions);
        }
        return null;
    }

    /**
     * @param correctCount   correct answers
     * @param totalQuestions questions in the test; scaled to 40 when different
     */
    public double listening(int correctCount, int totalQuestions) {
        if (totalQuestions <= 0 || correctCount <= 0) {
            return 0.0;
        }

        int scaledCorrect = scaleTo40(correctCount, totalQuestions);

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

    /**
     * Academic Reading band conversion table.
     *
     * @param correctCount   correct answers
     * @param totalQuestions questions in the test; scaled to 40 when different
     */
    public double reading(int correctCount, int totalQuestions) {
        if (totalQuestions <= 0 || correctCount <= 0) {
            return 0.0;
        }

        int scaledCorrect = scaleTo40(correctCount, totalQuestions);

        if (scaledCorrect >= 39) return 9.0;
        if (scaledCorrect >= 37) return 8.5;
        if (scaledCorrect >= 35) return 8.0;
        if (scaledCorrect >= 33) return 7.5;
        if (scaledCorrect >= 30) return 7.0;
        if (scaledCorrect >= 27) return 6.5;
        if (scaledCorrect >= 23) return 6.0;
        if (scaledCorrect >= 19) return 5.5;
        if (scaledCorrect >= 15) return 5.0;
        if (scaledCorrect >= 13) return 4.5;
        if (scaledCorrect >= 10) return 4.0;
        if (scaledCorrect >= 8) return 3.5;
        if (scaledCorrect >= 6) return 3.0;
        if (scaledCorrect >= 4) return 2.5;
        if (scaledCorrect >= 2) return 2.0;
        return 1.0;
    }

    private static int scaleTo40(int correctCount, int totalQuestions) {
        int scaled = totalQuestions == FULL_TEST_QUESTIONS
                ? correctCount
                : (int) Math.round(((double) correctCount / totalQuestions) * FULL_TEST_QUESTIONS);
        return Math.max(0, Math.min(FULL_TEST_QUESTIONS, scaled));
    }
}
