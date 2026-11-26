package com.ielts.backend.service.implement;

import com.ielts.backend.dto.response.AdminCourseDetailResponse;
import com.ielts.backend.dto.response.AdminCourseDetailResponse.AdminLessonResponse;
import com.ielts.backend.dto.response.AdminCourseDetailResponse.AdminSectionResponse;
import com.ielts.backend.dto.response.ReviewQueueItemResponse;
import com.ielts.backend.dto.response.TeacherCourseSummaryResponse;
import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Lesson;
import com.ielts.backend.entity.Section;
import com.ielts.backend.entity.Users;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.exception.customException.BadRequestException;
import com.ielts.backend.exception.customException.ConflictException;
import com.ielts.backend.exception.customException.ForbiddenException;
import com.ielts.backend.exception.customException.ResourceNotFoundException;
import com.ielts.backend.exception.customException.UnauthorizedException;
import com.ielts.backend.repository.CourseRepository;
import com.ielts.backend.repository.EnrollmentRepository;
import com.ielts.backend.repository.EnrollmentRepository.CourseEnrollmentCount;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.ExerciseRepository.LessonExerciseCount;
import com.ielts.backend.repository.LessonRepository;
import com.ielts.backend.repository.LessonRepository.CourseLessonCount;
import com.ielts.backend.repository.SectionRepository;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.ContentReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ContentReviewServiceImpl implements ContentReviewService {

    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final LessonRepository lessonRepository;
    private final ExerciseRepository exerciseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewQueueItemResponse> getCourseReviewQueue(ContentStatus status, Pageable pageable) {
        ContentStatus effectiveStatus = status != null ? status : ContentStatus.PENDING_REVIEW;
        Page<Course> page = courseRepository.findReviewQueueByStatus(effectiveStatus, pageable);
        List<UUID> courseIds = page.getContent().stream().map(Course::getId).toList();
        Map<UUID, Long> pendingLessonCounts = courseIds.isEmpty() ? Map.of()
                : toCountMap(lessonRepository.countByCourseIdsAndStatus(courseIds, ContentStatus.PENDING_REVIEW));
        LocalDateTime now = LocalDateTime.now();

        return page.map(course -> ReviewQueueItemResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .teacherName(course.getTeacher().getFullName())
                .skillFocus(course.getSkillFocus())
                .status(course.getStatus())
                .submittedAt(course.getSubmittedAt())
                .waitingDays(computeWaitingDays(course.getSubmittedAt(), now))
                .reviewedAt(course.getReviewedAt())
                .reviewNote(course.getReviewNote())
                .pendingLessonCount(pendingLessonCounts.getOrDefault(course.getId(), 0L))
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewQueueItemResponse> getLessonReviewQueue(ContentStatus status, Pageable pageable) {
        ContentStatus effectiveStatus = status != null ? status : ContentStatus.PENDING_REVIEW;
        LocalDateTime now = LocalDateTime.now();
        return lessonRepository.findReviewQueueForApprovedCourses(effectiveStatus, ContentStatus.APPROVED, pageable)
                .map(lesson -> toLessonReviewItem(lesson, now));
    }

    @Override
    @Transactional(readOnly = true)
    public AdminCourseDetailResponse getCourseDetailForAdmin(UUID courseId) {
        Course course = courseRepository.findWithDetailsById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));
        return buildCourseDetail(course);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminCourseDetailResponse getCourseDetailForTeacher(UUID courseId, String teacherUsername) {
        Users teacher = findUserOrUnauthorized(teacherUsername);
        Course course = courseRepository.findWithDetailsById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));
        if (!course.getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenException("You do not own this course");
        }
        return buildCourseDetail(course);
    }

    private AdminCourseDetailResponse buildCourseDetail(Course course) {
        UUID courseId = course.getId();
        List<Section> sections = sectionRepository.findByCourseIdOrderByOrderingAsc(courseId);
        List<Lesson> lessons = lessonRepository.findAllByCourseIdOrdered(courseId);
        List<UUID> lessonIds = lessons.stream().map(Lesson::getId).toList();
        Map<UUID, Long> exerciseCounts = lessonIds.isEmpty() ? Map.of()
                : exerciseRepository.countByLessonIds(lessonIds).stream()
                        .collect(Collectors.toMap(LessonExerciseCount::getLessonId, LessonExerciseCount::getTotal));
        Map<UUID, List<AdminLessonResponse>> lessonsBySection = lessons.stream()
                .map(lesson -> toAdminLessonResponse(
                        lesson, Math.toIntExact(exerciseCounts.getOrDefault(lesson.getId(), 0L))))
                .collect(Collectors.groupingBy(AdminLessonResponse::getSectionId));

        List<AdminSectionResponse> sectionResponses = sections.stream()
                .map(section -> AdminSectionResponse.builder()
                        .id(section.getId())
                        .title(section.getTitle())
                        .description(section.getDescription())
                        .ordering(section.getOrdering())
                        .lessons(lessonsBySection.getOrDefault(section.getId(), List.of()))
                        .build())
                .toList();

        Users reviewer = course.getReviewedBy();
        long enrollmentCount = enrollmentRepository.countByCourseIdAndIsActiveTrue(courseId);
        return AdminCourseDetailResponse.builder()
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
                .enrollmentCount(enrollmentCount)
                .isFeatured(course.getIsFeatured())
                .isActive(course.getIsActive())
                .publishedAt(course.getPublishedAt())
                .status(course.getStatus())
                .submittedAt(course.getSubmittedAt())
                .reviewedAt(course.getReviewedAt())
                .reviewedById(reviewer != null ? reviewer.getId() : null)
                .reviewedByName(reviewer != null ? reviewer.getFullName() : null)
                .reviewNote(course.getReviewNote())
                .deactivationReason(course.getDeactivationReason())
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .totalLessons(lessons.size())
                .sections(sectionResponses)
                .build();
    }

    @Override
    public AdminCourseDetailResponse approveCourse(UUID courseId, String adminUsername, String note) {
        Users admin = findUserOrUnauthorized(adminUsername);
        if (!courseRepository.existsById(courseId)) {
            throw new ResourceNotFoundException("Course", courseId);
        }

        String cleanNote = trimToNull(note);
        LocalDateTime now = LocalDateTime.now();
        int updated = courseRepository.approveIfPending(
                courseId, ContentStatus.PENDING_REVIEW, ContentStatus.APPROVED, now, admin, cleanNote);
        if (updated == 0) {
            throw new ConflictException("INVALID_REVIEW_STATUS", "Only courses in PENDING_REVIEW can be approved");
        }

        Users reviewerRef = userRepository.getReferenceById(admin.getId());
        lessonRepository.updateBundledLessonsDecision(
                courseId, ContentStatus.PENDING_REVIEW, ContentStatus.APPROVED, now, reviewerRef, cleanNote);

        return getCourseDetailForAdmin(courseId);
    }

    @Override
    public AdminCourseDetailResponse rejectCourse(UUID courseId, String adminUsername, String reason) {
        String cleanReason = requireNonBlankReason(reason);
        Users admin = findUserOrUnauthorized(adminUsername);
        if (!courseRepository.existsById(courseId)) {
            throw new ResourceNotFoundException("Course", courseId);
        }

        LocalDateTime now = LocalDateTime.now();
        int updated = courseRepository.rejectIfPending(
                courseId, ContentStatus.PENDING_REVIEW, ContentStatus.REJECTED, now, admin, cleanReason);
        if (updated == 0) {
            throw new ConflictException("INVALID_REVIEW_STATUS", "Only courses in PENDING_REVIEW can be rejected");
        }

        Users reviewerRef = userRepository.getReferenceById(admin.getId());
        lessonRepository.updateBundledLessonsDecision(
                courseId, ContentStatus.PENDING_REVIEW, ContentStatus.REJECTED, now, reviewerRef, cleanReason);

        return getCourseDetailForAdmin(courseId);
    }

    @Override
    public ReviewQueueItemResponse approveLesson(UUID lessonId, String adminUsername, String note) {
        Users admin = findUserOrUnauthorized(adminUsername);
        Lesson lesson = lessonRepository.findByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        if (lesson.getSection().getCourse().getStatus() != ContentStatus.APPROVED) {
            throw new ConflictException("COURSE_NOT_APPROVED",
                    "Approve the course instead of individual lessons while the course is not APPROVED");
        }

        String cleanNote = trimToNull(note);
        LocalDateTime now = LocalDateTime.now();
        int updated = lessonRepository.updateStatusIfPending(
                lessonId, ContentStatus.PENDING_REVIEW, ContentStatus.APPROVED, now, admin, cleanNote);
        if (updated == 0) {
            throw new ConflictException("INVALID_REVIEW_STATUS", "Only lessons in PENDING_REVIEW can be approved");
        }

        Lesson reloaded = lessonRepository.findByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        return toLessonReviewItem(reloaded, now);
    }

    @Override
    public ReviewQueueItemResponse rejectLesson(UUID lessonId, String adminUsername, String reason) {
        String cleanReason = requireNonBlankReason(reason);
        Users admin = findUserOrUnauthorized(adminUsername);
        Lesson lesson = lessonRepository.findByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        if (lesson.getSection().getCourse().getStatus() != ContentStatus.APPROVED) {
            throw new ConflictException("COURSE_NOT_APPROVED",
                    "Review the course instead while the course is not APPROVED");
        }

        LocalDateTime now = LocalDateTime.now();
        int updated = lessonRepository.updateStatusIfPending(
                lessonId, ContentStatus.PENDING_REVIEW, ContentStatus.REJECTED, now, admin, cleanReason);
        if (updated == 0) {
            throw new ConflictException("INVALID_REVIEW_STATUS", "Only lessons in PENDING_REVIEW can be rejected");
        }

        Lesson reloaded = lessonRepository.findByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        return toLessonReviewItem(reloaded, now);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TeacherCourseSummaryResponse> getTeacherCourses(String teacherUsername, ContentStatus status, Pageable pageable) {
        Users teacher = findUserOrUnauthorized(teacherUsername);
        Page<Course> page = status == null
                ? courseRepository.findByTeacherId(teacher.getId(), pageable)
                : courseRepository.findByTeacherIdAndStatus(teacher.getId(), status, pageable);

        List<UUID> courseIds = page.getContent().stream().map(Course::getId).toList();
        Map<UUID, Long> totalLessons = courseIds.isEmpty() ? Map.of()
                : toCountMap(lessonRepository.countByCourseIds(courseIds));
        Map<UUID, Long> pendingLessons = courseIds.isEmpty() ? Map.of()
                : toCountMap(lessonRepository.countByCourseIdsAndStatus(courseIds, ContentStatus.PENDING_REVIEW));
        Map<UUID, Long> enrollmentCounts = courseIds.isEmpty() ? Map.of()
                : enrollmentRepository.countActiveByCourseIds(courseIds).stream()
                        .collect(Collectors.toMap(CourseEnrollmentCount::getCourseId, CourseEnrollmentCount::getTotal));

        return page.map(course -> TeacherCourseSummaryResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .description(course.getDescription())
                .skillFocus(course.getSkillFocus())
                .difficultyLevel(course.getDifficultyLevel())
                .categoryId(course.getCategory() != null ? course.getCategory().getId() : null)
                .categoryName(course.getCategory() != null ? course.getCategory().getName() : null)
                .thumbnail(course.getThumbnail())
                .estimatedDuration(course.getEstimatedDuration())
                .maxStudents(course.getMaxStudents())
                .startDate(course.getStartDate())
                .endDate(course.getEndDate())
                .enrollmentCount(enrollmentCounts.getOrDefault(course.getId(), 0L))
                .status(course.getStatus())
                .submittedAt(course.getSubmittedAt())
                .reviewedAt(course.getReviewedAt())
                .reviewNote(course.getReviewNote())
                .deactivationReason(course.getDeactivationReason())
                .publishedAt(course.getPublishedAt())
                .isActive(course.getIsActive())
                .totalLessons(totalLessons.getOrDefault(course.getId(), 0L))
                .pendingLessonCount(pendingLessons.getOrDefault(course.getId(), 0L))
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build());
    }

    @Override
    public AdminCourseDetailResponse submitCourse(UUID courseId, String teacherUsername) {
        Users teacher = findUserOrUnauthorized(teacherUsername);
        Course course = courseRepository.findWithDetailsById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));

        if (!course.getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenException("You do not own this course");
        }
        if (!Boolean.TRUE.equals(course.getIsActive())) {
            throw new ConflictException("COURSE_INACTIVE", "Inactive courses cannot be submitted for review");
        }
        if (course.getStatus() != ContentStatus.DRAFT && course.getStatus() != ContentStatus.REJECTED) {
            throw new ConflictException("INVALID_SUBMIT_STATUS", "Only DRAFT or REJECTED courses can be submitted");
        }
        if (lessonRepository.countBySectionCourseId(courseId) == 0) {
            throw new BadRequestException("EMPTY_COURSE",
                    "Course must have at least one lesson before submitting for review");
        }

        List<ContentStatus> allowed = List.of(ContentStatus.DRAFT, ContentStatus.REJECTED);
        LocalDateTime now = LocalDateTime.now();
        int updated = courseRepository.submitIfAllowed(courseId, allowed, ContentStatus.PENDING_REVIEW, now);
        if (updated == 0) {
            throw new ConflictException("INVALID_SUBMIT_STATUS", "Only DRAFT or REJECTED courses can be submitted");
        }

        lessonRepository.submitCourseLessonsIfAllowed(courseId, allowed, ContentStatus.PENDING_REVIEW, now);
        return getCourseDetailForAdmin(courseId);
    }

    @Override
    public ReviewQueueItemResponse submitLesson(UUID lessonId, String teacherUsername) {
        Users teacher = findUserOrUnauthorized(teacherUsername);
        Lesson lesson = lessonRepository.findByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        Course course = lesson.getSection().getCourse();

        if (!course.getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenException("You do not own this lesson");
        }
        if (course.getStatus() != ContentStatus.APPROVED) {
            throw new ConflictException("COURSE_NOT_APPROVED",
                    "Submit the course for review instead of individual lessons");
        }

        LocalDateTime now = LocalDateTime.now();
        int updated = lessonRepository.submitIfAllowed(
                lessonId, List.of(ContentStatus.DRAFT, ContentStatus.REJECTED), ContentStatus.PENDING_REVIEW, now);
        if (updated == 0) {
            throw new ConflictException("INVALID_SUBMIT_STATUS", "Only DRAFT or REJECTED lessons can be submitted");
        }

        Lesson reloaded = lessonRepository.findByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        return toLessonReviewItem(reloaded, now);
    }

    @Override
    public AdminCourseDetailResponse withdrawCourse(UUID courseId, String teacherUsername) {
        Users teacher = findUserOrUnauthorized(teacherUsername);
        Course course = courseRepository.findWithDetailsById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));
        if (!course.getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenException("You do not own this course");
        }
        int updated = courseRepository.withdrawIfPending(
                courseId, ContentStatus.PENDING_REVIEW, ContentStatus.DRAFT);
        if (updated == 0) {
            throw new ConflictException("INVALID_WITHDRAW_STATUS",
                    "Only PENDING_REVIEW courses can be withdrawn");
        }
        lessonRepository.withdrawCourseLessonsIfPending(
                courseId, ContentStatus.PENDING_REVIEW, ContentStatus.DRAFT);
        return getCourseDetailForAdmin(courseId);
    }

    @Override
    public ReviewQueueItemResponse withdrawLesson(UUID lessonId, String teacherUsername) {
        Users teacher = findUserOrUnauthorized(teacherUsername);
        Lesson lesson = lessonRepository.findByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        Course course = lesson.getSection().getCourse();

        if (!course.getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenException("You do not own this lesson");
        }
        if (course.getStatus() != ContentStatus.APPROVED) {
            throw new ConflictException("COURSE_NOT_APPROVED",
                    "Withdraw the course instead while the course is not APPROVED");
        }
        int updated = lessonRepository.withdrawIfPending(
                lessonId, ContentStatus.PENDING_REVIEW, ContentStatus.DRAFT);
        if (updated == 0) {
            throw new ConflictException("INVALID_WITHDRAW_STATUS",
                    "Only PENDING_REVIEW lessons can be withdrawn");
        }
        Lesson reloaded = lessonRepository.findByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        return toLessonReviewItem(reloaded, LocalDateTime.now());
    }

    @Override
    public void resetLessonToDraftAfterEdit(Lesson lesson) {
        if (lesson.getStatus() == ContentStatus.APPROVED) {
            lesson.setStatus(ContentStatus.DRAFT);
            lesson.setSubmittedAt(null);
            lesson.setReviewedAt(null);
            lesson.setReviewedBy(null);
            lesson.setReviewNote(null);
        }
    }

    private Users findUserOrUnauthorized(String username) {
        return userRepository.findByUsername(DbUserDetailsService.normalize(username))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));
    }

    private AdminLessonResponse toAdminLessonResponse(Lesson lesson, int exerciseCount) {
        return AdminLessonResponse.builder()
                .id(lesson.getId())
                .sectionId(lesson.getSection().getId())
                .title(lesson.getTitle())
                .lessonType(lesson.getLessonType())
                .videoUrl(lesson.getVideoUrl())
                .videoDuration(lesson.getVideoDuration())
                .documentUrl(lesson.getDocumentUrl())
                .ordering(lesson.getOrdering())
                .isPreview(lesson.getIsPreview())
                .status(lesson.getStatus())
                .exerciseCount(exerciseCount)
                .submittedAt(lesson.getSubmittedAt())
                .reviewedAt(lesson.getReviewedAt())
                .reviewNote(lesson.getReviewNote())
                .build();
    }

    private ReviewQueueItemResponse toLessonReviewItem(Lesson lesson, LocalDateTime now) {
        Section section = lesson.getSection();
        Course course = section.getCourse();
        return ReviewQueueItemResponse.builder()
                .id(lesson.getId())
                .title(lesson.getTitle())
                .teacherName(course.getTeacher().getFullName())
                .skillFocus(course.getSkillFocus())
                .status(lesson.getStatus())
                .submittedAt(lesson.getSubmittedAt())
                .waitingDays(computeWaitingDays(lesson.getSubmittedAt(), now))
                .reviewedAt(lesson.getReviewedAt())
                .reviewNote(lesson.getReviewNote())
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .sectionId(section.getId())
                .sectionTitle(section.getTitle())
                .lessonType(lesson.getLessonType())
                .build();
    }

    private static Map<UUID, Long> toCountMap(List<CourseLessonCount> counts) {
        return counts.stream()
                .collect(Collectors.toMap(CourseLessonCount::getCourseId, CourseLessonCount::getTotal));
    }

    private static long computeWaitingDays(LocalDateTime submittedAt, LocalDateTime now) {
        if (submittedAt == null) {
            return 0L;
        }
        return Math.max(0L, ChronoUnit.DAYS.between(submittedAt, now));
    }

    private static String requireNonBlankReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("REASON_REQUIRED", "Rejection reason is required");
        }
        return reason.trim();
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}

