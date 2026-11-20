package com.ielts.backend.service;

import com.ielts.backend.dto.response.AdminCourseDetailResponse;
import com.ielts.backend.dto.response.ReviewQueueItemResponse;
import com.ielts.backend.dto.response.TeacherCourseSummaryResponse;
import com.ielts.backend.entity.Lesson;
import com.ielts.backend.enums.ContentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ContentReviewService {

    Page<ReviewQueueItemResponse> getCourseReviewQueue(ContentStatus status, Pageable pageable);

    Page<ReviewQueueItemResponse> getLessonReviewQueue(ContentStatus status, Pageable pageable);

    AdminCourseDetailResponse getCourseDetailForAdmin(UUID courseId);

    AdminCourseDetailResponse approveCourse(UUID courseId, String adminUsername, String note);

    AdminCourseDetailResponse rejectCourse(UUID courseId, String adminUsername, String reason);

    ReviewQueueItemResponse approveLesson(UUID lessonId, String adminUsername, String note);

    ReviewQueueItemResponse rejectLesson(UUID lessonId, String adminUsername, String reason);

    Page<TeacherCourseSummaryResponse> getTeacherCourses(String teacherUsername, ContentStatus status, Pageable pageable);

    AdminCourseDetailResponse getCourseDetailForTeacher(UUID courseId, String teacherUsername);

    AdminCourseDetailResponse submitCourse(UUID courseId, String teacherUsername);

    ReviewQueueItemResponse submitLesson(UUID lessonId, String teacherUsername);

    AdminCourseDetailResponse withdrawCourse(UUID courseId, String teacherUsername);

    ReviewQueueItemResponse withdrawLesson(UUID lessonId, String teacherUsername);

    void resetLessonToDraftAfterEdit(Lesson lesson);
}

