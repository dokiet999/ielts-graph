package com.ielts.backend.dto.response;

import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.SkillType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/** A course the current user is enrolled in, with their progress. */
@Data
@Builder
public class MyCourseResponse {
    private UUID id;
    private String title;
    private String description;
    private String thumbnail;
    private DifficultyLevel difficultyLevel;
    private SkillType skillFocus;
    private String categoryName;
    private UUID teacherId;
    private String teacherName;
    private Integer estimatedDuration;
    private LocalDateTime enrolledAt;
    private LocalDateTime completedAt;
    private int sectionCount;
    private int exerciseCount;
    private int completedExerciseCount;
}
