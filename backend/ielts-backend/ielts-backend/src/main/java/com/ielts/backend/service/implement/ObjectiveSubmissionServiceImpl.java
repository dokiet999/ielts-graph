package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.ObjectiveSubmissionRequest;
import com.ielts.backend.dto.response.IncorrectQuestionResponse;
import com.ielts.backend.dto.response.QuestionResultResponse;
import com.ielts.backend.dto.response.QuestionTypeStatResponse;
import com.ielts.backend.dto.response.ObjectiveSubmissionResultResponse;
import com.ielts.backend.dto.response.SubmissionResultResponse;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Question;
import com.ielts.backend.entity.QuestionAnswer;
import com.ielts.backend.entity.QuestionOption;
import com.ielts.backend.entity.User;
import com.ielts.backend.entity.UserSubmission;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.QuestionType;
import com.ielts.backend.enums.Role;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.exception.BadRequestException;
import com.ielts.backend.exception.ConflictException;
import com.ielts.backend.exception.ForbiddenException;
import com.ielts.backend.exception.ResourceNotFoundException;
import com.ielts.backend.exception.UnauthorizedException;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.QuestionAnswerRepository;
import com.ielts.backend.repository.QuestionOptionRepository;
import com.ielts.backend.repository.QuestionRepository;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.CourseAccessService;
import com.ielts.backend.service.ObjectiveSubmissionService;
import com.ielts.backend.service.grading.ObjectiveAnswerEvaluator;
import com.ielts.backend.service.grading.ObjectiveAnswerEvaluator.Evaluation;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Answer-key scoring for Reading and Listening exercises (issues #5, #6, FR-8.01).
 * One flow for both skills: access check, input validation, grading with
 * {@link ObjectiveAnswerEvaluator}, storage, statistics by question type.
 * <p>
 * Score: sum of question points; percentage = score / maxScore. Every sample question has
 * points = 1, which makes this equal to correct / total as written in issue #5.
 */
@Service
@RequiredArgsConstructor
public class ObjectiveSubmissionServiceImpl implements ObjectiveSubmissionService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    /** Writing and Speaking are graded by AI (FR-8.02, FR-8.03) in their own flow. */
    private static final Set<SkillType> OBJECTIVE_SKILLS = Set.of(SkillType.READING, SkillType.LISTENING);
    private static final String ATTEMPT_CONSTRAINT = "uq_submission_attempt";

    private final ExerciseRepository exerciseRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final UserSubmissionRepository userSubmissionRepository;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final UserRepository userRepository;
    private final CourseAccessService courseAccessService;
    private final ObjectiveAnswerEvaluator evaluator;

    @Override
    @Transactional
    public ObjectiveSubmissionResultResponse submit(UUID exerciseId, String username, ObjectiveSubmissionRequest request) {
        // Mock tests are only submitted through a timed mock test session (FR-4.02)
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .filter(e -> e.getExerciseType() != ExerciseType.MOCK_TEST)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise", exerciseId));
        if (!OBJECTIVE_SKILLS.contains(exercise.getSkillType())) {
            throw new BadRequestException("INVALID_EXERCISE", "This exercise is not graded automatically");
        }

        User user = userRepository.findByUsername(DbUserDetailsService.normalize(username))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));
        // Permission matrix 2.4: only learners practise (UC09, UC12)
        if (user.getRole() != Role.STUDENT) {
            throw new ForbiddenException("Only students can submit exercises");
        }
        courseAccessService.checkExerciseAccess(exercise, username);

        List<Question> questions = questionRepository.findByExerciseIdOrderByOrderingAsc(exerciseId);
        if (questions.isEmpty()) {
            throw new BadRequestException("INVALID_EXERCISE", "This exercise has no questions yet");
        }
        if (questions.stream().anyMatch(q -> !evaluator.isGradable(q.getQuestionType()))) {
            throw new BadRequestException("INVALID_EXERCISE", "This exercise contains questions that are not graded automatically");
        }

        List<UserSubmission> previous = userSubmissionRepository
                .findByUserIdAndExerciseIdOrderByAttemptNumberDesc(user.getId(), exerciseId);
        if (exercise.getMaxAttempts() != null && exercise.getMaxAttempts() > 0
                && previous.size() >= exercise.getMaxAttempts()) {
            throw new ConflictException("MAX_ATTEMPTS_REACHED",
                    "Maximum attempts (" + exercise.getMaxAttempts() + ") reached for this exercise");
        }

        Map<UUID, List<QuestionOption>> optionsByQuestion = questionOptionRepository
                .findByQuestionIdInOrderByOrderingAsc(questions.stream().map(Question::getId).toList()).stream()
                .collect(Collectors.groupingBy(o -> o.getQuestion().getId()));
        Map<String, Object> answers = request.getAnswers();
        validateAnswers(questions, optionsByQuestion, answers);

        return gradeAndSave(user, exercise, questions, optionsByQuestion, answers,
                previous.isEmpty() ? 1 : previous.get(0).getAttemptNumber() + 1);
    }

    /** Rejects unknown question ids and malformed answers in one 400 listing every problem. */
    private void validateAnswers(List<Question> questions, Map<UUID, List<QuestionOption>> optionsByQuestion,
                                 Map<String, Object> answers) {
        Set<String> questionIds = questions.stream().map(q -> q.getId().toString()).collect(Collectors.toSet());
        Map<String, String> problems = new LinkedHashMap<>();
        answers.keySet().stream()
                .filter(key -> !questionIds.contains(key))
                .forEach(key -> problems.put(key, "not a question of this exercise"));
        for (Question question : questions) {
            evaluator.validate(question, optionsByQuestion.getOrDefault(question.getId(), List.of()),
                            answers.get(question.getId().toString()))
                    .ifPresent(problem -> problems.put(question.getId().toString(), problem));
        }
        if (!problems.isEmpty()) {
            throw new BadRequestException("INVALID_ANSWER", "Some answers are not valid", problems);
        }
    }

    private ObjectiveSubmissionResultResponse gradeAndSave(User user, Exercise exercise, List<Question> questions,
                                                         Map<UUID, List<QuestionOption>> optionsByQuestion,
                                                         Map<String, Object> answers, int attemptNumber) {
        BigDecimal score = BigDecimal.ZERO;
        BigDecimal maxScore = BigDecimal.ZERO;
        int correctCount = 0;
        List<QuestionResultResponse> details = new ArrayList<>();
        List<IncorrectQuestionResponse> incorrect = new ArrayList<>();
        List<QuestionAnswer> questionAnswers = new ArrayList<>();
        // LinkedHashMap keeps question types in the order they appear in the exercise
        Map<QuestionType, int[]> statsByType = new LinkedHashMap<>();

        for (Question question : questions) {
            BigDecimal points = question.getPoints() != null ? question.getPoints() : BigDecimal.ONE;
            Evaluation eval = evaluator.evaluate(question,
                    optionsByQuestion.getOrDefault(question.getId(), List.of()),
                    answers.get(question.getId().toString()));
            BigDecimal earned = eval.correct() ? points : BigDecimal.ZERO;

            maxScore = maxScore.add(points);
            score = score.add(earned);
            int[] stat = statsByType.computeIfAbsent(question.getQuestionType(), t -> new int[2]);
            stat[1]++;
            if (eval.correct()) {
                correctCount++;
                stat[0]++;
            } else {
                incorrect.add(IncorrectQuestionResponse.builder()
                        .questionId(question.getId())
                        .number(question.getOrdering())
                        .questionType(question.getQuestionType())
                        .questionText(question.getQuestionText())
                        .userAnswer(eval.userAnswer())
                        .correctAnswer(eval.correctAnswer())
                        .explanation(question.getExplanation())
                        .build());
            }

            details.add(QuestionResultResponse.builder()
                    .questionId(question.getId())
                    .questionText(question.getQuestionText())
                    .questionType(question.getQuestionType())
                    .userAnswer(eval.userAnswer())
                    .correctAnswer(eval.correctAnswer())
                    .isCorrect(eval.correct())
                    .pointsEarned(earned)
                    .maxPoints(points)
                    .explanation(question.getExplanation())
                    .build());
            questionAnswers.add(QuestionAnswer.builder()
                    .question(question)
                    .answerText(eval.answerText())
                    .selectedOptions(eval.selectedOptionIds() != null ? eval.selectedOptionIds().toArray(new UUID[0]) : null)
                    .isCorrect(eval.correct())
                    .pointsEarned(earned)
                    .build());
        }

        UserSubmission submission = saveSubmission(UserSubmission.builder()
                .user(user)
                .exercise(exercise)
                .attemptNumber(attemptNumber)
                .answers(answers)
                .score(score)
                .maxScore(maxScore)
                .status(SubmissionStatus.GRADED)
                .submittedAt(LocalDateTime.now())
                .build());
        questionAnswers.forEach(qa -> qa.setSubmission(submission));
        questionAnswerRepository.saveAll(questionAnswers);

        SubmissionResultResponse result = SubmissionResultResponse.builder()
                .submissionId(submission.getId())
                .exerciseId(exercise.getId())
                .exerciseTitle(exercise.getTitle())
                .attemptNumber(attemptNumber)
                .score(score)
                .maxScore(maxScore)
                .percentage(percent(score, maxScore))
                // Practice is not converted to a band (SRS 2.2.2.1); mock tests have their own module
                .bandScore(null)
                .correctCount(correctCount)
                .totalQuestions(questions.size())
                .passed(exercise.getPassingScore() == null || score.compareTo(exercise.getPassingScore()) >= 0)
                .status(SubmissionStatus.GRADED)
                .submittedAt(submission.getSubmittedAt())
                .details(details)
                .build();

        return ObjectiveSubmissionResultResponse.builder()
                .result(result)
                .byQuestionType(statsByType.entrySet().stream()
                        .map(e -> QuestionTypeStatResponse.builder()
                                .questionType(e.getKey())
                                .correct(e.getValue()[0])
                                .total(e.getValue()[1])
                                .percentage(percent(BigDecimal.valueOf(e.getValue()[0]), BigDecimal.valueOf(e.getValue()[1])))
                                .build())
                        .toList())
                .incorrectQuestions(incorrect)
                .build();
    }

    /**
     * Two submissions sent at the same time compute the same attempt number; the second one
     * breaks uq_submission_attempt. Flushing here turns that into a 409 instead of a 500.
     */
    private UserSubmission saveSubmission(UserSubmission submission) {
        try {
            return userSubmissionRepository.saveAndFlush(submission);
        } catch (DataIntegrityViolationException ex) {
            // Only the attempt-number race is expected here; anything else is a real error
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

    private static BigDecimal percent(BigDecimal part, BigDecimal whole) {
        return whole.signum() == 0 ? BigDecimal.ZERO : part.multiply(HUNDRED).divide(whole, 2, RoundingMode.HALF_UP);
    }
}
