package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.TeacherSubmissionFeedbackRequest;
import com.ielts.backend.dto.request.TeacherUnlockFinalTestRequest;
import com.ielts.backend.dto.response.CourseProgressOverviewResponse;
import com.ielts.backend.dto.response.CourseStudentProgressItemResponse;
import com.ielts.backend.dto.response.StudentCourseProgressDetailResponse;
import com.ielts.backend.dto.response.StudentCourseProgressDetailResponse.ExerciseProgressItem;
import com.ielts.backend.dto.response.StudentCourseProgressDetailResponse.LessonProgressItem;
import com.ielts.backend.dto.response.StudentCourseProgressDetailResponse.SectionFinalTestProgress;
import com.ielts.backend.dto.response.StudentCourseProgressDetailResponse.SectionProgressItem;
import com.ielts.backend.dto.response.StudentCourseProgressDetailResponse.StudentSubmissionHistoryItem;
import com.ielts.backend.dto.response.SubmissionDetailResponse;
import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Enrollment;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.FinalTestGrant;
import com.ielts.backend.entity.Lesson;
import com.ielts.backend.entity.QuestionAnswer;
import com.ielts.backend.entity.Section;
import com.ielts.backend.entity.UserSubmission;
import com.ielts.backend.entity.Users;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.GradingMethod;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.exception.customException.BadRequestException;
import com.ielts.backend.exception.customException.ConflictException;
import com.ielts.backend.exception.customException.ForbiddenException;
import com.ielts.backend.exception.customException.ResourceNotFoundException;
import com.ielts.backend.exception.customException.UnauthorizedException;
import com.ielts.backend.repository.CourseRepository;
import com.ielts.backend.repository.EnrollmentRepository;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.ExerciseRepository.CountableExercise;
import com.ielts.backend.repository.FinalTestGrantRepository;
import com.ielts.backend.repository.LessonRepository;
import com.ielts.backend.repository.QuestionAnswerRepository;
import com.ielts.backend.repository.QuestionRepository;
import com.ielts.backend.repository.QuestionRepository.ExerciseQuestionStats;
import com.ielts.backend.repository.SectionRepository;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.repository.UserSubmissionRepository.CourseUserSubmissionRow;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.SubmissionService;
import com.ielts.backend.service.TeacherProgressService;
import com.ielts.backend.service.progress.EnrollmentProgressSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeacherProgressServiceImpl implements TeacherProgressService {

    private static final BigDecimal HALF_POINT = new BigDecimal("0.5");

    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final LessonRepository lessonRepository;
    private final ExerciseRepository exerciseRepository;
    private final QuestionRepository questionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserSubmissionRepository userSubmissionRepository;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final FinalTestGrantRepository finalTestGrantRepository;
    private final UserRepository userRepository;
    private final SubmissionService submissionService;
    private final EnrollmentProgressSyncService enrollmentProgressSyncService;

    @Override
    public CourseProgressOverviewResponse getCourseStudentsForTeacher(
            UUID courseId, String teacherUsername, String q, String scheduleStatus) {
        Course course = findOwnedCourse(courseId, teacherUsername);
        return buildCourseOverview(course, q, scheduleStatus);
    }

    @Override
    public CourseProgressOverviewResponse getCourseStudentsForAdmin(
            UUID courseId, String q, String scheduleStatus) {
        Course course = courseRepository.findWithDetailsById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));
        return buildCourseOverview(course, q, scheduleStatus);
    }

    @Override
    public StudentCourseProgressDetailResponse getStudentDetailForTeacher(
            UUID courseId, UUID studentId, String teacherUsername) {
        Course course = findOwnedCourse(courseId, teacherUsername);
        return buildStudentDetail(course, studentId);
    }

    @Override
    public StudentCourseProgressDetailResponse getStudentDetailForAdmin(
            UUID courseId, UUID studentId) {
        Course course = courseRepository.findWithDetailsById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));
        return buildStudentDetail(course, studentId);
    }

    @Override
    @Transactional
    public SectionFinalTestProgress unlockStudentFinalTest(
            UUID courseId, UUID sectionId, UUID studentId, String teacherUsername, TeacherUnlockFinalTestRequest request) {
        Users teacher = findUserOrUnauthorized(teacherUsername);
        Course course = findOwnedCourse(courseId, teacherUsername);
        return saveStudentFinalTestGrant(course, sectionId, studentId, teacher, request);
    }

    @Override
    @Transactional
    public SectionFinalTestProgress lockStudentFinalTest(
            UUID courseId, UUID sectionId, UUID studentId, String teacherUsername) {
        Course course = findOwnedCourse(courseId, teacherUsername);
        return revokeStudentFinalTestGrant(course, sectionId, studentId);
    }

    @Override
    @Transactional
    public SectionFinalTestProgress unlockStudentFinalTestForAdmin(
            UUID courseId, UUID sectionId, UUID studentId, String adminUsername, TeacherUnlockFinalTestRequest request) {
        Users admin = findUserOrUnauthorized(adminUsername);
        Course course = courseRepository.findWithDetailsById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));
        return saveStudentFinalTestGrant(course, sectionId, studentId, admin, request);
    }

    @Override
    @Transactional
    public SectionFinalTestProgress lockStudentFinalTestForAdmin(
            UUID courseId, UUID sectionId, UUID studentId, String adminUsername) {
        findUserOrUnauthorized(adminUsername);
        Course course = courseRepository.findWithDetailsById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));
        return revokeStudentFinalTestGrant(course, sectionId, studentId);
    }

    private SectionFinalTestProgress saveStudentFinalTestGrant(
            Course course, UUID sectionId, UUID studentId, Users actor, TeacherUnlockFinalTestRequest request) {
        UUID courseId = course.getId();
        Section section = findCourseSection(courseId, sectionId);
        ensureStudentEnrolled(courseId, studentId);

        int days = (request != null && request.getDeadlineDays() != null && request.getDeadlineDays() > 0)
                ? request.getDeadlineDays()
                : 7;
        LocalDateTime now = LocalDateTime.now();

        FinalTestGrant grant = finalTestGrantRepository.findByUserIdAndSectionId(studentId, sectionId)
                .orElseGet(() -> FinalTestGrant.builder()
                        .userId(studentId)
                        .sectionId(sectionId)
                        .build());
        grant.setUnlockedBy(actor.getId());
        grant.setDeadlineDays(days);
        grant.setUnlockedAt(now);
        grant.setExpiresAt(now.plusDays(days));
        finalTestGrantRepository.saveAndFlush(grant);

        return buildSectionFinalTestProgress(course, section, studentId, grant,
                userSubmissionRepository.findByCourseIdAndUserIdDetailed(courseId, studentId), now);
    }

    private SectionFinalTestProgress revokeStudentFinalTestGrant(Course course, UUID sectionId, UUID studentId) {
        UUID courseId = course.getId();
        Section section = findCourseSection(courseId, sectionId);
        ensureStudentEnrolled(courseId, studentId);

        finalTestGrantRepository.deleteByUserIdAndSectionId(studentId, sectionId);
        finalTestGrantRepository.flush();

        return buildSectionFinalTestProgress(course, section, studentId, null,
                userSubmissionRepository.findByCourseIdAndUserIdDetailed(courseId, studentId), LocalDateTime.now());
    }

    @Override
    @Transactional
    public SubmissionDetailResponse gradeSubmission(
            UUID submissionId, String teacherUsername, TeacherSubmissionFeedbackRequest request) {
        Users teacher = findUserOrUnauthorized(teacherUsername);
        UserSubmission submission = userSubmissionRepository.findByIdWithFullCourseHierarchy(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission", submissionId));

        Exercise exercise = submission.getExercise();
        if (exercise.getLesson() == null
                || !exercise.getLesson().getSection().getCourse().getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenException("You do not own this submission's course");
        }
        if (submission.getStatus() != SubmissionStatus.GRADED && submission.getStatus() != SubmissionStatus.PENDING) {
            throw new ConflictException("SUBMISSION_NOT_GRADABLE",
                    "Chỉ có thể chấm nhận xét bài nộp đã hoàn tất hoặc đang chờ chấm");
        }

        BigDecimal teacherScore = request.getTeacherScore();
        if (teacherScore != null) {
            if (submission.getMaxScore() != null && teacherScore.compareTo(submission.getMaxScore()) > 0) {
                throw new BadRequestException("INVALID_SCORE",
                        "Điểm giáo viên không được vượt quá điểm tối đa (" + submission.getMaxScore() + ")");
            }
            if ((exercise.getSkillType() == SkillType.WRITING || exercise.getSkillType() == SkillType.SPEAKING)
                    && teacherScore.remainder(HALF_POINT).compareTo(BigDecimal.ZERO) != 0) {
                throw new BadRequestException("INVALID_SCORE_STEP",
                        "Điểm Writing/Speaking phải theo bước 0.5 (ví dụ 6.0, 6.5, 7.0)");
            }
            submission.setTeacherScore(teacherScore.setScale(2, RoundingMode.HALF_UP));
            submission.setScore(teacherScore.setScale(2, RoundingMode.HALF_UP));
            if (submission.getStatus() == SubmissionStatus.PENDING) {
                submission.setStatus(SubmissionStatus.GRADED);
            }
        } else {
            submission.setTeacherScore(null);
            if (submission.getAiScore() != null) {
                submission.setScore(submission.getAiScore());
            }
        }

        String cleanFeedback = request.getTeacherFeedback().trim();
        submission.setTeacherFeedback(cleanFeedback);
        submission.setGradingMethod(GradingMethod.TEACHER);
        submission.setGradedBy(teacher);
        submission.setGradedAt(LocalDateTime.now());
        userSubmissionRepository.saveAndFlush(submission);

        List<QuestionAnswer> answers = questionAnswerRepository.findBySubmissionIdOrderByCreatedAtAsc(submissionId);
        if (answers.size() == 1) {
            QuestionAnswer single = answers.get(0);
            single.setTeacherFeedback(cleanFeedback);
            if (teacherScore != null) {
                BigDecimal scaled = teacherScore.setScale(2, RoundingMode.HALF_UP);
                single.setTeacherPoints(scaled);
                single.setPointsEarned(scaled);
            }
            questionAnswerRepository.saveAndFlush(single);
        }

        enrollmentProgressSyncService.syncForUserAndExercise(submission.getUser().getId(), exercise.getId());
        return submissionService.getSubmissionResult(submissionId, teacherUsername);
    }

    private CourseProgressOverviewResponse buildCourseOverview(Course course, String q, String scheduleStatus) {
        UUID courseId = course.getId();
        LocalDateTime now = LocalDateTime.now();

        List<Enrollment> enrollments = enrollmentRepository.findActiveWithUserByCourseId(courseId);
        List<CountableExercise> countable = exerciseRepository.findCountableByCourseIds(List.of(courseId));
        Set<UUID> countableIds = countable.stream().map(CountableExercise::getExerciseId).collect(Collectors.toSet());
        int totalExercises = countable.size();

        List<CourseUserSubmissionRow> rows = userSubmissionRepository.findCourseSubmissionRows(courseId, ContentStatus.APPROVED);
        Map<UUID, List<CourseUserSubmissionRow>> rowsByUser = rows.stream()
                .collect(Collectors.groupingBy(CourseUserSubmissionRow::getUserId));

        List<CourseStudentProgressItemResponse> allItems = enrollments.stream()
                .map(enrollment -> toStudentProgressItem(
                        course,
                        enrollment,
                        countableIds,
                        totalExercises,
                        rowsByUser.getOrDefault(enrollment.getUser().getId(), List.of()),
                        now))
                .toList();

        double averageProgressPercent = allItems.isEmpty()
                ? 0.0
                : roundOneDecimal(allItems.stream().mapToDouble(CourseStudentProgressItemResponse::getProgressPercent).average().orElse(0.0));
        int completedCount = (int) allItems.stream().filter(i -> "COMPLETED".equals(i.getScheduleStatus())).count();
        int behindOrInactiveCount = (int) allItems.stream()
                .filter(i -> "BEHIND".equals(i.getScheduleStatus()) || "INACTIVE".equals(i.getScheduleStatus()))
                .count();
        int preEnrolledCount = (int) allItems.stream().filter(i -> "PRE_ENROLLED".equals(i.getScheduleStatus())).count();

        String normalizedQ = q != null && !q.isBlank() ? q.trim().toLowerCase(Locale.ROOT) : null;
        String normalizedStatus = scheduleStatus != null && !scheduleStatus.isBlank()
                ? scheduleStatus.trim().toUpperCase(Locale.ROOT)
                : null;

        List<CourseStudentProgressItemResponse> filtered = allItems.stream()
                .filter(item -> normalizedQ == null
                        || containsIgnoreCase(item.getFullName(), normalizedQ)
                        || containsIgnoreCase(item.getEmail(), normalizedQ)
                        || containsIgnoreCase(item.getUsername(), normalizedQ))
                .filter(item -> normalizedStatus == null || normalizedStatus.equals(item.getScheduleStatus()))
                .toList();

        return CourseProgressOverviewResponse.builder()
                .courseId(courseId)
                .courseTitle(course.getTitle())
                .maxStudents(course.getMaxStudents())
                .activeStudentCount(enrollments.size())
                .startDate(course.getStartDate())
                .endDate(course.getEndDate())
                .totalExercises(totalExercises)
                .averageProgressPercent(averageProgressPercent)
                .completedCount(completedCount)
                .behindOrInactiveCount(behindOrInactiveCount)
                .preEnrolledCount(preEnrolledCount)
                .students(filtered)
                .build();
    }

    private CourseStudentProgressItemResponse toStudentProgressItem(
            Course course,
            Enrollment enrollment,
            Set<UUID> countableIds,
            int totalExercises,
            List<CourseUserSubmissionRow> userRows,
            LocalDateTime now) {
        Users student = enrollment.getUser();
        Set<UUID> completedIds = new HashSet<>();
        LocalDateTime lastSubmittedAt = null;
        int pendingReviewCount = 0;
        double scoreRatioSum = 0.0;
        int scoreRatioCount = 0;

        for (CourseUserSubmissionRow row : userRows) {
            if (row.getSubmittedAt() != null && (lastSubmittedAt == null || row.getSubmittedAt().isAfter(lastSubmittedAt))) {
                lastSubmittedAt = row.getSubmittedAt();
            }
            if (row.getStatus() == SubmissionStatus.GRADED) {
                if (countableIds.contains(row.getExerciseId())) {
                    completedIds.add(row.getExerciseId());
                }
                if (row.getScore() != null && row.getMaxScore() != null && row.getMaxScore().compareTo(BigDecimal.ZERO) > 0) {
                    scoreRatioSum += row.getScore().doubleValue() * 100.0 / row.getMaxScore().doubleValue();
                    scoreRatioCount++;
                }
                if ((row.getSkillType() == SkillType.WRITING || row.getSkillType() == SkillType.SPEAKING)
                        && (row.getTeacherFeedback() == null || row.getTeacherFeedback().isBlank())) {
                    pendingReviewCount++;
                }
            }
        }

        int completedCount = completedIds.size();
        double progressPercent = totalExercises > 0
                ? roundOneDecimal(completedCount * 100.0 / totalExercises)
                : 0.0;
        Double averageScore = scoreRatioCount > 0 ? roundOneDecimal(scoreRatioSum / scoreRatioCount) : null;
        String scheduleStatus = computeScheduleStatus(
                course, enrollment.getEnrollmentDate(), completedCount, totalExercises, progressPercent, lastSubmittedAt, now);

        return CourseStudentProgressItemResponse.builder()
                .studentId(student.getId())
                .fullName(student.getFullName())
                .username(student.getUsername())
                .email(student.getEmail())
                .enrolledAt(enrollment.getEnrollmentDate())
                .completedAt(enrollment.getCompletionDate())
                .completedExercises(completedCount)
                .totalExercises(totalExercises)
                .progressPercent(progressPercent)
                .averageScore(averageScore)
                .totalSubmissions(userRows.size())
                .pendingReviewCount(pendingReviewCount)
                .lastSubmittedAt(lastSubmittedAt)
                .scheduleStatus(scheduleStatus)
                .build();
    }

    private StudentCourseProgressDetailResponse buildStudentDetail(Course course, UUID studentId) {
        UUID courseId = course.getId();
        LocalDateTime now = LocalDateTime.now();

        Enrollment enrollment = ensureStudentEnrolled(courseId, studentId);
        Users student = enrollment.getUser();

        List<Section> sections = sectionRepository.findByCourseIdOrderByOrderingAsc(courseId);
        List<Lesson> lessons = lessonRepository.findByCourseIdAndStatusOrdered(courseId, ContentStatus.APPROVED);
        List<Exercise> allExercises = exerciseRepository.findAllByCourseIdAndLessonStatus(courseId, ContentStatus.APPROVED);
        List<UUID> exerciseIds = allExercises.stream().map(Exercise::getId).toList();

        Map<UUID, ExerciseQuestionStats> questionStats = exerciseIds.isEmpty() ? Map.of()
                : questionRepository.summarizeByExerciseIds(exerciseIds).stream()
                        .collect(Collectors.toMap(ExerciseQuestionStats::getExerciseId, Function.identity()));

        List<UserSubmission> submissions = userSubmissionRepository.findByCourseIdAndUserIdDetailed(courseId, studentId);
        Map<UUID, List<UserSubmission>> subsByExercise = submissions.stream()
                .collect(Collectors.groupingBy(s -> s.getExercise().getId()));

        List<UUID> sectionIds = sections.stream().map(Section::getId).toList();
        Map<UUID, FinalTestGrant> grantsBySection = sectionIds.isEmpty() ? Map.of()
                : finalTestGrantRepository.findByUserIdAndSectionIdIn(studentId, sectionIds).stream()
                        .collect(Collectors.toMap(FinalTestGrant::getSectionId, Function.identity()));

        Map<UUID, List<Lesson>> lessonsBySection = lessons.stream()
                .collect(Collectors.groupingBy(l -> l.getSection().getId()));
        Map<UUID, List<Exercise>> exercisesByLesson = allExercises.stream()
                .collect(Collectors.groupingBy(e -> e.getLesson().getId()));

        int courseTotalCountable = 0;
        int courseCompletedCountable = 0;

        List<SectionProgressItem> sectionItems = new ArrayList<>();
        for (Section section : sections) {
            List<Lesson> secLessons = lessonsBySection.getOrDefault(section.getId(), List.of());
            int sectionTotal = 0;
            int sectionCompleted = 0;
            List<LessonProgressItem> lessonItems = new ArrayList<>();

            for (Lesson lesson : secLessons) {
                List<Exercise> lessonExercises = exercisesByLesson.getOrDefault(lesson.getId(), List.of()).stream()
                        .filter(e -> e.getExerciseType() != ExerciseType.FINAL_TEST)
                        .toList();
                int lessonTotal = 0;
                int lessonCompleted = 0;
                List<ExerciseProgressItem> exerciseItems = new ArrayList<>();

                for (Exercise ex : lessonExercises) {
                    ExerciseQuestionStats qStats = questionStats.get(ex.getId());
                    int questionCount = qStats != null ? Math.toIntExact(qStats.getQuestionCount()) : 0;
                    BigDecimal maxScore = qStats != null && qStats.getMaxScore() != null
                            ? qStats.getMaxScore() : BigDecimal.ZERO;
                    List<UserSubmission> exSubs = subsByExercise.getOrDefault(ex.getId(), List.of());
                    boolean isGradedOnce = exSubs.stream().anyMatch(s -> s.getStatus() == SubmissionStatus.GRADED);
                    boolean isCountable = questionCount > 0 && !ExerciseType.TEST_TYPES.contains(ex.getExerciseType());

                    if (isCountable) {
                        lessonTotal++;
                        if (isGradedOnce) {
                            lessonCompleted++;
                        }
                    }

                    UserSubmission latest = exSubs.isEmpty() ? null : exSubs.get(0);
                    BigDecimal bestScore = exSubs.stream()
                            .filter(s -> s.getStatus() == SubmissionStatus.GRADED)
                            .map(UserSubmission::getScore)
                            .filter(Objects::nonNull)
                            .max(Comparator.naturalOrder())
                            .orElse(null);
                    boolean hasTeacherFeedback = exSubs.stream()
                            .anyMatch(s -> s.getTeacherFeedback() != null && !s.getTeacherFeedback().isBlank());

                    exerciseItems.add(ExerciseProgressItem.builder()
                            .exerciseId(ex.getId())
                            .title(ex.getTitle())
                            .exerciseType(ex.getExerciseType())
                            .skillType(ex.getSkillType())
                            .questionCount(questionCount)
                            .maxScore(maxScore)
                            .attemptCount(exSubs.size())
                            .bestScore(bestScore)
                            .completed(isGradedOnce)
                            .latestSubmissionId(latest != null ? latest.getId() : null)
                            .latestStatus(latest != null ? latest.getStatus() : null)
                            .lastSubmittedAt(latest != null ? latest.getSubmittedAt() : null)
                            .hasTeacherFeedback(hasTeacherFeedback)
                            .build());
                }

                sectionTotal += lessonTotal;
                sectionCompleted += lessonCompleted;
                lessonItems.add(LessonProgressItem.builder()
                        .lessonId(lesson.getId())
                        .title(lesson.getTitle())
                        .lessonType(lesson.getLessonType())
                        .ordering(lesson.getOrdering())
                        .completedExercises(lessonCompleted)
                        .totalExercises(lessonTotal)
                        .exercises(exerciseItems)
                        .build());
            }

            courseTotalCountable += sectionTotal;
            courseCompletedCountable += sectionCompleted;

            SectionFinalTestProgress finalTest = buildSectionFinalTestProgress(
                    course, section, studentId, grantsBySection.get(section.getId()), submissions, now);

            sectionItems.add(SectionProgressItem.builder()
                    .sectionId(section.getId())
                    .title(section.getTitle())
                    .ordering(section.getOrdering())
                    .completedExercises(sectionCompleted)
                    .totalExercises(sectionTotal)
                    .finalTest(finalTest)
                    .lessons(lessonItems)
                    .build());
        }

        LocalDateTime lastSubmittedAt = submissions.isEmpty() ? null : submissions.get(0).getSubmittedAt();
        double scoreRatioSum = 0.0;
        int scoreRatioCount = 0;
        for (UserSubmission s : submissions) {
            if (s.getStatus() == SubmissionStatus.GRADED
                    && s.getScore() != null && s.getMaxScore() != null && s.getMaxScore().compareTo(BigDecimal.ZERO) > 0) {
                scoreRatioSum += s.getScore().doubleValue() * 100.0 / s.getMaxScore().doubleValue();
                scoreRatioCount++;
            }
        }
        Double averageScore = scoreRatioCount > 0 ? roundOneDecimal(scoreRatioSum / scoreRatioCount) : null;
        double progressPercent = courseTotalCountable > 0
                ? roundOneDecimal(courseCompletedCountable * 100.0 / courseTotalCountable)
                : 0.0;
        String scheduleStatus = computeScheduleStatus(
                course, enrollment.getEnrollmentDate(), courseCompletedCountable, courseTotalCountable,
                progressPercent, lastSubmittedAt, now);

        List<StudentSubmissionHistoryItem> submissionItems = submissions.stream()
                .map(s -> StudentSubmissionHistoryItem.builder()
                        .id(s.getId())
                        .exerciseId(s.getExercise().getId())
                        .exerciseTitle(s.getExercise().getTitle())
                        .skillType(s.getExercise().getSkillType())
                        .exerciseType(s.getExercise().getExerciseType())
                        .attemptNumber(s.getAttemptNumber())
                        .status(s.getStatus())
                        .score(s.getScore())
                        .maxScore(s.getMaxScore())
                        .aiScore(s.getAiScore())
                        .teacherScore(s.getTeacherScore())
                        .teacherFeedback(s.getTeacherFeedback())
                        .gradingMethod(s.getGradingMethod())
                        .gradedByName(s.getGradedBy() != null ? s.getGradedBy().getFullName() : null)
                        .gradedAt(s.getGradedAt())
                        .submittedAt(s.getSubmittedAt())
                        .timeSpent(s.getTimeSpent())
                        .build())
                .toList();

        return StudentCourseProgressDetailResponse.builder()
                .courseId(courseId)
                .courseTitle(course.getTitle())
                .startDate(course.getStartDate())
                .endDate(course.getEndDate())
                .maxStudents(course.getMaxStudents())
                .studentId(student.getId())
                .fullName(student.getFullName())
                .username(student.getUsername())
                .email(student.getEmail())
                .enrolledAt(enrollment.getEnrollmentDate())
                .completedAt(enrollment.getCompletionDate())
                .completedExercises(courseCompletedCountable)
                .totalExercises(courseTotalCountable)
                .progressPercent(progressPercent)
                .averageScore(averageScore)
                .lastSubmittedAt(lastSubmittedAt)
                .scheduleStatus(scheduleStatus)
                .sections(sectionItems)
                .submissions(submissionItems)
                .build();
    }

    private SectionFinalTestProgress buildSectionFinalTestProgress(
            Course course,
            Section section,
            UUID studentId,
            FinalTestGrant grant,
            List<UserSubmission> courseSubmissions,
            LocalDateTime now) {
        List<Exercise> direct = exerciseRepository.findBySectionIdAndType(section.getId(), ExerciseType.FINAL_TEST);
        Exercise finalTest = !direct.isEmpty() ? direct.get(0) : null;
        if (finalTest == null) {
            List<Exercise> inCourse = exerciseRepository.findByCourseIdAndType(course.getId(), ExerciseType.FINAL_TEST);
            if (!inCourse.isEmpty()) {
                finalTest = inCourse.get(0);
            }
        }
        if (finalTest == null) {
            return null;
        }
        UUID ftId = finalTest.getId();
        List<UserSubmission> ftSubs = courseSubmissions.stream()
                .filter(s -> s.getExercise().getId().equals(ftId))
                .toList();
        boolean hasGrant = grant != null;
        boolean grantExpired = hasGrant && !grant.getExpiresAt().isAfter(now);
        boolean unlocked = hasGrant && !grantExpired;

        UserSubmission latest = ftSubs.isEmpty() ? null : ftSubs.get(0);
        BigDecimal bestScore = ftSubs.stream()
                .filter(s -> s.getStatus() == SubmissionStatus.GRADED)
                .map(UserSubmission::getScore)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);

        return SectionFinalTestProgress.builder()
                .exerciseId(ftId)
                .exerciseTitle(finalTest.getTitle())
                .unlocked(unlocked)
                .grantExpired(grantExpired)
                .deadlineDays(grant != null ? grant.getDeadlineDays() : null)
                .unlockedAt(grant != null ? grant.getUnlockedAt() : null)
                .grantExpiresAt(grant != null ? grant.getExpiresAt() : null)
                .attemptCount(ftSubs.size())
                .bestScore(bestScore)
                .latestSubmissionId(latest != null ? latest.getId() : null)
                .build();
    }

    private static String computeScheduleStatus(
            Course course,
            LocalDateTime enrolledAt,
            int completedExercises,
            int totalExercises,
            double progressPercent,
            LocalDateTime lastSubmittedAt,
            LocalDateTime now) {
        if (totalExercises > 0 && completedExercises >= totalExercises) {
            return "COMPLETED";
        }
        if (course.getStartDate() != null && now.isBefore(course.getStartDate())) {
            return "PRE_ENROLLED";
        }
        if (course.getStartDate() != null && course.getEndDate() != null
                && course.getEndDate().isAfter(course.getStartDate())
                && now.isAfter(course.getStartDate())) {
            long totalSeconds = Math.max(1L, Duration.between(course.getStartDate(), course.getEndDate()).getSeconds());
            long elapsedSeconds = Duration.between(course.getStartDate(), now).getSeconds();
            double elapsedPercent = Math.min(100.0, Math.max(0.0, elapsedSeconds * 100.0 / totalSeconds));
            if (elapsedPercent - progressPercent >= 25.0) {
                return "BEHIND";
            }
        }
        LocalDateTime activityBaseline = lastSubmittedAt;
        if (activityBaseline == null) {
            activityBaseline = (course.getStartDate() != null && enrolledAt != null && course.getStartDate().isAfter(enrolledAt))
                    ? course.getStartDate()
                    : enrolledAt;
        }
        if (activityBaseline != null && ChronoUnit.DAYS.between(activityBaseline, now) >= 7) {
            return "INACTIVE";
        }
        return "ON_TRACK";
    }

    private Users findUserOrUnauthorized(String username) {
        return userRepository.findByUsername(DbUserDetailsService.normalize(username))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));
    }

    private Course findOwnedCourse(UUID courseId, String teacherUsername) {
        Users teacher = findUserOrUnauthorized(teacherUsername);
        Course course = courseRepository.findWithDetailsById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));
        if (!course.getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenException("You do not own this course");
        }
        return course;
    }

    private Section findCourseSection(UUID courseId, UUID sectionId) {
        Section section = sectionRepository.findByIdWithCourse(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));
        if (!section.getCourse().getId().equals(courseId)) {
            throw new ResourceNotFoundException("Section", sectionId);
        }
        return section;
    }

    private Enrollment ensureStudentEnrolled(UUID courseId, UUID studentId) {
        return enrollmentRepository.findActiveWithUserByCourseIdAndUserId(courseId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Enrollment", studentId));
    }

    private static boolean containsIgnoreCase(String value, String needleLower) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needleLower);
    }

    private static double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
