package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.constant.PaginationConstants;
import com.ielts.backend.dto.request.CourseFilter;
import com.ielts.backend.dto.response.CourseDetailResponse;
import com.ielts.backend.dto.response.CourseResponse;
import com.ielts.backend.dto.response.EnrollmentResponse;
import com.ielts.backend.dto.response.LessonSummaryResponse;
import com.ielts.backend.dto.response.MyCourseResponse;
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
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
@Tag(name = "Courses", description = "Browse IELTS courses and their lessons")
public class CourseController {

    private final CourseService courseService;

    @GetMapping
    @Operation(summary = "List published courses, filtered by skill, category, level and title keyword")
    public BaseResponse<List<CourseResponse>> getCourses(
            @ModelAttribute CourseFilter filter,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_PAGE_STR) int page,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_SIZE_STR) int size) {
        PageRequest pageable = PaginationConstants.of(
                page,
                size,
                // id as tie-breaker keeps paging stable when courses share created_at
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id")));
        return BaseResponse.ofSuccess(courseService.getCourses(filter, pageable));
    }

    @GetMapping("/my")
    @Operation(summary = "Courses the current user is enrolled in, with exercise progress, most recently joined first")
    public BaseResponse<List<MyCourseResponse>> getMyCourses(@AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(courseService.getMyCourses(principal.getUsername()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Course detail with sections and lessons. Logged-in users also get their progress and enrollment")
    public BaseResponse<CourseDetailResponse> getCourseDetail(@PathVariable UUID id,
                                                              @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(courseService.getCourseDetail(id, principal != null ? principal.getUsername() : null));
    }

    @GetMapping("/{id}/lessons")
    @Operation(summary = "All lessons of a course, ordered by section then lesson")
    public BaseResponse<List<LessonSummaryResponse>> getCourseLessons(@PathVariable UUID id) {
        return BaseResponse.ofSuccess(courseService.getCourseLessons(id));
    }

    @PostMapping("/{id}/enroll")
    @Operation(summary = "Join a course (students only). Returns 201 when created, 200 when already enrolled")
    public ResponseEntity<BaseResponse<EnrollmentResponse>> enroll(@PathVariable UUID id,
                                                                   @AuthenticationPrincipal UserDetails principal) {
        EnrollmentResponse enrollment = courseService.enroll(id, principal.getUsername());
        return enrollment.isCreated()
                ? ResponseEntity.status(HttpStatus.CREATED).body(BaseResponse.ofCreated(enrollment))
                : ResponseEntity.ok(BaseResponse.ofSuccess(enrollment));
    }
}
