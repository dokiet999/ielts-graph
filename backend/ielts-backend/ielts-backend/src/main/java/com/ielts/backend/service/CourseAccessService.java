package com.ielts.backend.service;

import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Lesson;

/**
 * FR-2.01: content inside a course can only be opened after joining the course.
 * Shared by lesson, exercise and submission flows.
 * Throws 404 when the course is not visible, 401 when login is required, 403 when not allowed.
 */
public interface CourseAccessService {

    /**
     * Preview lessons are open to everyone. Other lessons require an active enrollment,
     * or being the teacher who owns the course (permission matrix note 3).
     *
     * @param username the logged-in user, or null for anonymous access
     */
    void checkLessonAccess(Lesson lesson, String username);

    /**
     * Practice exercises that do not belong to a lesson (UC11, UC12) are open to everyone.
     * Exercises inside a lesson follow {@link #checkLessonAccess}.
     *
     * @param username the logged-in user, or null for anonymous access
     */
    void checkExerciseAccess(Exercise exercise, String username);
}
