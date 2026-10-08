package com.ielts.backend.service;

import com.ielts.backend.dto.response.CourseDetailResponse;
import com.ielts.backend.dto.response.CourseResponse;
import com.ielts.backend.dto.response.LessonSummaryResponse;
import com.ielts.backend.dto.response.PageResponse;
import com.ielts.backend.enums.SkillType;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface CourseService {

    PageResponse<CourseResponse> getCourses(SkillType skill, Pageable pageable);

    CourseDetailResponse getCourseDetail(UUID courseId);

    List<LessonSummaryResponse> getCourseLessons(UUID courseId);
}
