package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class SectionWithLessonsResponse {
    private UUID id;
    private String title;
    private String description;
    private Integer ordering;
    private List<LessonSummaryResponse> lessons;
}
