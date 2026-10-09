package com.ielts.backend.service.implement;

import com.ielts.backend.dto.response.*;
import com.ielts.backend.entity.*;
import com.ielts.backend.enums.Role;
import com.ielts.backend.exception.ForbiddenException;
import com.ielts.backend.exception.ResourceNotFoundException;
import com.ielts.backend.exception.UnauthorizedException;
import com.ielts.backend.mapper.SubmissionMapper;
import com.ielts.backend.repository.*;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SubmissionServiceImpl implements SubmissionService {

    private final UserRepository userRepository;
    private final ExerciseRepository exerciseRepository;
    private final UserSubmissionRepository userSubmissionRepository;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final SubmissionMapper submissionMapper;

    @Override
    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissionHistory(UUID exerciseId, String username) {
        User user = findUser(username);
        if (!exerciseRepository.existsById(exerciseId)) {
            throw new ResourceNotFoundException("Exercise", exerciseId);
        }

        List<UserSubmission> submissions = userSubmissionRepository
                .findByUserIdAndExerciseIdOrderByAttemptNumberDesc(user.getId(), exerciseId);

        return submissions.stream()
                .map(sub -> {
                    List<QuestionAnswer> answers = questionAnswerRepository.findBySubmissionIdOrderByCreatedAtAsc(sub.getId());
                    return submissionMapper.toResponse(sub, answers);
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionDetail(UUID submissionId, String username) {
        User user = findUser(username);
        UserSubmission submission = userSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission", submissionId));

        ensureSubmissionAccess(submission, user);

        List<QuestionAnswer> answers = questionAnswerRepository.findBySubmissionIdOrderByCreatedAtAsc(submissionId);
        return submissionMapper.toResponse(submission, answers);
    }

    @Override
    @Transactional(readOnly = true)
    public SubmissionReviewResponse getSubmissionReview(UUID submissionId, String username) {
        User user = findUser(username);
        UserSubmission submission = userSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission", submissionId));

        ensureSubmissionAccess(submission, user);

        Exercise exercise = submission.getExercise();
        List<QuestionAnswer> qaList = questionAnswerRepository.findBySubmissionIdOrderByCreatedAtAsc(submissionId);
        List<Question> questions = questionRepository.findByExerciseIdOrderByOrderingAsc(exercise.getId());

        List<UUID> questionIds = questions.stream().map(Question::getId).toList();
        List<QuestionOption> options = questionOptionRepository.findByQuestionIdInOrderByOrderingAsc(questionIds);

        Map<UUID, List<QuestionOption>> optionsByQuestion = new HashMap<>();
        for (QuestionOption opt : options) {
            optionsByQuestion.computeIfAbsent(opt.getQuestion().getId(), k -> new ArrayList<>()).add(opt);
        }

        Map<UUID, QuestionAnswer> qaByQuestion = new HashMap<>();
        for (QuestionAnswer qa : qaList) {
            qaByQuestion.put(qa.getQuestion().getId(), qa);
        }

        List<QuestionResultResponse> questionResults = new ArrayList<>();
        int correctCount = 0;

        for (Question q : questions) {
            QuestionAnswer qa = qaByQuestion.get(q.getId());
            List<QuestionOption> qOptions = optionsByQuestion.getOrDefault(q.getId(), Collections.emptyList());

            List<String> correctOptionsDisplay = qOptions.stream()
                    .filter(opt -> Boolean.TRUE.equals(opt.getIsCorrect()))
                    .map(QuestionOption::getOptionText)
                    .toList();

            boolean isCorrect = qa != null && Boolean.TRUE.equals(qa.getIsCorrect());
            if (isCorrect) {
                correctCount++;
            }

            Object userAnswer = null;
            if (qa != null) {
                if (qa.getAnswerText() != null && !qa.getAnswerText().isBlank()) {
                    userAnswer = qa.getAnswerText();
                } else if (qa.getSelectedOptions() != null && qa.getSelectedOptions().length > 0) {
                    userAnswer = Arrays.asList(qa.getSelectedOptions());
                }
            }

            questionResults.add(QuestionResultResponse.builder()
                    .questionId(q.getId())
                    .questionText(q.getQuestionText())
                    .questionType(q.getQuestionType())
                    .userAnswer(userAnswer)
                    .correctAnswer(String.join(" / ", correctOptionsDisplay))
                    .isCorrect(isCorrect)
                    .pointsEarned(qa != null ? qa.getPointsEarned() : BigDecimal.ZERO)
                    .maxPoints(q.getPoints() != null ? q.getPoints() : BigDecimal.ONE)
                    .explanation(q.getExplanation())
                    .build());
        }

        int totalQuestions = questions.size();

        BigDecimal percentage = BigDecimal.ZERO;
        if (submission.getMaxScore() != null && submission.getMaxScore().compareTo(BigDecimal.ZERO) > 0) {
            percentage = submission.getScore().multiply(BigDecimal.valueOf(100))
                    .divide(submission.getMaxScore(), 2, RoundingMode.HALF_UP);
        }

        boolean passed = exercise.getPassingScore() == null
                || submission.getScore().compareTo(exercise.getPassingScore()) >= 0;

        SubmissionResultResponse result = SubmissionResultResponse.builder()
                .submissionId(submission.getId())
                .exerciseId(exercise.getId())
                .exerciseTitle(exercise.getTitle())
                .attemptNumber(submission.getAttemptNumber())
                .score(submission.getScore())
                .maxScore(submission.getMaxScore())
                .percentage(percentage)
                // Practice is not converted to a band (SRS 2.2.2.1); mock tests have their own module
                .bandScore(null)
                .correctCount(correctCount)
                .totalQuestions(totalQuestions)
                .passed(passed)
                .gradingMethod(submission.getGradingMethod())
                .status(submission.getStatus())
                .submittedAt(submission.getSubmittedAt())
                .details(questionResults)
                .build();

        return SubmissionReviewResponse.builder()
                .submission(result)
                .audioUrl(exercise.getAudioUrl())
                .content(exercise.getContent())
                .build();
    }

    private User findUser(String username) {
        return userRepository.findByUsername(DbUserDetailsService.normalize(username))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));
    }

    /**
     * The learner who submitted, an admin, or the teacher who owns the course of the exercise
     * (permission matrix note 3). Standalone practice exercises have no owning teacher.
     */
    private void ensureSubmissionAccess(UserSubmission submission, User user) {
        boolean isOwner = submission.getUser().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin && !isCourseTeacher(submission.getExercise(), user)) {
            throw new ForbiddenException("Access denied to this submission");
        }
    }

    private boolean isCourseTeacher(Exercise exercise, User user) {
        if (user.getRole() != Role.TEACHER || exercise.getLesson() == null) {
            return false;
        }
        return exercise.getLesson().getSection().getCourse().getTeacher().getId().equals(user.getId());
    }
}
