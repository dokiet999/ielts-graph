package com.ielts.backend.service.implement;

import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Lesson;
import com.ielts.backend.entity.Section;
import com.ielts.backend.entity.User;
import com.ielts.backend.exception.ForbiddenException;
import com.ielts.backend.exception.ResourceNotFoundException;
import com.ielts.backend.exception.UnauthorizedException;
import com.ielts.backend.repository.EnrollmentRepository;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.CourseAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseAccessServiceImpl implements CourseAccessService {

    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;

    @Override
    public void checkLessonAccess(Lesson lesson, String username) {
        Course course = lesson.getSection().getCourse();
        if (!isVisible(course)) {
            throw new ResourceNotFoundException("Lesson", lesson.getId());
        }
        if (Boolean.TRUE.equals(lesson.getIsPreview())) {
            return;
        }
        checkMembership(course, username);
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
    public void checkSectionAccess(Section section, String username) {
        Course course = section.getCourse();
        if (!isVisible(course)) {
            throw new ResourceNotFoundException("Section", section.getId());
        }
        checkMembership(course, username);
    }

    /** Enrolled learners and the owning teacher. */
    private void checkMembership(Course course, String username) {
        if (username == null) {
            throw new UnauthorizedException("Login required to open this content");
        }
        User user = userRepository.findByUsername(DbUserDetailsService.normalize(username))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));

        boolean isOwner = course.getTeacher().getId().equals(user.getId());
        boolean enrolled = enrollmentRepository.existsByUserIdAndCourseIdAndIsActiveTrue(user.getId(), course.getId());
        if (!isOwner && !enrolled) {
            throw new ForbiddenException("Enroll in the course to open this content");
        }
    }

    private boolean isVisible(Course course) {
        return Boolean.TRUE.equals(course.getIsActive()) && course.getPublishedAt() != null;
    }
}
