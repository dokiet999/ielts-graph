package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.constant.PaginationConstants;
import com.ielts.backend.dto.request.ReviewDecisionRequest;
import com.ielts.backend.dto.response.AdminCourseDetailResponse;
import com.ielts.backend.dto.response.ReviewQueueItemResponse;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.service.ContentReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin - Content Review", description = "Review, approve and reject submitted courses and lessons")
public class AdminReviewController {

    private final ContentReviewService contentReviewService;

    @GetMapping("/reviews/courses")
    @Operation(summary = "List courses in the review queue, oldest submittedAt first")
    public BaseResponse<List<ReviewQueueItemResponse>> getCourseReviewQueue(
            @RequestParam(defaultValue = "PENDING_REVIEW") ContentStatus status,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_PAGE_STR) int page,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_SIZE_STR) int size) {
        PageRequest pageable = PageRequest.of(
                Math.max(page, PaginationConstants.DEFAULT_PAGE),
                Math.clamp(size, 1, PaginationConstants.MAX_PAGE_SIZE));
        return BaseResponse.ofSuccess(contentReviewService.getCourseReviewQueue(status, pageable));
    }

    @GetMapping("/reviews/lessons")
    @Operation(summary = "List lessons added to already-approved courses in the review queue")
    public BaseResponse<List<ReviewQueueItemResponse>> getLessonReviewQueue(
            @RequestParam(defaultValue = "PENDING_REVIEW") ContentStatus status,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_PAGE_STR) int page,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_SIZE_STR) int size) {
        PageRequest pageable = PageRequest.of(
                Math.max(page, PaginationConstants.DEFAULT_PAGE),
                Math.clamp(size, 1, PaginationConstants.MAX_PAGE_SIZE));
        return BaseResponse.ofSuccess(contentReviewService.getLessonReviewQueue(status, pageable));
    }

    @GetMapping("/courses/{id}")
    @Operation(summary = "Preview full course detail including unapproved lessons and review metadata")
    public BaseResponse<AdminCourseDetailResponse> getCourseDetail(@PathVariable UUID id) {
        return BaseResponse.ofSuccess(contentReviewService.getCourseDetailForAdmin(id));
    }

    @PostMapping("/courses/{id}/approve")
    @Operation(summary = "Approve a PENDING_REVIEW course and its pending lessons")
    public BaseResponse<AdminCourseDetailResponse> approveCourse(
            @PathVariable UUID id,
            @RequestBody(required = false) @Valid ReviewDecisionRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        String note = request != null ? request.getNote() : null;
        return BaseResponse.ofSuccess(contentReviewService.approveCourse(id, principal.getUsername(), note));
    }

    @PostMapping("/courses/{id}/reject")
    @Operation(summary = "Reject a PENDING_REVIEW course and its pending lessons with a required reason")
    public BaseResponse<AdminCourseDetailResponse> rejectCourse(
            @PathVariable UUID id,
            @RequestBody(required = false) @Valid ReviewDecisionRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        String reason = request != null ? request.getReason() : null;
        return BaseResponse.ofSuccess(contentReviewService.rejectCourse(id, principal.getUsername(), reason));
    }

    @PostMapping("/lessons/{id}/approve")
    @Operation(summary = "Approve an individual PENDING_REVIEW lesson in an APPROVED course")
    public BaseResponse<ReviewQueueItemResponse> approveLesson(
            @PathVariable UUID id,
            @RequestBody(required = false) @Valid ReviewDecisionRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        String note = request != null ? request.getNote() : null;
        return BaseResponse.ofSuccess(contentReviewService.approveLesson(id, principal.getUsername(), note));
    }

    @PostMapping("/lessons/{id}/reject")
    @Operation(summary = "Reject an individual PENDING_REVIEW lesson in an APPROVED course with a required reason")
    public BaseResponse<ReviewQueueItemResponse> rejectLesson(
            @PathVariable UUID id,
            @RequestBody(required = false) @Valid ReviewDecisionRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        String reason = request != null ? request.getReason() : null;
        return BaseResponse.ofSuccess(contentReviewService.rejectLesson(id, principal.getUsername(), reason));
    }
}

