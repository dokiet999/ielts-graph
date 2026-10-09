package com.ielts.backend.dto.request;

import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.QuestionType;
import com.ielts.backend.enums.SkillType;

/** Optional filters for practice exercise search (UC11, FR-3.01). Null means "no filter". */
public record ExerciseFilter(SkillType skill, DifficultyLevel level, QuestionType questionType, String q) {
}
