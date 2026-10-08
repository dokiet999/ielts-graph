package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class LessonDetailResponse {
    private LessonResponse lesson;
    private UUID courseId;
    private String courseTitle;
    private UUID sectionId;
    private String sectionTitle;
    private List<ExerciseSummaryResponse> exercises;
}
