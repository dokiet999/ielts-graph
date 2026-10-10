package com.ielts.backend.controller;

import com.ielts.backend.dto.request.CourseFilter;
import com.ielts.backend.dto.response.CourseDetailResponse;
import com.ielts.backend.dto.response.CourseResponse;
import com.ielts.backend.dto.response.EnrollmentResponse;
import com.ielts.backend.dto.response.LessonSummaryResponse;
import com.ielts.backend.dto.response.MyCourseResponse;
import com.ielts.backend.dto.response.PageResponse;
import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.service.CourseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
    @Operation(summary = "List published courses, filtered by skill, category, level and title keyword")
    public PageResponse<CourseResponse> getCourses(
            @RequestParam(required = false) SkillType skill,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) DifficultyLevel level,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.clamp(size, 1, MAX_PAGE_SIZE),
                // id as tie-breaker keeps paging stable when courses share created_at
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id")));
        return courseService.getCourses(new CourseFilter(skill, categoryId, level, q), pageable);
    }

    @GetMapping("/my")
    @Operation(summary = "Courses the current user is enrolled in, with exercise progress, most recently joined first")
    public List<MyCourseResponse> getMyCourses(@AuthenticationPrincipal UserDetails principal) {
        return courseService.getMyCourses(principal.getUsername());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Course detail with sections and lessons. Logged-in users also get their progress and enrollment")
    public CourseDetailResponse getCourseDetail(@PathVariable UUID id,
                                                @AuthenticationPrincipal UserDetails principal) {
        return courseService.getCourseDetail(id, principal != null ? principal.getUsername() : null);
    }

    @GetMapping("/{id}/lessons")
    @Operation(summary = "All lessons of a course, ordered by section then lesson")
    public List<LessonSummaryResponse> getCourseLessons(@PathVariable UUID id) {
        return courseService.getCourseLessons(id);
    }

    @PostMapping("/{id}/enroll")
    @Operation(summary = "Join a course (students only). Returns 201 when created, 200 when already enrolled")
    public ResponseEntity<EnrollmentResponse> enroll(@PathVariable UUID id,
                                                     @AuthenticationPrincipal UserDetails principal) {
        EnrollmentResponse enrollment = courseService.enroll(id, principal.getUsername());
        return ResponseEntity.status(enrollment.isCreated() ? HttpStatus.CREATED : HttpStatus.OK).body(enrollment);
    }
}
