package com.ielts.backend.service;

import com.ielts.backend.dto.request.TeacherCourseRequest;
import com.ielts.backend.dto.request.TeacherLessonRequest;
import com.ielts.backend.dto.request.TeacherSectionRequest;
import com.ielts.backend.dto.response.AdminCourseDetailResponse;
import com.ielts.backend.dto.response.AdminCourseDetailResponse.AdminLessonResponse;
import com.ielts.backend.dto.response.AdminCourseDetailResponse.AdminSectionResponse;

import java.util.UUID;

public interface TeacherCourseManagementService {

    AdminCourseDetailResponse createCourse(String teacherUsername, TeacherCourseRequest request);

    AdminCourseDetailResponse updateCourse(UUID courseId, String teacherUsername, TeacherCourseRequest request);

    void deleteCourse(UUID courseId, String teacherUsername);

    AdminCourseDetailResponse archiveCourse(UUID courseId, String teacherUsername);

    AdminSectionResponse createSection(UUID courseId, String teacherUsername, TeacherSectionRequest request);

    AdminSectionResponse updateSection(UUID sectionId, String teacherUsername, TeacherSectionRequest request);

    void deleteSection(UUID sectionId, String teacherUsername);

    AdminLessonResponse createLesson(UUID sectionId, String teacherUsername, TeacherLessonRequest request);

    AdminLessonResponse updateLesson(UUID lessonId, String teacherUsername, TeacherLessonRequest request);

    void deleteLesson(UUID lessonId, String teacherUsername);
}
