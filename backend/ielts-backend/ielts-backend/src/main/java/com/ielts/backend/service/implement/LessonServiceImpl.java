package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.UnlockFinalTestRequest;
import com.ielts.backend.dto.response.ExerciseSummaryResponse;
import com.ielts.backend.dto.response.FinalTestSessionDto;
import com.ielts.backend.dto.response.FinalTestStatusResponse;
import com.ielts.backend.dto.response.LessonDetailResponse;
import com.ielts.backend.entity.*;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.exception.customException.ForbiddenException;
import com.ielts.backend.exception.customException.ResourceNotFoundException;
import com.ielts.backend.mapper.LessonMapper;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.FinalTestGrantRepository;
import com.ielts.backend.repository.FinalTestSessionRepository;
import com.ielts.backend.repository.LessonRepository;
import com.ielts.backend.repository.SectionRepository;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.CourseAccessService;
import com.ielts.backend.service.LessonService;
import com.ielts.backend.service.progress.ExerciseStats;
import com.ielts.backend.service.progress.LearningProgressReader;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LessonServiceImpl implements LessonService {

    private final LessonRepository lessonRepository;
    private final SectionRepository sectionRepository;
    private final ExerciseRepository exerciseRepository;
    private final UserRepository userRepository;
    private final UserSubmissionRepository userSubmissionRepository;
    private final FinalTestGrantRepository finalTestGrantRepository;
    private final FinalTestSessionRepository finalTestSessionRepository;
    private final CourseAccessService courseAccessService;
    private final LearningProgressReader progressReader;
    private final LessonMapper lessonMapper;

    @Override
    public LessonDetailResponse getLessonDetail(UUID lessonId, String username) {
        Lesson lesson = lessonRepository.findVisibleByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        courseAccessService.checkLessonAccess(lesson, username);

        Course course = lesson.getSection().getCourse();
        return LessonDetailResponse.builder()
                .lesson(lessonMapper.toResponse(lesson))
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .sectionId(lesson.getSection().getId())
                .sectionTitle(lesson.getSection().getTitle())
                // Exercises without questions are listed too; clients decide whether to show them.
                // Mock and Final tests have their own section tabs and do not appear in a lesson's practice list.
                .exercises(summarize(
                        exerciseRepository.findByLessonIdAndExerciseTypeNotInOrderByOrderingAsc(lessonId, ExerciseType.TEST_TYPES),
                        username))
                .build();
    }

    @Override
    public List<ExerciseSummaryResponse> getSectionExercises(UUID sectionId, String username) {
        Section section = sectionRepository.findByIdWithCourse(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));
        courseAccessService.checkSectionAccess(section, username);

        return summarize(exerciseRepository.findBySectionIdOrdered(sectionId), username);
    }

    @Override
    public List<ExerciseSummaryResponse> getSectionMockTests(UUID sectionId, String username) {
        Section section = sectionRepository.findByIdWithCourse(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));
        courseAccessService.checkSectionAccess(section, username);

        List<Exercise> mockTests = exerciseRepository.findBySectionIdAndType(sectionId, ExerciseType.MOCK_TEST);
        if (mockTests.isEmpty()) {
            mockTests = exerciseRepository.findByCourseIdAndType(section.getCourse().getId(), ExerciseType.MOCK_TEST);
        }
        return summarize(mockTests, username);
    }

    @Override
    public FinalTestStatusResponse getSectionFinalTest(UUID sectionId, String username) {
        Section section = sectionRepository.findByIdWithCourse(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));
        courseAccessService.checkSectionAccess(section, username);

        Exercise finalTest = findFinalTestOfSection(section);
        ExerciseSummaryResponse summary = finalTest == null ? null : summarize(List.of(finalTest), username).get(0);

        Users users = findUserOrNull(username);
        if (users == null || finalTest == null) {
            return FinalTestStatusResponse.builder()
                    .exercise(summary)
                    .unlocked(false)
                    .grantExpired(false)
                    .build();
        }

        LocalDateTime now = LocalDateTime.now();
        Optional<FinalTestGrant> grantOpt = finalTestGrantRepository.findByUserIdAndSectionId(users.getId(), section.getId());
        boolean hasGrant = grantOpt.isPresent();
        boolean grantExpired = hasGrant && !grantOpt.get().getExpiresAt().isAfter(now);
        boolean unlocked = hasGrant && !grantExpired;

        FinalTestSessionDto activeSession = resolveActiveSession(users.getId(), finalTest, now);

        return FinalTestStatusResponse.builder()
                .exercise(summary)
                .unlocked(unlocked)
                .grantExpired(grantExpired)
                .deadlineDays(grantOpt.map(FinalTestGrant::getDeadlineDays).orElse(null))
                .unlockedAt(grantOpt.map(FinalTestGrant::getUnlockedAt).orElse(null))
                .grantExpiresAt(grantOpt.map(FinalTestGrant::getExpiresAt).orElse(null))
                .activeSession(activeSession)
                .build();
    }

    @Override
    @Transactional
    public FinalTestStatusResponse unlockSectionFinalTest(UUID sectionId, UnlockFinalTestRequest request, String actorUsername) {
        Section section = sectionRepository.findByIdWithCourse(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));
        String targetUsername = (request != null && request.getUsername() != null && !request.getUsername().isBlank())
                ? request.getUsername()
                : actorUsername;
        Users targetUsers = findUserOrNull(targetUsername);
        if (targetUsers == null) {
            throw new ResourceNotFoundException("User", targetUsername);
        }
        Users actor = findUserOrNull(actorUsername);
        int days = (request != null && request.getDeadlineDays() != null && request.getDeadlineDays() > 0)
                ? request.getDeadlineDays()
                : 7;

        LocalDateTime now = LocalDateTime.now();
        FinalTestGrant grant = finalTestGrantRepository.findByUserIdAndSectionId(targetUsers.getId(), section.getId())
                .orElseGet(() -> FinalTestGrant.builder()
                        .userId(targetUsers.getId())
                        .sectionId(section.getId())
                        .build());
        grant.setUnlockedBy(actor != null ? actor.getId() : null);
        grant.setDeadlineDays(days);
        grant.setUnlockedAt(now);
        grant.setExpiresAt(now.plusDays(days));
        finalTestGrantRepository.saveAndFlush(grant);

        return getSectionFinalTest(sectionId, targetUsername);
    }

    @Override
    @Transactional
    public FinalTestStatusResponse lockSectionFinalTest(UUID sectionId, String targetUsername, String actorUsername) {
        Section section = sectionRepository.findByIdWithCourse(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));
        String effectiveUsername = (targetUsername != null && !targetUsername.isBlank()) ? targetUsername : actorUsername;
        Users targetUsers = findUserOrNull(effectiveUsername);
        if (targetUsers != null) {
            finalTestGrantRepository.deleteByUserIdAndSectionId(targetUsers.getId(), section.getId());
        }
        return getSectionFinalTest(sectionId, effectiveUsername);
    }

    @Override
    @Transactional
    public FinalTestSessionDto startSectionFinalTest(UUID sectionId, String username) {
        Section section = sectionRepository.findByIdWithCourse(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));
        courseAccessService.checkSectionAccess(section, username);

        Exercise finalTest = findFinalTestOfSection(section);
        if (finalTest == null) {
            throw new ResourceNotFoundException("FinalTest", sectionId);
        }
        Users users = findUserOrNull(username);
        if (users == null) {
            throw new ForbiddenException("Authentication required");
        }

        LocalDateTime now = LocalDateTime.now();
        FinalTestGrant grant = finalTestGrantRepository.findByUserIdAndSectionId(users.getId(), section.getId())
                .orElseThrow(() -> new ForbiddenException("Bài Final test chưa được Admin mở khóa."));
        if (!grant.getExpiresAt().isAfter(now)) {
            throw new ForbiddenException("Thời hạn mở bài Final test đã hết hạn.");
        }

        FinalTestSessionDto existing = resolveActiveSession(users.getId(), finalTest, now);
        if (existing != null) {
            return existing;
        }

        int durationSec = finalTest.getTimeLimit() != null && finalTest.getTimeLimit() > 0 ? finalTest.getTimeLimit() : 1200;
        FinalTestSession created = finalTestSessionRepository.saveAndFlush(FinalTestSession.builder()
                .userId(users.getId())
                .exerciseId(finalTest.getId())
                .sectionId(section.getId())
                .startedAt(now)
                .expiresAt(now.plusSeconds(durationSec))
                .build());

        return FinalTestSessionDto.builder()
                .sessionId(created.getId())
                .exerciseId(finalTest.getId())
                .startedAt(created.getStartedAt())
                .expiresAt(created.getExpiresAt())
                .remainingSeconds(durationSec)
                .build();
    }

    private Exercise findFinalTestOfSection(Section section) {
        List<Exercise> direct = exerciseRepository.findBySectionIdAndType(section.getId(), ExerciseType.FINAL_TEST);
        if (!direct.isEmpty()) {
            return direct.get(0);
        }
        List<Exercise> inCourse = exerciseRepository.findByCourseIdAndType(section.getCourse().getId(), ExerciseType.FINAL_TEST);
        return inCourse.isEmpty() ? null : inCourse.get(0);
    }

    private FinalTestSessionDto resolveActiveSession(UUID userId, Exercise finalTest, LocalDateTime now) {
        Optional<FinalTestSession> sessionOpt = finalTestSessionRepository
                .findFirstByUserIdAndExerciseIdAndSubmittedAtIsNullOrderByStartedAtDesc(userId, finalTest.getId());
        if (sessionOpt.isEmpty()) {
            return null;
        }
        FinalTestSession session = sessionOpt.get();
        if (!session.getExpiresAt().isAfter(now)) {
            return null;
        }
        // Check if learner already submitted the exercise after session.startedAt. Submitting now closes the
        // session (FinalTestGuard), this check stays for sessions opened before that. A FAILED attempt does not
        // count: its session is reopened so the learner can try again within the same time.
        List<UserSubmission> subs = userSubmissionRepository
                .findByUserIdAndExerciseIdOrderByAttemptNumberDesc(userId, finalTest.getId());
        if (!subs.isEmpty() && subs.get(0).getSubmittedAt() != null
                && subs.get(0).getStatus() != SubmissionStatus.FAILED
                && !subs.get(0).getSubmittedAt().isBefore(session.getStartedAt())) {
            return null;
        }
        long remaining = Math.max(0L, Duration.between(now, session.getExpiresAt()).getSeconds());
        return FinalTestSessionDto.builder()
                .sessionId(session.getId())
                .exerciseId(finalTest.getId())
                .startedAt(session.getStartedAt())
                .expiresAt(session.getExpiresAt())
                .remainingSeconds(remaining)
                .build();
    }

    private Users findUserOrNull(String username) {
        return username == null ? null
                : userRepository.findByUsername(DbUserDetailsService.normalize(username)).orElse(null);
    }

    /** Adds question counts and the user's attempts with two grouped queries for the whole list. */
    private List<ExerciseSummaryResponse> summarize(List<Exercise> exercises, String username) {
        UUID userId = Optional.ofNullable(findUserOrNull(username)).map(Users::getId).orElse(null);
        Map<UUID, ExerciseStats> stats = progressReader.exerciseStats(
                exercises.stream().map(Exercise::getId).toList(), userId);
        return exercises.stream()
                .map(e -> lessonMapper.toExerciseSummary(e, stats.getOrDefault(e.getId(), ExerciseStats.EMPTY)))
                .toList();
    }
}
