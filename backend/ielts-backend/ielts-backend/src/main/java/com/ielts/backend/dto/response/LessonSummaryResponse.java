package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class LessonSummaryResponse {
    private UUID id;
    private UUID sectionId;
    private String title;
    private String lessonType;
    private Integer videoDuration;
    private Integer ordering;
    private Boolean isPreview;
}
