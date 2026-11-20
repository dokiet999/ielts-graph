package com.ielts.backend.service;

import com.ielts.backend.dto.response.AdminCourseSummaryResponse;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.SkillType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface AdminCourseService {

    Page<AdminCourseSummaryResponse> listCourses(
            ContentStatus status,
            Boolean isActive,
            SkillType skill,
            UUID categoryId,
            String q,
            Pageable pageable);

    AdminCourseSummaryResponse setFeatured(UUID courseId, boolean featured);

    AdminCourseSummaryResponse deactivateCourse(UUID courseId, String reason);

    AdminCourseSummaryResponse activateCourse(UUID courseId);
}
