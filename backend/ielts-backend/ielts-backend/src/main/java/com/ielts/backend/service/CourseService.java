package com.ielts.backend.service;

import com.ielts.backend.dto.request.CourseFilter;
import com.ielts.backend.dto.response.CourseDetailResponse;
import com.ielts.backend.dto.response.CourseResponse;
import com.ielts.backend.dto.response.EnrollmentResponse;
import com.ielts.backend.dto.response.LessonSummaryResponse;
import com.ielts.backend.dto.response.MyCourseResponse;
import com.ielts.backend.dto.response.PageResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface CourseService {

    PageResponse<CourseResponse> getCourses(CourseFilter filter, Pageable pageable);

    /**
     * @param username the logged-in user, or null for anonymous access (no progress, no enrollment)
     */
    CourseDetailResponse getCourseDetail(UUID courseId, String username);

    List<LessonSummaryResponse> getCourseLessons(UUID courseId);

    EnrollmentResponse enroll(UUID courseId, String username);

    /** Visible courses the user is actively enrolled in, most recently joined first. */
    List<MyCourseResponse> getMyCourses(String username);
}
