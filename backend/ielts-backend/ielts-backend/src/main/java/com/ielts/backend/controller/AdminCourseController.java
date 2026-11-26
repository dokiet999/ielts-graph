package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.constant.PaginationConstants;
import com.ielts.backend.dto.request.CourseFeatureRequest;
import com.ielts.backend.dto.request.DeactivateCourseRequest;
import com.ielts.backend.dto.request.TeacherUnlockFinalTestRequest;
import com.ielts.backend.dto.response.AdminCourseSummaryResponse;
import com.ielts.backend.dto.response.CourseProgressOverviewResponse;
import com.ielts.backend.dto.response.StudentCourseProgressDetailResponse;
import com.ielts.backend.dto.response.StudentCourseProgressDetailResponse.SectionFinalTestProgress;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.service.AdminCourseService;
import com.ielts.backend.service.TeacherProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/courses")
@RequiredArgsConstructor
@Tag(name = "Admin - Courses", description = "List all courses and toggle featured or active visibility")
public class AdminCourseController {

    private final AdminCourseService adminCourseService;
    private final TeacherProgressService teacherProgressService;

    @GetMapping
    @Operation(summary = "List all courses with operational filters")
    public BaseResponse<List<AdminCourseSummaryResponse>> listCourses(
            @RequestParam(required = false) ContentStatus status,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) SkillType skill,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_PAGE_STR) int page,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_SIZE_STR) int size) {
        PageRequest pageable = PaginationConstants.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id")));
        return BaseResponse.ofSuccess(adminCourseService.listCourses(status, isActive, skill, categoryId, q, pageable));
    }

    @PatchMapping("/{id}/featured")
    @Operation(summary = "Toggle featured status on an APPROVED and active course")
    public BaseResponse<AdminCourseSummaryResponse> setFeatured(
            @PathVariable UUID id,
            @Valid @RequestBody CourseFeatureRequest request) {
        return BaseResponse.ofSuccess(adminCourseService.setFeatured(id, Boolean.TRUE.equals(request.getFeatured())));
    }

    @PostMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate (hide) a course with a required reason without removing student enrollments")
    public BaseResponse<AdminCourseSummaryResponse> deactivateCourse(
            @PathVariable UUID id,
            @Valid @RequestBody DeactivateCourseRequest request) {
        return BaseResponse.ofSuccess(adminCourseService.deactivateCourse(id, request.getReason()));
    }

    @PostMapping("/{id}/activate")
    @Operation(summary = "Reactivate a previously deactivated course")
    public BaseResponse<AdminCourseSummaryResponse> activateCourse(@PathVariable UUID id) {
        return BaseResponse.ofSuccess(adminCourseService.activateCourse(id));
    }

    @GetMapping("/{id}/students")
    @Operation(summary = "Overview of enrolled students and progress in a course")
    public BaseResponse<CourseProgressOverviewResponse> getCourseStudents(
            @PathVariable UUID id,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String scheduleStatus) {
        return BaseResponse.ofSuccess(teacherProgressService.getCourseStudentsForAdmin(id, q, scheduleStatus));
    }

    @GetMapping("/{id}/students/{studentId}")
    @Operation(summary = "Detailed section/lesson progress and submission history of an enrolled student")
    public BaseResponse<StudentCourseProgressDetailResponse> getStudentDetail(
            @PathVariable UUID id,
            @PathVariable UUID studentId) {
        return BaseResponse.ofSuccess(teacherProgressService.getStudentDetailForAdmin(id, studentId));
    }

    @PostMapping("/{id}/sections/{sectionId}/students/{studentId}/final-test/unlock")
    @Operation(summary = "Unlock or extend a section's Final Test for a specific enrolled student")
    public BaseResponse<SectionFinalTestProgress> unlockStudentFinalTest(
            @PathVariable UUID id,
            @PathVariable UUID sectionId,
            @PathVariable UUID studentId,
            @RequestBody(required = false) @Valid TeacherUnlockFinalTestRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(
                teacherProgressService.unlockStudentFinalTestForAdmin(
                        id, sectionId, studentId, principal.getUsername(), request));
    }

    @PostMapping("/{id}/sections/{sectionId}/students/{studentId}/final-test/lock")
    @Operation(summary = "Lock a section's Final Test for a specific enrolled student")
    public BaseResponse<SectionFinalTestProgress> lockStudentFinalTest(
            @PathVariable UUID id,
            @PathVariable UUID sectionId,
            @PathVariable UUID studentId,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(
                teacherProgressService.lockStudentFinalTestForAdmin(
                        id, sectionId, studentId, principal.getUsername()));
    }
}
