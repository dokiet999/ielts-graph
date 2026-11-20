package com.ielts.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.SkillType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ReviewQueueItemResponse {
    private UUID id;
    private String title;
    private String teacherName;
    private SkillType skillFocus;
    private ContentStatus status;
    private LocalDateTime submittedAt;
    private long waitingDays;
    private LocalDateTime reviewedAt;
    private String reviewNote;

    // Populated for course review items
    private Long pendingLessonCount;

    // Populated for lesson review items
    private UUID courseId;
    private String courseTitle;
    private UUID sectionId;
    private String sectionTitle;
    private String lessonType;
}

