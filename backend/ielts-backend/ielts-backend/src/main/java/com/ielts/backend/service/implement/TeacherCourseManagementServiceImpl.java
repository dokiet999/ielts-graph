package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.TeacherCourseRequest;
import com.ielts.backend.dto.request.TeacherLessonRequest;
import com.ielts.backend.dto.request.TeacherSectionRequest;
import com.ielts.backend.dto.response.AdminCourseDetailResponse;
import com.ielts.backend.dto.response.AdminCourseDetailResponse.AdminLessonResponse;
import com.ielts.backend.dto.response.AdminCourseDetailResponse.AdminSectionResponse;
import com.ielts.backend.entity.Category;
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
import com.ielts.backend.repository.CategoryRepository;
import com.ielts.backend.repository.CourseRepository;
import com.ielts.backend.repository.EnrollmentRepository;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.ExerciseRepository.LessonExerciseCount;
import com.ielts.backend.repository.LessonRepository;
import com.ielts.backend.repository.SectionRepository;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.ContentReviewService;
import com.ielts.backend.service.TeacherCourseManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TeacherCourseManagementServiceImpl implements TeacherCourseManagementService {

    private static final Set<String> VALID_LESSON_TYPES = Set.of("VIDEO", "DOCUMENT", "TEXT");

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final LessonRepository lessonRepository;
    private final ExerciseRepository exerciseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserSubmissionRepository userSubmissionRepository;
    private final ContentReviewService contentReviewService;

    @Override
    public AdminCourseDetailResponse createCourse(String teacherUsername, TeacherCourseRequest request) {
        Users teacher = findTeacherOrUnauthorized(teacherUsername);
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", request.getCategoryId()));
        if (!Boolean.TRUE.equals(category.getIsActive())) {
            throw new BadRequestException("CATEGORY_INACTIVE", "Selected category is not active");
        }

        Course course = Course.builder()
                .teacher(teacher)
                .category(category)
                .title(request.getTitle().trim())
                .description(trimToNull(request.getDescription()))
                .thumbnail(trimToNull(request.getThumbnail()))
                .skillFocus(request.getSkillFocus())
                .difficultyLevel(request.getDifficultyLevel())
                .estimatedDuration(request.getEstimatedDuration())
                .courseOutline(request.getCourseOutline())
                .status(ContentStatus.DRAFT)
                .publishedAt(null)
                .isActive(true)
                .isFeatured(false)
                .build();

        Course saved = courseRepository.saveAndFlush(course);
        return contentReviewService.getCourseDetailForTeacher(saved.getId(), teacherUsername);
    }

    @Override
    public AdminCourseDetailResponse updateCourse(UUID courseId, String teacherUsername, TeacherCourseRequest request) {
        Course course = findOwnedCourse(courseId, teacherUsername);
        ensureCourseNotPendingReview(course);

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", request.getCategoryId()));
        UUID currentCategoryId = course.getCategory() != null ? course.getCategory().getId() : null;
        if (!request.getCategoryId().equals(currentCategoryId) && !Boolean.TRUE.equals(category.getIsActive())) {
            throw new BadRequestException("CATEGORY_INACTIVE", "Selected category is not active");
        }

        course.setCategory(category);
        course.setTitle(request.getTitle().trim());
        course.setDescription(trimToNull(request.getDescription()));
        course.setThumbnail(trimToNull(request.getThumbnail()));
        course.setSkillFocus(request.getSkillFocus());
        course.setDifficultyLevel(request.getDifficultyLevel());
        course.setEstimatedDuration(request.getEstimatedDuration());
        if (request.getCourseOutline() != null) {
            course.setCourseOutline(request.getCourseOutline());
        }

        courseRepository.saveAndFlush(course);
        return contentReviewService.getCourseDetailForTeacher(courseId, teacherUsername);
    }

    @Override
    public void deleteCourse(UUID courseId, String teacherUsername) {
        Course course = findOwnedCourse(courseId, teacherUsername);
        if ((course.getStatus() != ContentStatus.DRAFT && course.getStatus() != ContentStatus.REJECTED)
                || course.getPublishedAt() != null) {
            throw new ConflictException("COURSE_NOT_DELETABLE",
                    "Only unpublished DRAFT or REJECTED courses can be deleted; archive published courses instead");
        }
        if (enrollmentRepository.existsByCourseId(courseId) || userSubmissionRepository.existsByCourseId(courseId)) {
            throw new ConflictException("COURSE_HAS_LEARNER_DATA",
                    "Cannot delete a course with student enrollments or submissions; archive it instead");
        }
        courseRepository.delete(course);
        courseRepository.flush();
    }

    @Override
    public AdminCourseDetailResponse archiveCourse(UUID courseId, String teacherUsername) {
        Course course = findOwnedCourse(courseId, teacherUsername);
        if (course.getStatus() == ContentStatus.PENDING_REVIEW) {
            throw new ConflictException("COURSE_PENDING_REVIEW",
                    "Withdraw the course from review before archiving");
        }
        if (!Boolean.TRUE.equals(course.getIsActive())) {
            throw new ConflictException("COURSE_ALREADY_INACTIVE", "Course is already archived or inactive");
        }
        course.setIsActive(false);
        course.setIsFeatured(false);
        courseRepository.saveAndFlush(course);
        return contentReviewService.getCourseDetailForTeacher(courseId, teacherUsername);
    }

    @Override
    public AdminSectionResponse createSection(UUID courseId, String teacherUsername, TeacherSectionRequest request) {
        Course course = findOwnedCourse(courseId, teacherUsername);
        ensureCourseNotPendingReview(course);

        int ordering = request.getOrdering() != null
                ? request.getOrdering()
                : sectionRepository.findMaxOrderingByCourseId(courseId) + 1;

        Section section = Section.builder()
                .course(course)
                .title(request.getTitle().trim())
                .description(trimToNull(request.getDescription()))
                .ordering(ordering)
                .build();

        Section saved = sectionRepository.saveAndFlush(section);
        return toAdminSectionResponse(saved, List.of());
    }

    @Override
    public AdminSectionResponse updateSection(UUID sectionId, String teacherUsername, TeacherSectionRequest request) {
        Section section = findOwnedSection(sectionId, teacherUsername);
        ensureCourseNotPendingReview(section.getCourse());

        section.setTitle(request.getTitle().trim());
        section.setDescription(trimToNull(request.getDescription()));
        if (request.getOrdering() != null) {
            section.setOrdering(request.getOrdering());
        }

        Section saved = sectionRepository.saveAndFlush(section);
        List<Lesson> sectionLessons = lessonRepository.findBySectionIdOrderByOrderingAsc(sectionId);
        List<UUID> lessonIds = sectionLessons.stream().map(Lesson::getId).toList();
        Map<UUID, Long> exerciseCounts = lessonIds.isEmpty() ? Map.of()
                : exerciseRepository.countByLessonIds(lessonIds).stream()
                        .collect(Collectors.toMap(LessonExerciseCount::getLessonId, LessonExerciseCount::getTotal));
        List<AdminLessonResponse> lessons = sectionLessons.stream()
                .map(lesson -> toAdminLessonResponse(
                        lesson, Math.toIntExact(exerciseCounts.getOrDefault(lesson.getId(), 0L))))
                .toList();
        return toAdminSectionResponse(saved, lessons);
    }

    @Override
    public void deleteSection(UUID sectionId, String teacherUsername) {
        Section section = findOwnedSection(sectionId, teacherUsername);
        ensureCourseNotPendingReview(section.getCourse());

        if (lessonRepository.existsBySectionIdAndStatusIn(
                sectionId, List.of(ContentStatus.APPROVED, ContentStatus.PENDING_REVIEW))) {
            throw new ConflictException("SECTION_HAS_PROTECTED_LESSONS",
                    "Cannot delete a section containing APPROVED or PENDING_REVIEW lessons");
        }
        if (userSubmissionRepository.existsBySectionId(sectionId)) {
            throw new ConflictException("SECTION_HAS_SUBMISSIONS",
                    "Cannot delete a section that has student submissions");
        }

        sectionRepository.delete(section);
        sectionRepository.flush();
    }

    @Override
    public AdminLessonResponse createLesson(UUID sectionId, String teacherUsername, TeacherLessonRequest request) {
        Section section = findOwnedSection(sectionId, teacherUsername);
        ensureCourseNotPendingReview(section.getCourse());

        String lessonType = normalizeAndValidateLessonType(request.getLessonType());
        int ordering = request.getOrdering() != null
                ? request.getOrdering()
                : lessonRepository.findMaxOrderingBySectionId(sectionId) + 1;

        Lesson lesson = Lesson.builder()
                .section(section)
                .title(request.getTitle().trim())
                .lessonType(lessonType)
                .videoUrl(trimToNull(request.getVideoUrl()))
                .videoDuration(request.getVideoDuration())
                .documentUrl(trimToNull(request.getDocumentUrl()))
                .ordering(ordering)
                .isPreview(Boolean.TRUE.equals(request.getIsPreview()))
                .status(ContentStatus.DRAFT)
                .build();

        Lesson saved = lessonRepository.saveAndFlush(lesson);
        return toAdminLessonResponse(saved, 0);
    }

    @Override
    public AdminLessonResponse updateLesson(UUID lessonId, String teacherUsername, TeacherLessonRequest request) {
        Lesson lesson = findOwnedLesson(lessonId, teacherUsername);
        Course course = lesson.getSection().getCourse();
        ensureCourseNotPendingReview(course);

        if (lesson.getStatus() == ContentStatus.PENDING_REVIEW) {
            throw new ConflictException("LESSON_PENDING_REVIEW",
                    "Cannot edit a lesson while it is pending review; withdraw it first");
        }

        String lessonType = normalizeAndValidateLessonType(request.getLessonType());
        lesson.setTitle(request.getTitle().trim());
        lesson.setLessonType(lessonType);
        lesson.setVideoUrl(trimToNull(request.getVideoUrl()));
        lesson.setVideoDuration(request.getVideoDuration());
        lesson.setDocumentUrl(trimToNull(request.getDocumentUrl()));
        if (request.getOrdering() != null) {
            lesson.setOrdering(request.getOrdering());
        }
        if (request.getIsPreview() != null) {
            lesson.setIsPreview(request.getIsPreview());
        }

        if (lesson.getStatus() == ContentStatus.APPROVED) {
            contentReviewService.resetLessonToDraftAfterEdit(lesson);
        }

        Lesson saved = lessonRepository.saveAndFlush(lesson);
        int exerciseCount = Math.toIntExact(exerciseRepository.countByLessonId(saved.getId()));
        return toAdminLessonResponse(saved, exerciseCount);
    }

    @Override
    public void deleteLesson(UUID lessonId, String teacherUsername) {
        Lesson lesson = findOwnedLesson(lessonId, teacherUsername);
        ensureCourseNotPendingReview(lesson.getSection().getCourse());

        if (lesson.getStatus() != ContentStatus.DRAFT && lesson.getStatus() != ContentStatus.REJECTED) {
            throw new ConflictException("LESSON_NOT_DELETABLE",
                    "Only DRAFT or REJECTED lessons can be deleted");
        }
        if (userSubmissionRepository.existsByLessonId(lessonId)) {
            throw new ConflictException("LESSON_HAS_SUBMISSIONS",
                    "Cannot delete a lesson that has student submissions");
        }

        lessonRepository.delete(lesson);
        lessonRepository.flush();
    }

    private Users findTeacherOrUnauthorized(String username) {
        return userRepository.findByUsername(DbUserDetailsService.normalize(username))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));
    }

    private Course findOwnedCourse(UUID courseId, String teacherUsername) {
        Users teacher = findTeacherOrUnauthorized(teacherUsername);
        Course course = courseRepository.findWithDetailsById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));
        if (!course.getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenException("You do not own this course");
        }
        return course;
    }

    private Section findOwnedSection(UUID sectionId, String teacherUsername) {
        Users teacher = findTeacherOrUnauthorized(teacherUsername);
        Section section = sectionRepository.findByIdWithCourse(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));
        if (!section.getCourse().getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenException("You do not own this section");
        }
        return section;
    }

    private Lesson findOwnedLesson(UUID lessonId, String teacherUsername) {
        Users teacher = findTeacherOrUnauthorized(teacherUsername);
        Lesson lesson = lessonRepository.findByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        if (!lesson.getSection().getCourse().getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenException("You do not own this lesson");
        }
        return lesson;
    }

    private static void ensureCourseNotPendingReview(Course course) {
        if (course.getStatus() == ContentStatus.PENDING_REVIEW) {
            throw new ConflictException("COURSE_PENDING_REVIEW",
                    "Cannot modify course content while the course is pending review; withdraw it first");
        }
    }

    private static String normalizeAndValidateLessonType(String raw) {
        if (raw == null || raw.isBlank()) {
            return "VIDEO";
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if (!VALID_LESSON_TYPES.contains(normalized)) {
            throw new BadRequestException("INVALID_LESSON_TYPE",
                    "Lesson type must be VIDEO, DOCUMENT, or TEXT");
        }
        return normalized;
    }

    private static AdminSectionResponse toAdminSectionResponse(Section section, List<AdminLessonResponse> lessons) {
        return AdminSectionResponse.builder()
                .id(section.getId())
                .title(section.getTitle())
                .description(section.getDescription())
                .ordering(section.getOrdering())
                .lessons(lessons)
                .build();
    }

    private static AdminLessonResponse toAdminLessonResponse(Lesson lesson, int exerciseCount) {
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

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
