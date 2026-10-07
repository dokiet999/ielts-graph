package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class LessonResponse {
    private UUID id;
    private UUID sectionId;
    private String title;
    private String lessonType;
    private String videoUrl;
    private Integer videoDuration;
    private String documentUrl;
    private Integer ordering;
    private Boolean isPreview;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
