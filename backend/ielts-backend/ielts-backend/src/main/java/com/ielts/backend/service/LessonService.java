package com.ielts.backend.service;

import com.ielts.backend.dto.response.ExerciseSummaryResponse;
import com.ielts.backend.dto.response.LessonDetailResponse;

import java.util.List;
import java.util.UUID;

public interface LessonService {

    /**
     * @param username the logged-in user, or null for anonymous access
     */
    LessonDetailResponse getLessonDetail(UUID lessonId, String username);

    /**
     * Exercises of every lesson in a section (mock tests excluded), with the user's attempts.
     * Requires an enrollment in the course or owning it.
     */
    List<ExerciseSummaryResponse> getSectionExercises(UUID sectionId, String username);
}
