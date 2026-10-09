package com.ielts.backend.service.implement;

import com.ielts.backend.dto.response.QuestionResultResponse;
import com.ielts.backend.dto.response.SubmissionResultResponse;
import com.ielts.backend.entity.*;
import com.ielts.backend.enums.QuestionType;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.repository.QuestionAnswerRepository;
import com.ielts.backend.repository.QuestionOptionRepository;
import com.ielts.backend.repository.QuestionRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.service.ListeningGradingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ListeningGradingServiceImpl implements ListeningGradingService {

    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final UserSubmissionRepository userSubmissionRepository;
    private final QuestionAnswerRepository questionAnswerRepository;

    @Override
    @Transactional
    public SubmissionResultResponse gradeAndSave(User user, Exercise exercise, Map<String, Object> rawAnswers) {
        List<Question> questions = questionRepository.findByExerciseIdOrderByOrderingAsc(exercise.getId());
        List<UUID> questionIds = questions.stream().map(Question::getId).toList();
        List<QuestionOption> allOptions = questionOptionRepository.findByQuestionIdInOrderByOrderingAsc(questionIds);

        Map<UUID, List<QuestionOption>> optionsByQuestion = new HashMap<>();
        for (QuestionOption opt : allOptions) {
            optionsByQuestion.computeIfAbsent(opt.getQuestion().getId(), k -> new ArrayList<>()).add(opt);
        }

        int nextAttempt = userSubmissionRepository
                .findTopByUserIdAndExerciseIdOrderByAttemptNumberDesc(user.getId(), exercise.getId())
                .map(sub -> sub.getAttemptNumber() + 1)
                .orElse(1);

        BigDecimal totalScore = BigDecimal.ZERO;
        BigDecimal maxScore = BigDecimal.ZERO;
        int correctCount = 0;

        List<QuestionResultResponse> questionResults = new ArrayList<>();
        List<QuestionAnswer> questionAnswersToSave = new ArrayList<>();

        for (Question question : questions) {
            BigDecimal questionMaxPoints = question.getPoints() != null ? question.getPoints() : BigDecimal.ONE;
            maxScore = maxScore.add(questionMaxPoints);

            List<QuestionOption> questionOptions = optionsByQuestion.getOrDefault(question.getId(), Collections.emptyList());
            Object rawUserAnswer = rawAnswers != null ? rawAnswers.get(question.getId().toString()) : null;

            EvaluationResult eval = evaluateQuestion(question, questionOptions, rawUserAnswer);

            if (eval.isCorrect) {
                correctCount++;
                totalScore = totalScore.add(questionMaxPoints);
            }

            questionResults.add(QuestionResultResponse.builder()
                    .questionId(question.getId())
                    .questionText(question.getQuestionText())
                    .questionType(question.getQuestionType())
                    .userAnswer(rawUserAnswer)
                    .correctAnswer(eval.displayCorrectAnswer)
                    .isCorrect(eval.isCorrect)
                    .pointsEarned(eval.isCorrect ? questionMaxPoints : BigDecimal.ZERO)
                    .maxPoints(questionMaxPoints)
                    .explanation(question.getExplanation())
                    .build());

            QuestionAnswer qa = QuestionAnswer.builder()
                    .question(question)
                    .answerText(eval.answerText)
                    .selectedOptions(eval.selectedOptionIds != null ? eval.selectedOptionIds.toArray(new UUID[0]) : null)
                    .isCorrect(eval.isCorrect)
                    .pointsEarned(eval.isCorrect ? questionMaxPoints : BigDecimal.ZERO)
                    .build();
            questionAnswersToSave.add(qa);
        }

        int totalQuestions = questions.size();
        double bandScore = calculateIeltsListeningBand(correctCount, totalQuestions);

        BigDecimal percentage = BigDecimal.ZERO;
        if (maxScore.compareTo(BigDecimal.ZERO) > 0) {
            percentage = totalScore.multiply(BigDecimal.valueOf(100))
                    .divide(maxScore, 2, RoundingMode.HALF_UP);
        }

        boolean passed = exercise.getPassingScore() == null
                || totalScore.compareTo(exercise.getPassingScore()) >= 0;

        UserSubmission submission = UserSubmission.builder()
                .user(user)
                .exercise(exercise)
                .attemptNumber(nextAttempt)
                .answers(rawAnswers)
                .score(totalScore)
                .maxScore(maxScore)
                .status(SubmissionStatus.GRADED)
                .submittedAt(LocalDateTime.now())
                .build();

        UserSubmission savedSubmission = userSubmissionRepository.save(submission);

        for (QuestionAnswer qa : questionAnswersToSave) {
            qa.setSubmission(savedSubmission);
        }
        questionAnswerRepository.saveAll(questionAnswersToSave);

        return SubmissionResultResponse.builder()
                .submissionId(savedSubmission.getId())
                .exerciseId(exercise.getId())
                .exerciseTitle(exercise.getTitle())
                .attemptNumber(nextAttempt)
                .score(totalScore)
                .maxScore(maxScore)
                .percentage(percentage)
                .bandScore(bandScore)
                .correctCount(correctCount)
                .totalQuestions(totalQuestions)
                .passed(passed)
                .status(SubmissionStatus.GRADED)
                .submittedAt(savedSubmission.getSubmittedAt())
                .details(questionResults)
                .build();
    }

    private EvaluationResult evaluateQuestion(Question question, List<QuestionOption> options, Object rawUserAnswer) {
        if (rawUserAnswer == null) {
            return buildEmptyResult(options);
        }

        QuestionType type = question.getQuestionType();
        if (type == QuestionType.FILL_BLANK) {
            return evaluateFillBlank(options, rawUserAnswer);
        } else if (type == QuestionType.MULTIPLE_CHOICE || type == QuestionType.DROPLIST) {
            return evaluateMultipleChoice(options, rawUserAnswer);
        } else if (type == QuestionType.TRUE_FALSE) {
            return evaluateTrueFalse(options, rawUserAnswer);
        } else if (type == QuestionType.MATCHING) {
            return evaluateMatching(options, rawUserAnswer);
        } else {
            return evaluateFillBlank(options, rawUserAnswer);
        }
    }

    private EvaluationResult evaluateFillBlank(List<QuestionOption> options, Object rawUserAnswer) {
        String userText = rawUserAnswer.toString().trim();
        String normalizedUser = normalizeText(userText);

        List<String> correctOptions = new ArrayList<>();
        boolean isCorrect = false;

        for (QuestionOption opt : options) {
            if (Boolean.TRUE.equals(opt.getIsCorrect())) {
                String correctText = opt.getOptionText() != null ? opt.getOptionText().trim() : "";
                correctOptions.add(correctText);
                if (normalizedUser.equalsIgnoreCase(normalizeText(correctText))) {
                    isCorrect = true;
                }
            }
        }

        String displayCorrect = String.join(" / ", correctOptions);
        return new EvaluationResult(isCorrect, userText, null, displayCorrect);
    }

    private EvaluationResult evaluateMultipleChoice(List<QuestionOption> options, Object rawUserAnswer) {
        List<UUID> selectedOptionIds = new ArrayList<>();
        String userText = rawUserAnswer.toString().trim();

        if (rawUserAnswer instanceof Collection<?> coll) {
            for (Object item : coll) {
                parseUuid(item.toString()).ifPresent(selectedOptionIds::add);
            }
        } else {
            parseUuid(userText).ifPresent(selectedOptionIds::add);
        }

        List<QuestionOption> correctOpts = options.stream()
                .filter(opt -> Boolean.TRUE.equals(opt.getIsCorrect()))
                .toList();

        List<String> correctDisplayList = correctOpts.stream()
                .map(QuestionOption::getOptionText)
                .toList();
        String displayCorrect = String.join("; ", correctDisplayList);

        boolean isCorrect;
        if (!selectedOptionIds.isEmpty()) {
            Set<UUID> correctIds = new HashSet<>(correctOpts.stream().map(QuestionOption::getId).toList());
            Set<UUID> userIds = new HashSet<>(selectedOptionIds);
            isCorrect = !correctIds.isEmpty() && correctIds.equals(userIds);
        } else {
            isCorrect = false;
            for (QuestionOption opt : correctOpts) {
                String optText = opt.getOptionText() != null ? opt.getOptionText().trim() : "";
                if (optText.equalsIgnoreCase(userText) || startsWithOptionLetter(optText, userText)) {
                    isCorrect = true;
                    break;
                }
            }
        }

        return new EvaluationResult(isCorrect, userText, selectedOptionIds, displayCorrect);
    }

    private EvaluationResult evaluateTrueFalse(List<QuestionOption> options, Object rawUserAnswer) {
        String userText = rawUserAnswer.toString().trim();
        String normalizedUser = normalizeTrueFalse(userText);

        List<String> correctOptions = new ArrayList<>();
        boolean isCorrect = false;

        for (QuestionOption opt : options) {
            if (Boolean.TRUE.equals(opt.getIsCorrect())) {
                String correctText = opt.getOptionText() != null ? opt.getOptionText().trim() : "";
                correctOptions.add(correctText);
                if (normalizedUser.equalsIgnoreCase(normalizeTrueFalse(correctText))) {
                    isCorrect = true;
                }
            }
        }

        String displayCorrect = String.join(" / ", correctOptions);
        return new EvaluationResult(isCorrect, userText, null, displayCorrect);
    }

    private EvaluationResult evaluateMatching(List<QuestionOption> options, Object rawUserAnswer) {
        return evaluateMultipleChoice(options, rawUserAnswer);
    }

    private EvaluationResult buildEmptyResult(List<QuestionOption> options) {
        List<String> correctOptions = options.stream()
                .filter(opt -> Boolean.TRUE.equals(opt.getIsCorrect()))
                .map(QuestionOption::getOptionText)
                .toList();
        return new EvaluationResult(false, null, null, String.join(" / ", correctOptions));
    }

    private String normalizeText(String input) {
        if (input == null) return "";
        return input.trim()
                .replaceAll("\\s+", " ")
                .replaceAll("^[.,;:!?]+|[.,;:!?]+$", "");
    }

    private String normalizeTrueFalse(String input) {
        if (input == null) return "";
        String s = input.trim().toUpperCase();
        if ("T".equals(s)) return "TRUE";
        if ("F".equals(s)) return "FALSE";
        if ("NG".equals(s)) return "NOT GIVEN";
        return s;
    }

    private boolean startsWithOptionLetter(String optionText, String userText) {
        if (optionText.isEmpty() || userText.isEmpty()) return false;
        char firstCharOpt = Character.toUpperCase(optionText.charAt(0));
        char firstCharUser = Character.toUpperCase(userText.charAt(0));
        return userText.length() <= 2 && firstCharOpt == firstCharUser;
    }

    private Optional<UUID> parseUuid(String str) {
        try {
            return Optional.of(UUID.fromString(str.trim()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public double calculateIeltsListeningBand(int correctCount, int totalQuestions) {
        if (totalQuestions <= 0 || correctCount <= 0) {
            return 0.0;
        }

        int scaledCorrect = totalQuestions == 40
                ? correctCount
                : (int) Math.round(((double) correctCount / totalQuestions) * 40.0);

        scaledCorrect = Math.max(0, Math.min(40, scaledCorrect));

        if (scaledCorrect >= 39) return 9.0;
        if (scaledCorrect >= 37) return 8.5;
        if (scaledCorrect >= 35) return 8.0;
        if (scaledCorrect >= 32) return 7.5;
        if (scaledCorrect >= 30) return 7.0;
        if (scaledCorrect >= 26) return 6.5;
        if (scaledCorrect >= 23) return 6.0;
        if (scaledCorrect >= 18) return 5.5;
        if (scaledCorrect >= 16) return 5.0;
        if (scaledCorrect >= 13) return 4.5;
        if (scaledCorrect >= 10) return 4.0;
        if (scaledCorrect >= 8) return 3.5;
        if (scaledCorrect >= 6) return 3.0;
        if (scaledCorrect >= 4) return 2.5;
        if (scaledCorrect >= 2) return 2.0;
        return 1.0;
    }

    private record EvaluationResult(
            boolean isCorrect,
            String answerText,
            List<UUID> selectedOptionIds,
            String displayCorrectAnswer
    ) {}
}
