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
    /** Exercises that count towards progress (in a lesson, with questions, not a mock test). */
    private int exerciseCount;
    /** Exercises the current user has a graded submission for; null when anonymous. */
    private Integer completedExerciseCount;
    /** The current user's active enrollment; null when anonymous or not enrolled. */
    private CourseEnrollmentResponse enrollment;
}
