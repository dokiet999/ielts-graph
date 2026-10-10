package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.CourseFilter;
import com.ielts.backend.dto.response.CourseDetailResponse;
import com.ielts.backend.dto.response.CourseResponse;
import com.ielts.backend.dto.response.EnrollmentResponse;
import com.ielts.backend.dto.response.CourseEnrollmentResponse;
import com.ielts.backend.dto.response.LessonSummaryResponse;
import com.ielts.backend.dto.response.MyCourseResponse;
import com.ielts.backend.dto.response.PageResponse;
import com.ielts.backend.dto.response.SectionWithLessonsResponse;
import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Enrollment;
import com.ielts.backend.entity.Section;
import com.ielts.backend.entity.User;
import com.ielts.backend.exception.ResourceNotFoundException;
import com.ielts.backend.exception.UnauthorizedException;
import com.ielts.backend.mapper.CourseMapper;
import com.ielts.backend.mapper.LessonMapper;
import com.ielts.backend.repository.CourseRepository;
import com.ielts.backend.repository.EnrollmentRepository.CourseEnrollmentCount;
import com.ielts.backend.repository.EnrollmentRepository;
import com.ielts.backend.repository.LessonRepository;
import com.ielts.backend.repository.SectionRepository;
import com.ielts.backend.repository.SectionRepository.CourseSectionCount;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.CourseService;
import com.ielts.backend.service.progress.ExerciseCounts;
import com.ielts.backend.service.progress.LearningProgressReader;
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

import static com.ielts.backend.repository.CourseSpecifications.hasLevel;
import static com.ielts.backend.repository.CourseSpecifications.hasSkill;
import static com.ielts.backend.repository.CourseSpecifications.inCategory;
import static com.ielts.backend.repository.CourseSpecifications.titleContains;
import static com.ielts.backend.repository.CourseSpecifications.visible;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final LessonRepository lessonRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final CourseMapper courseMapper;
    private final LessonMapper lessonMapper;
    private final LearningProgressReader progressReader;

    @Override
    public PageResponse<CourseResponse> getCourses(CourseFilter filter, Pageable pageable) {
        List<Specification<Course>> specs = Stream.of(
                        visible(),
                        hasSkill(filter.skill()),
                        inCategory(filter.categoryId()),
                        hasLevel(filter.level()),
                        titleContains(filter.q()))
                .filter(Objects::nonNull)
                .toList();
        Page<Course> page = courseRepository.findAll(Specification.allOf(specs), pageable);

        // One grouped COUNT for the whole page
        List<UUID> courseIds = page.getContent().stream().map(Course::getId).toList();
        Map<UUID, Long> counts = courseIds.isEmpty() ? Map.of()
                : enrollmentRepository.countActiveByCourseIds(courseIds).stream()
                        .collect(Collectors.toMap(CourseEnrollmentCount::getCourseId, CourseEnrollmentCount::getTotal));

        return PageResponse.of(page, c -> courseMapper.toResponse(c, counts.getOrDefault(c.getId(), 0L)));
    }

    @Override
    public CourseDetailResponse getCourseDetail(UUID courseId, String username) {
        Course course = findVisibleCourse(courseId);
        User user = username != null ? findUser(username) : null;
        ExerciseCounts counts = progressReader.countExercises(List.of(courseId), user != null ? user.getId() : null);

        List<Section> sections = sectionRepository.findByCourseIdOrderByOrderingAsc(courseId);
        // One query for all lessons of the course, then group them by section in memory
        List<LessonSummaryResponse> lessons = lessonRepository.findAllByCourseIdOrdered(courseId).stream()
                .map(l -> lessonMapper.toSummary(l, counts.total(l.getId())))
                .toList();
        Map<UUID, List<LessonSummaryResponse>> lessonsBySection = lessons.stream()
                .collect(Collectors.groupingBy(LessonSummaryResponse::getSectionId));

        List<SectionWithLessonsResponse> sectionResponses = sections.stream()
                .map(s -> courseMapper.toSectionWithLessons(s, lessonsBySection.getOrDefault(s.getId(), List.of()),
                        counts.total(s.getId()), user != null ? counts.completed(s.getId()) : null))
                .toList();

        CourseEnrollmentResponse enrollment = user == null ? null
                : enrollmentRepository.findByUserIdAndCourseIdAndIsActiveTrue(user.getId(), courseId)
                        .map(e -> CourseEnrollmentResponse.builder()
                                .enrolledAt(e.getEnrollmentDate())
                                .completedAt(e.getCompletionDate())
                                .build())
                        .orElse(null);

        return CourseDetailResponse.builder()
                .course(courseMapper.toResponse(course, enrollmentRepository.countByCourseIdAndIsActiveTrue(courseId)))
                .totalLessons(lessons.size())
                .sections(sectionResponses)
                .exerciseCount(counts.total(courseId))
                .completedExerciseCount(user != null ? counts.completed(courseId) : null)
                .enrollment(enrollment)
                .build();
    }

    @Override
    public List<LessonSummaryResponse> getCourseLessons(UUID courseId) {
        if (!courseRepository.existsByIdAndIsActiveTrueAndPublishedAtIsNotNull(courseId)) {
            throw new ResourceNotFoundException("Course", courseId);
        }
        ExerciseCounts counts = progressReader.countExercises(List.of(courseId), null);
        return lessonRepository.findAllByCourseIdOrdered(courseId).stream()
                .map(l -> lessonMapper.toSummary(l, counts.total(l.getId())))
                .toList();
    }

    /**
     * Idempotent: enrolling twice returns the existing enrollment (reactivated if it was inactive).
     */
    @Override
    @Transactional
    public EnrollmentResponse enroll(UUID courseId, String username) {
        Course course = findVisibleCourse(courseId);
        User user = findUser(username);

        // ON CONFLICT DO NOTHING keeps concurrent requests from hitting uq_enrollment
        boolean created = enrollmentRepository.insertIfAbsent(user.getId(), course.getId()) == 1;
        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(user.getId(), course.getId())
                .orElseThrow(() -> new IllegalStateException("Enrollment missing after insert"));
        if (!enrollment.getIsActive()) {
            enrollment.setIsActive(true);
        }

        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .courseId(courseId)
                .enrollmentDate(enrollment.getEnrollmentDate())
                .progressPercentage(enrollment.getProgressPercentage())
                .completionDate(enrollment.getCompletionDate())
                .created(created)
                .build();
    }

    @Override
    public List<MyCourseResponse> getMyCourses(String username) {
        User user = findUser(username);
        List<Enrollment> enrollments = enrollmentRepository.findActiveInVisibleCoursesByUserId(user.getId());
        if (enrollments.isEmpty()) {
            return List.of();
        }

        List<UUID> courseIds = enrollments.stream().map(e -> e.getCourse().getId()).toList();
        Map<UUID, Long> sectionCounts = sectionRepository.countByCourseIds(courseIds).stream()
                .collect(Collectors.toMap(CourseSectionCount::getCourseId, CourseSectionCount::getTotal));
        ExerciseCounts counts = progressReader.countExercises(courseIds, user.getId());

        return enrollments.stream()
                .map(e -> {
                    UUID courseId = e.getCourse().getId();
                    return courseMapper.toMyCourse(e, Math.toIntExact(sectionCounts.getOrDefault(courseId, 0L)),
                            counts.total(courseId), counts.completed(courseId));
                })
                .toList();
    }

    private User findUser(String username) {
        return userRepository.findByUsername(DbUserDetailsService.normalize(username))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));
    }

    private Course findVisibleCourse(UUID courseId) {
        return courseRepository.findByIdAndIsActiveTrueAndPublishedAtIsNotNull(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));
    }
}
