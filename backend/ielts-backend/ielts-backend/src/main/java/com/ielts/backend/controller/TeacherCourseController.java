package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.constant.PaginationConstants;
import com.ielts.backend.dto.request.TeacherCourseRequest;
import com.ielts.backend.dto.request.TeacherLessonRequest;
import com.ielts.backend.dto.request.TeacherSectionRequest;
import com.ielts.backend.dto.response.AdminCourseDetailResponse;
import com.ielts.backend.dto.response.AdminCourseDetailResponse.AdminLessonResponse;
import com.ielts.backend.dto.response.AdminCourseDetailResponse.AdminSectionResponse;
import com.ielts.backend.dto.response.ReviewQueueItemResponse;
import com.ielts.backend.dto.response.TeacherCourseSummaryResponse;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.service.ContentReviewService;
import com.ielts.backend.service.TeacherCourseManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
@Tag(name = "Teacher - Courses", description = "Teacher CRUD for courses, sections, lessons and review submission")
public class TeacherCourseController {

    private final ContentReviewService contentReviewService;
    private final TeacherCourseManagementService teacherCourseManagementService;

    @GetMapping("/courses")
    @Operation(summary = "List courses owned by the current teacher with review status and feedback")
    public BaseResponse<List<TeacherCourseSummaryResponse>> getMyCourses(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(required = false) ContentStatus status,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_PAGE_STR) int page,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_SIZE_STR) int size) {
        PageRequest pageable = PaginationConstants.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id")));
        return BaseResponse.ofSuccess(contentReviewService.getTeacherCourses(principal.getUsername(), status, pageable));
    }

    @GetMapping("/courses/{id}")
    @Operation(summary = "Get full detail of an owned course including unapproved lessons and review feedback")
    public BaseResponse<AdminCourseDetailResponse> getCourseDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(contentReviewService.getCourseDetailForTeacher(id, principal.getUsername()));
    }

    @PostMapping("/courses")
    @Operation(summary = "Create a new DRAFT course owned by the current teacher")
    public ResponseEntity<BaseResponse<AdminCourseDetailResponse>> createCourse(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody TeacherCourseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.ofCreated(teacherCourseManagementService.createCourse(principal.getUsername(), request)));
    }

    @PutMapping("/courses/{id}")
    @Operation(summary = "Update an owned course (blocked while PENDING_REVIEW)")
    public BaseResponse<AdminCourseDetailResponse> updateCourse(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody TeacherCourseRequest request) {
        return BaseResponse.ofSuccess(teacherCourseManagementService.updateCourse(id, principal.getUsername(), request));
    }

    @DeleteMapping("/courses/{id}")
    @Operation(summary = "Delete an unpublished DRAFT/REJECTED course with no learner enrollments or submissions")
    public BaseResponse<Void> deleteCourse(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        teacherCourseManagementService.deleteCourse(id, principal.getUsername());
        return BaseResponse.ofDeleteSuccess();
    }

    @PostMapping("/courses/{id}/submit")
    @Operation(summary = "Submit a DRAFT or REJECTED course (and its DRAFT/REJECTED lessons) for review")
    public BaseResponse<AdminCourseDetailResponse> submitCourse(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(contentReviewService.submitCourse(id, principal.getUsername()));
    }

    @PostMapping("/courses/{id}/withdraw")
    @Operation(summary = "Withdraw a PENDING_REVIEW course and its pending lessons back to DRAFT")
    public BaseResponse<AdminCourseDetailResponse> withdrawCourse(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(contentReviewService.withdrawCourse(id, principal.getUsername()));
    }

    @PostMapping("/courses/{id}/archive")
    @Operation(summary = "Archive (deactivate) an owned course without removing learner data")
    public BaseResponse<AdminCourseDetailResponse> archiveCourse(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(teacherCourseManagementService.archiveCourse(id, principal.getUsername()));
    }

    @PostMapping("/courses/{courseId}/sections")
    @Operation(summary = "Add a section to an owned course")
    public ResponseEntity<BaseResponse<AdminSectionResponse>> createSection(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody TeacherSectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.ofCreated(
                        teacherCourseManagementService.createSection(courseId, principal.getUsername(), request)));
    }

    @PutMapping("/sections/{id}")
    @Operation(summary = "Update a section in an owned course")
    public BaseResponse<AdminSectionResponse> updateSection(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody TeacherSectionRequest request) {
        return BaseResponse.ofSuccess(
                teacherCourseManagementService.updateSection(id, principal.getUsername(), request));
    }

    @DeleteMapping("/sections/{id}")
    @Operation(summary = "Delete an empty/draft section with no protected lessons or submissions")
    public BaseResponse<Void> deleteSection(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        teacherCourseManagementService.deleteSection(id, principal.getUsername());
        return BaseResponse.ofDeleteSuccess();
    }

    @PostMapping("/sections/{sectionId}/lessons")
    @Operation(summary = "Add a DRAFT lesson to a section in an owned course")
    public ResponseEntity<BaseResponse<AdminLessonResponse>> createLesson(
            @PathVariable UUID sectionId,
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody TeacherLessonRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.ofCreated(
                        teacherCourseManagementService.createLesson(sectionId, principal.getUsername(), request)));
    }

    @PutMapping("/lessons/{id}")
    @Operation(summary = "Update a lesson (editing an APPROVED lesson resets its status to DRAFT for re-review)")
    public BaseResponse<AdminLessonResponse> updateLesson(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody TeacherLessonRequest request) {
        return BaseResponse.ofSuccess(
                teacherCourseManagementService.updateLesson(id, principal.getUsername(), request));
    }

    @DeleteMapping("/lessons/{id}")
    @Operation(summary = "Delete a DRAFT/REJECTED lesson with no student submissions")
    public BaseResponse<Void> deleteLesson(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        teacherCourseManagementService.deleteLesson(id, principal.getUsername());
        return BaseResponse.ofDeleteSuccess();
    }

    @PostMapping("/lessons/{id}/submit")
    @Operation(summary = "Submit a DRAFT or REJECTED lesson in an APPROVED course for review")
    public BaseResponse<ReviewQueueItemResponse> submitLesson(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(contentReviewService.submitLesson(id, principal.getUsername()));
    }

    @PostMapping("/lessons/{id}/withdraw")
    @Operation(summary = "Withdraw a PENDING_REVIEW lesson in an APPROVED course back to DRAFT")
    public BaseResponse<ReviewQueueItemResponse> withdrawLesson(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(contentReviewService.withdrawLesson(id, principal.getUsername()));
    }
}

