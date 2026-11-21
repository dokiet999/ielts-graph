package com.ielts.backend.enums;

import java.util.List;

public enum ExerciseType {
    LESSON,
    MOCK_TEST,
    PRACTICE,
    FINAL_TEST;

    public static final List<ExerciseType> TEST_TYPES = List.of(MOCK_TEST, FINAL_TEST);

    public boolean isTestWithBand() {
        return this == MOCK_TEST || this == FINAL_TEST;
    }
}
