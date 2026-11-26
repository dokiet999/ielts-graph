package com.ielts.backend.dto.response;

import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.SkillType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TeacherCourseSummaryResponse {
    private UUID id;
    private String title;
    private String description;
    private SkillType skillFocus;
    private DifficultyLevel difficultyLevel;
    private UUID categoryId;
    private String categoryName;
    private String thumbnail;
    private Integer estimatedDuration;
    private Integer maxStudents;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private long enrollmentCount;
    private ContentStatus status;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private String reviewNote;
    private String deactivationReason;
    private LocalDateTime publishedAt;
    private Boolean isActive;
    private long totalLessons;
    private long pendingLessonCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

