package com.ielts.backend.service.implement;

import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Lesson;
import com.ielts.backend.entity.Section;
import com.ielts.backend.entity.Users;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.Role;
import com.ielts.backend.exception.customException.ConflictException;
import com.ielts.backend.exception.customException.ForbiddenException;
import com.ielts.backend.exception.customException.ResourceNotFoundException;
import com.ielts.backend.exception.customException.UnauthorizedException;
import com.ielts.backend.repository.EnrollmentRepository;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.CourseAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseAccessServiceImpl implements CourseAccessService {

    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;

    @Override
    public void checkLessonAccess(Lesson lesson, String username) {
        Course course = lesson.getSection().getCourse();
        if (!isVisible(course) || lesson.getStatus() != ContentStatus.APPROVED) {
            throw new ResourceNotFoundException("Lesson", lesson.getId());
        }
        if (Boolean.TRUE.equals(lesson.getIsPreview())) {
            return;
        }
        Users users = checkMembership(course, username);
        if (!canBypassSchedule(course, users)) {
            checkCourseStarted(course);
        }
    }

    @Override
    public void checkExerciseAccess(Exercise exercise, String username) {
        if (exercise.getLesson() == null) {
            return;
        }
        try {
            checkLessonAccess(exercise.getLesson(), username);
        } catch (ResourceNotFoundException ex) {
            throw new ResourceNotFoundException("Exercise", exercise.getId());
        }
    }

    @Override
    public void checkExerciseSubmittable(Exercise exercise, String username) {
        checkExerciseAccess(exercise, username);
        if (exercise.getLesson() == null) {
            return;
        }
        Course course = exercise.getLesson().getSection().getCourse();
        Users users = username != null
                ? userRepository.findByUsername(DbUserDetailsService.normalize(username)).orElse(null)
                : null;
        if (users == null || !canBypassSchedule(course, users)) {
            checkCourseStarted(course);
            checkCourseNotEnded(course);
        }
    }

    @Override
    public void checkSectionAccess(Section section, String username) {
        Course course = section.getCourse();
        if (!isVisible(course)) {
            throw new ResourceNotFoundException("Section", section.getId());
        }
        Users users = checkMembership(course, username);
        if (!canBypassSchedule(course, users)) {
            checkCourseStarted(course);
        }
    }

    /** Enrolled learners, the owning teacher, or admin. */
    private Users checkMembership(Course course, String username) {
        if (username == null) {
            throw new UnauthorizedException("Login required to open this content");
        }
        Users users = userRepository.findByUsername(DbUserDetailsService.normalize(username))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));

        boolean isOwner = course.getTeacher().getId().equals(users.getId());
        boolean isAdmin = users.getRole() == Role.ADMIN;
        boolean enrolled = enrollmentRepository.existsByUserIdAndCourseIdAndIsActiveTrue(users.getId(), course.getId());
        if (!isOwner && !isAdmin && !enrolled) {
            throw new ForbiddenException("Enroll in the course to open this content");
        }
        return users;
    }

    private static boolean canBypassSchedule(Course course, Users users) {
        return users.getRole() == Role.ADMIN || course.getTeacher().getId().equals(users.getId());
    }

    private static void checkCourseStarted(Course course) {
        if (course.getStartDate() != null && LocalDateTime.now().isBefore(course.getStartDate())) {
            throw new ConflictException("COURSE_NOT_STARTED", "Khóa học chưa đến thời gian bắt đầu");
        }
    }

    private static void checkCourseNotEnded(Course course) {
        if (course.getEndDate() != null && LocalDateTime.now().isAfter(course.getEndDate())) {
            throw new ConflictException("COURSE_ENDED", "Khóa học đã kết thúc thời gian làm bài");
        }
    }

    private boolean isVisible(Course course) {
        return Boolean.TRUE.equals(course.getIsActive()) && course.getPublishedAt() != null;
    }
}
