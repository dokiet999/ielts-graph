package com.ielts.backend.service.implement;

import com.ielts.backend.dto.response.AdminCourseSummaryResponse;
import com.ielts.backend.entity.Course;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.exception.customException.BadRequestException;
import com.ielts.backend.exception.customException.ConflictException;
import com.ielts.backend.exception.customException.ResourceNotFoundException;
import com.ielts.backend.repository.CourseRepository;
import com.ielts.backend.repository.CourseSpecifications;
import com.ielts.backend.repository.EnrollmentRepository;
import com.ielts.backend.repository.EnrollmentRepository.CourseEnrollmentCount;
import com.ielts.backend.repository.LessonRepository;
import com.ielts.backend.repository.LessonRepository.CourseLessonCount;
import com.ielts.backend.service.AdminCourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminCourseServiceImpl implements AdminCourseService {

    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<AdminCourseSummaryResponse> listCourses(
            ContentStatus status,
            Boolean isActive,
            SkillType skill,
            UUID categoryId,
            String q,
            Pageable pageable) {
        List<Specification<Course>> specs = Stream.of(
                        CourseSpecifications.hasStatus(status),
                        CourseSpecifications.hasIsActive(isActive),
                        CourseSpecifications.hasSkill(skill),
                        CourseSpecifications.inCategory(categoryId),
                        CourseSpecifications.matchesAdminKeyword(q))
                .filter(Objects::nonNull)
                .toList();
        Page<Course> page = courseRepository.findAll(Specification.allOf(specs), pageable);
        List<UUID> courseIds = page.getContent().stream().map(Course::getId).toList();
        Map<UUID, Long> lessonCounts = courseIds.isEmpty() ? Map.of()
                : lessonRepository.countByCourseIds(courseIds).stream()
                        .collect(Collectors.toMap(CourseLessonCount::getCourseId, CourseLessonCount::getTotal));
        Map<UUID, Long> enrollmentCounts = courseIds.isEmpty() ? Map.of()
                : enrollmentRepository.countActiveByCourseIds(courseIds).stream()
                        .collect(Collectors.toMap(CourseEnrollmentCount::getCourseId, CourseEnrollmentCount::getTotal));

        return page.map(course -> toSummaryResponse(
                course,
                lessonCounts.getOrDefault(course.getId(), 0L),
                enrollmentCounts.getOrDefault(course.getId(), 0L)));
    }

    @Override
    public AdminCourseSummaryResponse setFeatured(UUID courseId, boolean featured) {
        Course course = findCourseOrThrow(courseId);
        if (featured && (course.getStatus() != ContentStatus.APPROVED || !Boolean.TRUE.equals(course.getIsActive()))) {
            throw new ConflictException("COURSE_NOT_ELIGIBLE_FOR_FEATURED",
                    "Only APPROVED and active courses can be featured");
        }
        course.setIsFeatured(featured);
        Course saved = courseRepository.saveAndFlush(course);
        return buildSingleSummaryResponse(saved);
    }

    @Override
    public AdminCourseSummaryResponse deactivateCourse(UUID courseId, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("REASON_REQUIRED", "Deactivation reason is required");
        }
        Course course = findCourseOrThrow(courseId);
        if (!Boolean.TRUE.equals(course.getIsActive())) {
            throw new ConflictException("COURSE_ALREADY_INACTIVE", "Course is already inactive");
        }
        course.setIsActive(false);
        course.setIsFeatured(false);
        course.setDeactivationReason(reason.trim());
        Course saved = courseRepository.saveAndFlush(course);
        return buildSingleSummaryResponse(saved);
    }

    @Override
    public AdminCourseSummaryResponse activateCourse(UUID courseId) {
        Course course = findCourseOrThrow(courseId);
        if (Boolean.TRUE.equals(course.getIsActive())) {
            throw new ConflictException("COURSE_ALREADY_ACTIVE", "Course is already active");
        }
        course.setIsActive(true);
        course.setDeactivationReason(null);
        Course saved = courseRepository.saveAndFlush(course);
        return buildSingleSummaryResponse(saved);
    }

    private Course findCourseOrThrow(UUID courseId) {
        return courseRepository.findWithDetailsById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));
    }

    private AdminCourseSummaryResponse buildSingleSummaryResponse(Course course) {
        UUID id = course.getId();
        long totalLessons = lessonRepository.countByCourseIds(List.of(id)).stream()
                .mapToLong(CourseLessonCount::getTotal)
                .sum();
        long enrollmentCount = enrollmentRepository.countByCourseIdAndIsActiveTrue(id);
        return toSummaryResponse(course, totalLessons, enrollmentCount);
    }

    private static AdminCourseSummaryResponse toSummaryResponse(Course course, long totalLessons, long enrollmentCount) {
        return AdminCourseSummaryResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnail(course.getThumbnail())
                .teacherId(course.getTeacher().getId())
                .teacherName(course.getTeacher().getFullName())
                .categoryId(course.getCategory() != null ? course.getCategory().getId() : null)
                .categoryName(course.getCategory() != null ? course.getCategory().getName() : null)
                .skillFocus(course.getSkillFocus())
                .difficultyLevel(course.getDifficultyLevel())
                .estimatedDuration(course.getEstimatedDuration())
                .maxStudents(course.getMaxStudents())
                .startDate(course.getStartDate())
                .endDate(course.getEndDate())
                .isFeatured(course.getIsFeatured())
                .isActive(course.getIsActive())
                .status(course.getStatus())
                .publishedAt(course.getPublishedAt())
                .submittedAt(course.getSubmittedAt())
                .reviewedAt(course.getReviewedAt())
                .reviewNote(course.getReviewNote())
                .deactivationReason(course.getDeactivationReason())
                .totalLessons(totalLessons)
                .enrollmentCount(enrollmentCount)
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build();
    }
}
