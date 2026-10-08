package com.ielts.backend.controller;

import com.ielts.backend.dto.response.CourseDetailResponse;
import com.ielts.backend.dto.response.CourseResponse;
import com.ielts.backend.dto.response.LessonSummaryResponse;
import com.ielts.backend.dto.response.PageResponse;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.service.CourseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
@Tag(name = "Courses", description = "Browse IELTS courses and their lessons")
public class CourseController {

    private static final int MAX_PAGE_SIZE = 100;

    private final CourseService courseService;

    @GetMapping
    @Operation(summary = "List active courses, optionally filtered by skill")
    public PageResponse<CourseResponse> getCourses(
            @RequestParam(required = false) SkillType skill,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.clamp(size, 1, MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return courseService.getCourses(skill, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Course detail with sections and lessons")
    public CourseDetailResponse getCourseDetail(@PathVariable UUID id) {
        return courseService.getCourseDetail(id);
    }

    @GetMapping("/{id}/lessons")
    @Operation(summary = "All lessons of a course, ordered by section then lesson")
    public List<LessonSummaryResponse> getCourseLessons(@PathVariable UUID id) {
        return courseService.getCourseLessons(id);
    }
}
