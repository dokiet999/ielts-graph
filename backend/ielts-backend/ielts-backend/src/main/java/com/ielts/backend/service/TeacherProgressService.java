package com.ielts.backend.service;

import com.ielts.backend.dto.request.TeacherSubmissionFeedbackRequest;
import com.ielts.backend.dto.request.TeacherUnlockFinalTestRequest;
import com.ielts.backend.dto.response.CourseProgressOverviewResponse;
import com.ielts.backend.dto.response.StudentCourseProgressDetailResponse;
import com.ielts.backend.dto.response.StudentCourseProgressDetailResponse.SectionFinalTestProgress;
import com.ielts.backend.dto.response.SubmissionDetailResponse;

import java.util.UUID;

public interface TeacherProgressService {

    CourseProgressOverviewResponse getCourseStudentsForTeacher(
            UUID courseId, String teacherUsername, String q, String scheduleStatus);

    CourseProgressOverviewResponse getCourseStudentsForAdmin(
            UUID courseId, String q, String scheduleStatus);

    StudentCourseProgressDetailResponse getStudentDetailForTeacher(
            UUID courseId, UUID studentId, String teacherUsername);

    StudentCourseProgressDetailResponse getStudentDetailForAdmin(
            UUID courseId, UUID studentId);

    SectionFinalTestProgress unlockStudentFinalTest(
            UUID courseId, UUID sectionId, UUID studentId, String teacherUsername, TeacherUnlockFinalTestRequest request);

    SectionFinalTestProgress lockStudentFinalTest(
            UUID courseId, UUID sectionId, UUID studentId, String teacherUsername);

    SectionFinalTestProgress unlockStudentFinalTestForAdmin(
            UUID courseId, UUID sectionId, UUID studentId, String adminUsername, TeacherUnlockFinalTestRequest request);

    SectionFinalTestProgress lockStudentFinalTestForAdmin(
            UUID courseId, UUID sectionId, UUID studentId, String adminUsername);

    SubmissionDetailResponse gradeSubmission(
            UUID submissionId, String teacherUsername, TeacherSubmissionFeedbackRequest request);
}
