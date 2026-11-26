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
public class AdminCourseSummaryResponse {
    private UUID id;
    private String title;
    private String description;
    private String thumbnail;
    private UUID teacherId;
    private String teacherName;
    private UUID categoryId;
    private String categoryName;
    private SkillType skillFocus;
    private DifficultyLevel difficultyLevel;
    private Integer estimatedDuration;
    private Integer maxStudents;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Boolean isFeatured;
    private Boolean isActive;
    private ContentStatus status;
    private LocalDateTime publishedAt;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private String reviewNote;
    private String deactivationReason;
    private long totalLessons;
    private long enrollmentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
