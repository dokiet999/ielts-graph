package com.ielts.backend.dto.request;

import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.SkillType;

import java.util.UUID;

/** Optional filters for course search (FR-2.01, UC11). Null means "no filter". */
public record CourseFilter(SkillType skill, UUID categoryId, DifficultyLevel level, String q) {
}
