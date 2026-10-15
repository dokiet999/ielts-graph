package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.WritingSubmissionRequest;
import com.ielts.backend.dto.response.CriterionFeedbackResponse;
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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service implementation for submitting IELTS Writing essays and grading with AI (FR-8.02).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WritingSubmissionServiceImpl implements WritingSubmissionService {

    private static final String ATTEMPT_CONSTRAINT = "uq_submission_attempt";

    private final ExerciseRepository exerciseRepository;
    private final QuestionRepository questionRepository;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final UserSubmissionRepository userSubmissionRepository;
    private final UserRepository userRepository;
    private final CourseAccessService courseAccessService;
    private final WritingEssayGrader essayGrader;
    private final LlmClient llmClient;

    @Override
    @Transactional(noRollbackFor = {WritingGradingException.class, LlmTimeoutException.class, LlmUnavailableException.class})
    public WritingSubmissionResultResponse submit(UUID exerciseId, String username, WritingSubmissionRequest request) {
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
        if (exercise.getMaxAttempts() != null && exercise.getMaxAttempts() > 0
                && previous.size() >= exercise.getMaxAttempts()) {
            throw new ConflictException("MAX_ATTEMPTS_REACHED",
                    "Maximum attempts (" + exercise.getMaxAttempts() + ") reached for this exercise");
        }

        int attemptNumber = previous.isEmpty() ? 1 : previous.get(0).getAttemptNumber() + 1;

        List<Question> questions = questionRepository.findByExerciseIdOrderByOrderingAsc(exerciseId);
        String questionPrompt;
        Question question = null;
        if (!questions.isEmpty()) {
            question = questions.get(0);
            questionPrompt = question.getQuestionText();
        } else {
            questionPrompt = exercise.getInstruction() != null && !exercise.getInstruction().isBlank()
                    ? exercise.getInstruction()
                    : exercise.getTitle();
        }

        long startTime = System.currentTimeMillis();
        WritingGradingResult gradingResult = null;
        Exception gradingException = null;

        try {
            gradingResult = essayGrader.grade(questionPrompt, request.getEssayText());
        } catch (Exception ex) {
            gradingException = ex;
        }

        int latencyMs = (int) (System.currentTimeMillis() - startTime);

        if (gradingException != null) {
            log.error("Writing grading failed for user {} exercise {}: {}", username, exerciseId, gradingException.getMessage());
            UserSubmission failedSubmission = UserSubmission.builder()
                    .user(user)
                    .exercise(exercise)
                    .attemptNumber(attemptNumber)
                    .answers(Map.of("essayText", request.getEssayText()))
                    .score(BigDecimal.ZERO)
                    .maxScore(BigDecimal.valueOf(9.0))
                    .aiFeedback(gradingException.getMessage())
                    .aiModel(llmClient.getModelName())
                    .aiPromptVersion(WritingEssayGrader.PROMPT_VERSION)
                    .aiLatencyMs(latencyMs)
                    .status(SubmissionStatus.FAILED)
                    .gradingMethod(GradingMethod.AI)
                    .timeSpent(request.getTimeSpent())
                    .submittedAt(LocalDateTime.now())
                    .build();

            saveSubmission(failedSubmission);

            if (gradingException instanceof RuntimeException re) {
                throw re;
            }
            throw new WritingGradingException("GRADING_FAILED", gradingException.getMessage(), gradingException);
        }

        UserSubmission submission = UserSubmission.builder()
                .user(user)
                .exercise(exercise)
                .attemptNumber(attemptNumber)
                .answers(Map.of("essayText", request.getEssayText()))
                .score(gradingResult.getOverallBand())
                .maxScore(BigDecimal.valueOf(9.0))
                .aiScore(gradingResult.getOverallBand())
                .aiFeedback(gradingResult.getSummary())
                .aiStructuredFeedback(gradingResult.getRawJson())
                .aiModel(llmClient.getModelName())
                .aiPromptVersion(WritingEssayGrader.PROMPT_VERSION)
                .aiLatencyMs(latencyMs)
                .status(SubmissionStatus.GRADED)
                .gradingMethod(GradingMethod.AI)
                .timeSpent(request.getTimeSpent())
                .submittedAt(LocalDateTime.now())
                .build();

        submission = saveSubmission(submission);

        if (question != null) {
            QuestionAnswer qa = QuestionAnswer.builder()
                    .submission(submission)
                    .question(question)
                    .answerText(request.getEssayText())
                    .aiPoints(gradingResult.getOverallBand())
                    .aiFeedback(gradingResult.getSummary())
                    .pointsEarned(gradingResult.getOverallBand())
                    .build();
            questionAnswerRepository.save(qa);
        }

        List<CriterionFeedbackResponse> criteriaResponses = gradingResult.getCriteria().stream()
                .map(c -> CriterionFeedbackResponse.builder()
                        .criterionId(c.getCriterionId())
                        .name(CriterionFeedbackResponse.resolveName(c.getCriterionId()))
                        .band(c.getBand())
                        .feedback(c.getFeedback())
                        .evidence(c.getEvidence().stream()
                                .map(e -> CriterionFeedbackResponse.EvidenceResponse.builder()
                                        .quote(e.getQuote())
                                        .comment(e.getComment())
                                        .errorType(e.getErrorType())
                                        .build())
                                .toList())
                        .build())
                .toList();

        return WritingSubmissionResultResponse.builder()
                .submissionId(submission.getId())
                .exerciseId(exercise.getId())
                .exerciseTitle(exercise.getTitle())
                .attemptNumber(attemptNumber)
                .overallBand(gradingResult.getOverallBand())
                .outOfCalibrationRange(gradingResult.isOutOfCalibrationRange())
                .status(SubmissionStatus.GRADED)
                .gradingMethod(GradingMethod.AI)
                .timeSpent(request.getTimeSpent())
                .submittedAt(submission.getSubmittedAt())
                .taskType(gradingResult.getTaskType())
                .criteria(criteriaResponses)
                .summary(gradingResult.getSummary())
                .improvements(gradingResult.getImprovements())
                .aiModel(submission.getAiModel())
                .aiPromptVersion(submission.getAiPromptVersion())
                .aiLatencyMs(submission.getAiLatencyMs())
                .rawFeedback(gradingResult.getRawJson())
                .build();
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
