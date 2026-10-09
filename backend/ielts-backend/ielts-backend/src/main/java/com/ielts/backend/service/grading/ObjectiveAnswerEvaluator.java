package com.ielts.backend.service.grading;

import com.ielts.backend.entity.Question;
import com.ielts.backend.entity.QuestionOption;
import com.ielts.backend.enums.QuestionType;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Grades one objective question (Reading/Listening) against its answer key.
 *
 * <h2>Answer key (structure used by the sample data, issue #9)</h2>
 * <table>
 *   <tr><th>Type</th><th>Key</th><th>Learner sends</th></tr>
 *   <tr><td>TRUE_FALSE (TFNG and YNNG), MULTIPLE_CHOICE, DROPLIST, MATCHING</td>
 *       <td>the question's own options; exactly one has is_correct = true</td>
 *       <td>the id of one option of that question</td></tr>
 *   <tr><td>FILL_BLANK</td>
 *       <td>every option with is_correct = true is an accepted spelling</td>
 *       <td>free text, compared after {@link AnswerNormalizer}</td></tr>
 * </table>
 * Choice answers must be option ids, so labels such as "N" (NO or NOT GIVEN?) or roman numerals never
 * need guessing. question_groups.correct_answer_count is the number of questions in the group and is
 * not used for grading. A missing or blank answer is valid and graded as wrong.
 */
@Component
public class ObjectiveAnswerEvaluator {

    private static final Set<QuestionType> CHOICE_TYPES = Set.of(
            QuestionType.TRUE_FALSE, QuestionType.MULTIPLE_CHOICE, QuestionType.DROPLIST, QuestionType.MATCHING);

    public boolean isGradable(QuestionType type) {
        return type == QuestionType.FILL_BLANK || CHOICE_TYPES.contains(type);
    }

    /**
     * @return why the answer is malformed, or empty when it can be graded
     */
    public Optional<String> validate(Question question, List<QuestionOption> options, Object rawAnswer) {
        if (isBlank(rawAnswer)) {
            return Optional.empty();
        }
        if (question.getQuestionType() == QuestionType.FILL_BLANK) {
            return rawAnswer instanceof String || rawAnswer instanceof Number
                    ? Optional.empty()
                    : Optional.of("text answer expected");
        }
        return findSelectedOption(options, rawAnswer).isPresent()
                ? Optional.empty()
                : Optional.of("id of an option of this question expected");
    }

    /** Call {@link #validate} first; a malformed answer is graded as wrong. */
    public Evaluation evaluate(Question question, List<QuestionOption> options, Object rawAnswer) {
        List<QuestionOption> correctOptions = options.stream()
                .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                .toList();
        String correctAnswer = String.join(" / ", correctOptions.stream().map(QuestionOption::getOptionText).toList());

        if (isBlank(rawAnswer)) {
            return new Evaluation(false, null, null, null, correctAnswer);
        }
        if (question.getQuestionType() == QuestionType.FILL_BLANK) {
            String text = rawAnswer.toString().trim();
            String normalized = AnswerNormalizer.normalize(text);
            boolean correct = correctOptions.stream()
                    .anyMatch(o -> AnswerNormalizer.normalize(o.getOptionText()).equals(normalized));
            return new Evaluation(correct, text, null, text, correctAnswer);
        }
        Optional<QuestionOption> selected = findSelectedOption(options, rawAnswer);
        boolean correct = selected.map(o -> Boolean.TRUE.equals(o.getIsCorrect())).orElse(false);
        return new Evaluation(correct, null,
                selected.map(o -> List.of(o.getId())).orElse(null),
                selected.map(QuestionOption::getOptionText).orElse(null),
                correctAnswer);
    }

    private Optional<QuestionOption> findSelectedOption(List<QuestionOption> options, Object rawAnswer) {
        if (!(rawAnswer instanceof String text)) {
            return Optional.empty();
        }
        UUID id;
        try {
            id = UUID.fromString(text.trim());
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
        return options.stream().filter(o -> o.getId().equals(id)).findFirst();
    }

    private static boolean isBlank(Object rawAnswer) {
        return rawAnswer == null || (rawAnswer instanceof String s && s.isBlank());
    }

    /**
     * @param answerText        the text as typed, for FILL_BLANK; stored in question_answers.answer_text
     * @param selectedOptionIds the chosen option for choice questions, stored in question_answers.selected_options
     * @param userAnswer        what the learner answered, for display (option text or typed text)
     * @param correctAnswer     the accepted answer(s), for display
     */
    public record Evaluation(boolean correct, String answerText, List<UUID> selectedOptionIds,
                             String userAnswer, String correctAnswer) {
    }
}
