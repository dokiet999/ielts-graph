package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.WritingSubmissionRequest;
import com.ielts.backend.dto.response.WritingSubmissionResultResponse;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Question;
import com.ielts.backend.entity.QuestionAnswer;
import com.ielts.backend.entity.User;
import com.ielts.backend.entity.UserSubmission;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.GradingMethod;
import com.ielts.backend.enums.Role;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.exception.BadRequestException;
import com.ielts.backend.exception.ConflictException;
import com.ielts.backend.exception.ForbiddenException;
import com.ielts.backend.exception.LlmTimeoutException;
import com.ielts.backend.exception.LlmUnavailableException;
import com.ielts.backend.exception.ResourceNotFoundException;
import com.ielts.backend.exception.UnauthorizedException;
import com.ielts.backend.exception.WritingGradingException;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.QuestionAnswerRepository;
import com.ielts.backend.repository.QuestionRepository;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.CourseAccessService;
import com.ielts.backend.service.WritingSubmissionService;
import com.ielts.backend.service.grading.WritingEssayGrader;
import com.ielts.backend.service.grading.WritingGradingResult;
import com.ielts.backend.service.llm.LlmClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Submitting IELTS Writing essays and grading them with AI (FR-8.02).
 * <p>
 * The LLM call takes several seconds, so the work is split into three steps and the call itself runs
 * outside any transaction (no database connection is held while waiting):
 * <ol>
 *   <li>short transaction: validate and insert the submission with status GRADING;</li>
 *   <li>no transaction: grade with the LLM;</li>
 *   <li>short transaction: store the result (GRADED) or the failure (FAILED), and only then throw.</li>
 * </ol>
 * A FAILED submission does not count towards the maximum number of attempts.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WritingSubmissionServiceImpl implements WritingSubmissionService {

    private static final String ATTEMPT_CONSTRAINT = "uq_submission_attempt";
    /** Shorter essays are rejected before any LLM call (Task 2 asks for 250 words; below 250 gets a warning). */
    private static final int MIN_WORDS = 50;
    private static final BigDecimal MAX_BAND = BigDecimal.valueOf(9.0);

    private final ExerciseRepository exerciseRepository;
    private final QuestionRepository questionRepository;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final UserSubmissionRepository userSubmissionRepository;
    private final UserRepository userRepository;
    private final CourseAccessService courseAccessService;
    private final WritingEssayGrader essayGrader;
    private final LlmClient llmClient;
    private final TransactionTemplate transactionTemplate;

    /** What step 1 hands over to steps 2 and 3. Ids only, so nothing detached is reused across transactions. */
    private record PendingGrading(UUID submissionId, UUID exerciseId, String exerciseTitle, int attemptNumber,
                                  String task, String questionPrompt, UUID questionId) {
    }

    @Override
    public WritingSubmissionResultResponse submit(UUID exerciseId, String username, WritingSubmissionRequest request) {
        String essay = request.getEssayText();
        int wordCount = WritingEssayGrader.countWords(essay);
        if (wordCount < MIN_WORDS) {
            throw new BadRequestException("ESSAY_TOO_SHORT", "Essay must have at least " + MIN_WORDS + " words");
        }

        // Step 1: validate and record the submission as GRADING
        PendingGrading pending = transactionTemplate.execute(status -> startGrading(exerciseId, username, request));

        // Step 2: grade, outside any transaction
        long startNanos = System.nanoTime();
        WritingGradingResult gradingResult = null;
        Exception failure = null;
        try {
            gradingResult = essayGrader.grade(pending.task(), pending.questionPrompt(), essay, wordCount);
        } catch (Exception ex) {
            failure = ex;
        }
        int latencyMs = (int) TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);

        // Step 3: store the outcome; a failure is committed first and the exception is thrown afterwards
        if (failure != null) {
            log.error("Writing grading failed for user {} exercise {}: {}", username, exerciseId, failure.getMessage());
            Exception cause = failure;
            transactionTemplate.executeWithoutResult(status -> markFailed(pending.submissionId(), cause, latencyMs));
            if (failure instanceof RuntimeException re) {
                throw re;
            }
            throw new WritingGradingException("GRADING_FAILED", failure.getMessage(), failure);
        }
        WritingGradingResult graded = gradingResult;
        return transactionTemplate.execute(status -> markGraded(pending, graded, latencyMs));
    }

    private PendingGrading startGrading(UUID exerciseId, String username, WritingSubmissionRequest request) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .filter(e -> e.getExerciseType() != ExerciseType.MOCK_TEST)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise", exerciseId));

        if (exercise.getSkillType() != SkillType.WRITING) {
            throw new BadRequestException("INVALID_EXERCISE", "This exercise is not a Writing exercise");
        }

        User user = userRepository.findByUsername(DbUserDetailsService.normalize(username))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));

        if (user.getRole() != Role.STUDENT) {
            throw new ForbiddenException("Only students can submit exercises");
        }

        courseAccessService.checkExerciseAccess(exercise, username);

        List<UserSubmission> previous = userSubmissionRepository
                .findByUserIdAndExerciseIdOrderByAttemptNumberDesc(user.getId(), exerciseId);
        long usedAttempts = previous.stream().filter(s -> s.getStatus() != SubmissionStatus.FAILED).count();
        if (exercise.getMaxAttempts() != null && exercise.getMaxAttempts() > 0
                && usedAttempts >= exercise.getMaxAttempts()) {
            throw new ConflictException("MAX_ATTEMPTS_REACHED",
                    "Maximum attempts (" + exercise.getMaxAttempts() + ") reached for this exercise");
        }
        // Numbered after the latest attempt of any status, so a FAILED attempt never reuses its number
        int attemptNumber = previous.isEmpty() ? 1 : previous.get(0).getAttemptNumber() + 1;

        List<Question> questions = questionRepository.findByExerciseIdOrderByOrderingAsc(exerciseId);
        Question question = questions.isEmpty() ? null : questions.get(0);
        String questionPrompt;
        if (question != null) {
            questionPrompt = question.getQuestionText();
        } else {
            questionPrompt = exercise.getInstruction() != null && !exercise.getInstruction().isBlank()
                    ? exercise.getInstruction()
                    : exercise.getTitle();
        }

        UserSubmission submission = saveSubmission(UserSubmission.builder()
                .user(user)
                .exercise(exercise)
                .attemptNumber(attemptNumber)
                .answers(Map.of("essayText", request.getEssayText()))
                .score(BigDecimal.ZERO)
                .maxScore(MAX_BAND)
                .aiModel(llmClient.getModelName())
                .aiPromptVersion(WritingEssayGrader.PROMPT_VERSION)
                .status(SubmissionStatus.GRADING)
                .gradingMethod(GradingMethod.AI)
                .timeSpent(request.getTimeSpent())
                .submittedAt(LocalDateTime.now())
                .build());

        return new PendingGrading(submission.getId(), exercise.getId(), exercise.getTitle(), attemptNumber,
                taskOf(exercise), questionPrompt, question != null ? question.getId() : null);
    }

    private void markFailed(UUID submissionId, Exception failure, int latencyMs) {
        UserSubmission submission = userSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission", submissionId));
        submission.setStatus(SubmissionStatus.FAILED);
        submission.setAiFeedback(failureCode(failure));
        submission.setAiLatencyMs(latencyMs);
        userSubmissionRepository.saveAndFlush(submission);
    }

    private WritingSubmissionResultResponse markGraded(PendingGrading pending, WritingGradingResult result, int latencyMs) {
        UserSubmission submission = userSubmissionRepository.findById(pending.submissionId())
                .orElseThrow(() -> new ResourceNotFoundException("Submission", pending.submissionId()));
        submission.setScore(result.getOverallBand());
        submission.setAiScore(result.getOverallBand());
        submission.setAiFeedback(result.getSummary());
        submission.setAiStructuredFeedback(result.getFeedbackMap());
        submission.setAiLatencyMs(latencyMs);
        submission.setStatus(SubmissionStatus.GRADED);
        submission.setGradedAt(LocalDateTime.now());
        userSubmissionRepository.saveAndFlush(submission);

        if (pending.questionId() != null) {
            questionRepository.findById(pending.questionId()).ifPresent(question ->
                    questionAnswerRepository.saveAndFlush(QuestionAnswer.builder()
                            .submission(submission)
                            .question(question)
                            .answerText(String.valueOf(submission.getAnswers().get("essayText")))
                            .aiPoints(result.getOverallBand())
                            .aiFeedback(result.getSummary())
                            .pointsEarned(result.getOverallBand())
                            .build()));
        }

        return WritingSubmissionResultResponse.builder()
                .submissionId(submission.getId())
                .exerciseId(pending.exerciseId())
                .exerciseTitle(pending.exerciseTitle())
                .attemptNumber(pending.attemptNumber())
                .overallBand(result.getOverallBand())
                .outOfCalibrationRange(result.isOutOfCalibrationRange())
                .status(SubmissionStatus.GRADED)
                .gradingMethod(GradingMethod.AI)
                .timeSpent(submission.getTimeSpent())
                .submittedAt(submission.getSubmittedAt())
                .taskType(result.getTaskType())
                .summary(result.getSummary())
                .improvements(result.getImprovements())
                .aiModel(submission.getAiModel())
                .aiPromptVersion(submission.getAiPromptVersion())
                .aiLatencyMs(submission.getAiLatencyMs())
                .rawFeedback(result.getFeedbackMap())
                .build();
    }

    /** Essay type of the exercise (QuestionType ID, e.g. QT_W2_DISCUSSION) stored in exercises.content.task. */
    private static String taskOf(Exercise exercise) {
        Map<String, Object> content = exercise.getContent();
        return content != null && content.get("task") instanceof String task ? task : null;
    }

    /** Short error code kept in ai_feedback of a FAILED submission; details stay in the log only. */
    private static String failureCode(Exception ex) {
        if (ex instanceof WritingGradingException wge) {
            return wge.getCode();
        }
        if (ex instanceof LlmTimeoutException) {
            return "LLM_TIMEOUT";
        }
        if (ex instanceof LlmUnavailableException) {
            return "LLM_UNAVAILABLE";
        }
        return "GRADING_FAILED";
    }

    private UserSubmission saveSubmission(UserSubmission submission) {
        try {
            return userSubmissionRepository.saveAndFlush(submission);
        } catch (DataIntegrityViolationException ex) {
            if (!isAttemptConflict(ex)) {
                throw ex;
            }
            throw new ConflictException("SUBMISSION_CONFLICT", "Another submission for this exercise is being saved, please retry");
        }
    }

    private static boolean isAttemptConflict(DataIntegrityViolationException ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t.getMessage() != null && t.getMessage().contains(ATTEMPT_CONSTRAINT)) {
                return true;
            }
        }
        return false;
    }
}
