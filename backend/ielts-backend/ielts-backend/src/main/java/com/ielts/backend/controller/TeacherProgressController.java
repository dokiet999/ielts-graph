package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.dto.request.TeacherSubmissionFeedbackRequest;
import com.ielts.backend.dto.request.TeacherUnlockFinalTestRequest;
import com.ielts.backend.dto.response.CourseProgressOverviewResponse;
import com.ielts.backend.dto.response.StudentCourseProgressDetailResponse;
import com.ielts.backend.dto.response.StudentCourseProgressDetailResponse.SectionFinalTestProgress;
import com.ielts.backend.dto.response.SubmissionDetailResponse;
import com.ielts.backend.service.SubmissionService;
import com.ielts.backend.service.TeacherProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
@Tag(name = "Teacher - Progress & Grading", description = "Track student progress, manage Final Test unlocks, and grade/review submissions")
public class TeacherProgressController {

    private final TeacherProgressService teacherProgressService;
    private final SubmissionService submissionService;

    @GetMapping("/courses/{courseId}/students")
    @Operation(summary = "List enrolled students in an owned course with exercise completion progress and schedule status")
    public BaseResponse<CourseProgressOverviewResponse> getCourseStudents(
            @PathVariable UUID courseId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String scheduleStatus,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(
                teacherProgressService.getCourseStudentsForTeacher(courseId, principal.getUsername(), q, scheduleStatus));
    }

    @GetMapping("/courses/{courseId}/students/{studentId}")
    @Operation(summary = "Detailed section/lesson/exercise progress and submission history of one enrolled student")
    public BaseResponse<StudentCourseProgressDetailResponse> getStudentDetail(
            @PathVariable UUID courseId,
            @PathVariable UUID studentId,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(
                teacherProgressService.getStudentDetailForTeacher(courseId, studentId, principal.getUsername()));
    }

    @PostMapping("/courses/{courseId}/sections/{sectionId}/students/{studentId}/final-test/unlock")
    @Operation(summary = "Unlock a section's Final Test for a specific enrolled student with optional deadline days")
    public BaseResponse<SectionFinalTestProgress> unlockStudentFinalTest(
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId,
            @PathVariable UUID studentId,
            @RequestBody(required = false) @Valid TeacherUnlockFinalTestRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(
                teacherProgressService.unlockStudentFinalTest(
                        courseId, sectionId, studentId, principal.getUsername(), request));
    }

    @PostMapping("/courses/{courseId}/sections/{sectionId}/students/{studentId}/final-test/lock")
    @Operation(summary = "Lock a section's Final Test for a specific enrolled student")
    public BaseResponse<SectionFinalTestProgress> lockStudentFinalTest(
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId,
            @PathVariable UUID studentId,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(
                teacherProgressService.lockStudentFinalTest(
                        courseId, sectionId, studentId, principal.getUsername()));
    }

    @GetMapping("/submissions/{submissionId}")
    @Operation(summary = "View full submission detail for an owned course")
    public BaseResponse<SubmissionDetailResponse> getSubmissionDetail(
            @PathVariable UUID submissionId,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(submissionService.getSubmissionResult(submissionId, principal.getUsername()));
    }

    @PutMapping("/submissions/{submissionId}/feedback")
    @Operation(summary = "Add teacher feedback and optional score adjustment for a student's submission")
    public BaseResponse<SubmissionDetailResponse> gradeSubmission(
            @PathVariable UUID submissionId,
            @Valid @RequestBody TeacherSubmissionFeedbackRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(
                teacherProgressService.gradeSubmission(submissionId, principal.getUsername(), request));
    }
}
