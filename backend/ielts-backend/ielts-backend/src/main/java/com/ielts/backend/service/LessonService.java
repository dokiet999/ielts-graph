package com.ielts.backend.service;

import com.ielts.backend.dto.request.UnlockFinalTestRequest;
import com.ielts.backend.dto.response.ExerciseSummaryResponse;
import com.ielts.backend.dto.response.FinalTestSessionDto;
import com.ielts.backend.dto.response.FinalTestStatusResponse;
import com.ielts.backend.dto.response.LessonDetailResponse;

import java.util.List;
import java.util.UUID;

public interface LessonService {

    /**
     * @param username the logged-in user, or null for anonymous access
     */
    LessonDetailResponse getLessonDetail(UUID lessonId, String username);

    /**
     * Exercises of every lesson in a section (mock & final tests excluded), with the user's attempts.
     * Requires an enrollment in the course or owning it.
     */
    List<ExerciseSummaryResponse> getSectionExercises(UUID sectionId, String username);

    /**
     * Mock test exercises of a section (or of its course when the section has none directly),
     * with the user's attempts. Requires an enrollment in the course or owning it.
     */
    List<ExerciseSummaryResponse> getSectionMockTests(UUID sectionId, String username);

    /**
     * Final test status, admin unlock window, and real-time active session for a section/skill.
     */
    FinalTestStatusResponse getSectionFinalTest(UUID sectionId, String username);

    /**
     * Grants/extends admin unlock permission for the section's final test for a number of days.
     */
    FinalTestStatusResponse unlockSectionFinalTest(UUID sectionId, UnlockFinalTestRequest request, String actorUsername);

    /**
     * Revokes admin unlock permission for the section's final test.
     */
    FinalTestStatusResponse lockSectionFinalTest(UUID sectionId, String targetUsername, String actorUsername);

    /**
     * Starts or resumes a wall-clock timed session for the section's final test.
     */
    FinalTestSessionDto startSectionFinalTest(UUID sectionId, String username);
}
