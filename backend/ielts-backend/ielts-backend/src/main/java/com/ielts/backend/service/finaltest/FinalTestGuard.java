package com.ielts.backend.service.finaltest;

import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.FinalTestGrant;
import com.ielts.backend.entity.FinalTestSession;
import com.ielts.backend.entity.Users;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.Role;
import com.ielts.backend.exception.customException.ConflictException;
import com.ielts.backend.exception.customException.ForbiddenException;
import com.ielts.backend.repository.FinalTestGrantRepository;
import com.ielts.backend.repository.FinalTestSessionRepository;
import com.ielts.backend.service.CourseAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Server-side rules of the final test (FR-4.02), shared by the exercise detail and the three submission flows.
 * The start endpoint (LessonServiceImpl.startSectionFinalTest) already needs a valid grant; without these checks
 * a learner could skip it and open or submit the final test directly by its exercise id.
 * <ul>
 *   <li>Opening: an enrolled learner with a valid grant (the owning teacher and admins are not restricted).</li>
 *   <li>Submitting: a valid grant and an open session, submitted before the session expires (plus a grace
 *       period for slow uploads and auto-submit); the session is then closed, so it is used only once.</li>
 * </ul>
 * Mock tests have no session: they are submitted like practice exercises and limited by max_attempts.
 */
@Component
@RequiredArgsConstructor
public class FinalTestGuard {

    public static final String NOT_UNLOCKED = "FINAL_TEST_LOCKED";
    public static final String NOT_STARTED = "FINAL_TEST_NOT_STARTED";
    public static final String TIME_UP = "FINAL_TEST_TIME_UP";

    private final FinalTestGrantRepository grantRepository;
    private final FinalTestSessionRepository sessionRepository;
    private final CourseAccessService courseAccessService;

    @Value("${app.final-test.submit-grace-seconds:60}")
    private long submitGraceSeconds = 60;

    public static boolean isFinalTest(Exercise exercise) {
        return exercise.getExerciseType() == ExerciseType.FINAL_TEST;
    }

    /** Throws unless the user may open the final test. Does nothing for other exercise types. */
    public void checkCanOpen(Exercise exercise, Users user) {
        if (!isFinalTest(exercise) || user == null || user.getRole() != Role.STUDENT) {
            return;
        }
        if (exercise.getLesson() == null) {
            throw new ForbiddenException(NOT_UNLOCKED, "This final test has not been unlocked for you");
        }
        // A final test may sit in a preview lesson: it still needs enrolment, not just the preview rule
        courseAccessService.checkSectionAccess(exercise.getLesson().getSection(), user.getUsername());
        UUID courseId = exercise.getLesson().getSection().getCourse().getId();
        if (grantRepository.countValidInCourse(user.getId(), courseId, LocalDateTime.now()) == 0) {
            throw new ForbiddenException(NOT_UNLOCKED, "This final test has not been unlocked for you");
        }
    }

    /**
     * For a final test, returns the open session the submission belongs to (locked until the end of the
     * caller's transaction), or throws. Returns null for other exercise types. Must be called in a transaction.
     */
    public FinalTestSession requireOpenSession(Exercise exercise, Users user) {
        if (!isFinalTest(exercise)) {
            return null;
        }
        List<FinalTestSession> open = sessionRepository.findOpenForUpdate(user.getId(), exercise.getId());
        if (open.isEmpty()) {
            throw new ForbiddenException(NOT_STARTED, "Start the final test before submitting it");
        }
        FinalTestSession session = open.get(0);
        LocalDateTime now = LocalDateTime.now();

        FinalTestGrant grant = grantRepository.findByUserIdAndSectionId(user.getId(), session.getSectionId())
                .orElseThrow(() -> new ForbiddenException(NOT_UNLOCKED, "This final test has not been unlocked for you"));
        if (!grant.getExpiresAt().isAfter(now)) {
            throw new ForbiddenException(NOT_UNLOCKED, "The time window to take this final test has ended");
        }
        if (now.isAfter(session.getExpiresAt().plusSeconds(submitGraceSeconds))) {
            throw new ConflictException(TIME_UP, "The time for this final test is over");
        }
        return session;
    }

    /** Marks the session as used by the given submission. No-op when session is null. */
    public void closeSession(FinalTestSession session, UUID submissionId) {
        if (session == null) {
            return;
        }
        session.setSubmittedAt(LocalDateTime.now());
        session.setSubmissionId(submissionId);
        sessionRepository.save(session);
    }

    /**
     * Writing and Speaking close the session when the GRADING row is created, before the AI grades it. When the
     * grading then fails (the attempt is given back), the session is opened again so the "try again" of the
     * runner works within the same session and its remaining time. No-op for other submissions.
     */
    public void reopenAfterFailure(UUID submissionId) {
        sessionRepository.findBySubmissionId(submissionId).ifPresent(session -> {
            session.setSubmittedAt(null);
            session.setSubmissionId(null);
            sessionRepository.save(session);
        });
    }
}
