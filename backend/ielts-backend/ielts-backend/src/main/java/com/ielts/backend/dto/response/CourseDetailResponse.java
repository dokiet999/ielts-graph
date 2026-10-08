package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CourseDetailResponse {
    private CourseResponse course;
    private int totalLessons;
    private List<SectionWithLessonsResponse> sections;
}
