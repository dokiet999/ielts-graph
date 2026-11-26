package com.ielts.backend.dto.response;

import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.SkillType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AdminCourseDetailResponse {
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
    private long enrollmentCount;
    private Boolean isFeatured;
    private Boolean isActive;
    private LocalDateTime publishedAt;
    private ContentStatus status;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private UUID reviewedById;
    private String reviewedByName;
    private String reviewNote;
    private String deactivationReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int totalLessons;
    private List<AdminSectionResponse> sections;

    @Data
    @Builder
    public static class AdminSectionResponse {
        private UUID id;
        private String title;
        private String description;
        private Integer ordering;
        private List<AdminLessonResponse> lessons;
    }

    @Data
    @Builder
    public static class AdminLessonResponse {
        private UUID id;
        private UUID sectionId;
        private String title;
        private String lessonType;
        private String videoUrl;
        private Integer videoDuration;
        private String documentUrl;
        private Integer ordering;
        private Boolean isPreview;
        private ContentStatus status;
        private int exerciseCount;
        private LocalDateTime submittedAt;
        private LocalDateTime reviewedAt;
        private String reviewNote;
    }
}

