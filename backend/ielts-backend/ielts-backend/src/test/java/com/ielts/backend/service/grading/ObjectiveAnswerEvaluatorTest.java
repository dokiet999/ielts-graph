package com.ielts.backend.service.grading;

import com.ielts.backend.entity.Question;
import com.ielts.backend.entity.QuestionOption;
import com.ielts.backend.enums.QuestionType;
import com.ielts.backend.service.grading.ObjectiveAnswerEvaluator.Evaluation;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ObjectiveAnswerEvaluatorTest {

    private final ObjectiveAnswerEvaluator evaluator = new ObjectiveAnswerEvaluator();

    // ---------- Choice questions: option id of the question itself ----------

    @Test
    void trueFalse_correctOptionId_isCorrect() {
        Question q = question(QuestionType.TRUE_FALSE);
        QuestionOption t = option(q, "TRUE", false);
        QuestionOption f = option(q, "FALSE", true);
        QuestionOption ng = option(q, "NOT GIVEN", false);
        List<QuestionOption> options = List.of(t, f, ng);

        Evaluation right = evaluator.evaluate(q, options, f.getId().toString());
        Evaluation wrong = evaluator.evaluate(q, options, ng.getId().toString());

        assertThat(right.correct()).isTrue();
        assertThat(right.selectedOptionIds()).containsExactly(f.getId());
        assertThat(right.userAnswer()).isEqualTo("FALSE");
        assertThat(wrong.correct()).isFalse();
        assertThat(wrong.correctAnswer()).isEqualTo("FALSE");
    }

    @Test
    void choice_textOrLetterInsteadOfOptionId_isRejected() {
        Question q = question(QuestionType.MULTIPLE_CHOICE);
        List<QuestionOption> options = List.of(option(q, "A. one", false), option(q, "B. two", true));

        assertThat(evaluator.validate(q, options, "B")).isPresent();
        assertThat(evaluator.validate(q, options, "B. two")).isPresent();
        assertThat(evaluator.validate(q, options, 1)).isPresent();
    }

    @Test
    void choice_optionIdOfAnotherQuestion_isRejected() {
        Question q = question(QuestionType.MATCHING);
        Question other = question(QuestionType.MATCHING);
        List<QuestionOption> options = List.of(option(q, "C", true));
        QuestionOption foreign = option(other, "C", true);

        assertThat(evaluator.validate(q, options, foreign.getId().toString())).isPresent();
        assertThat(evaluator.evaluate(q, options, foreign.getId().toString()).correct()).isFalse();
    }

    // ---------- FILL_BLANK: any accepted spelling after normalisation ----------

    @Test
    void fillBlank_matchesAnyAcceptedSpelling() {
        Question q = question(QuestionType.FILL_BLANK);
        List<QuestionOption> key = List.of(option(q, "19", true), option(q, "19th", true), option(q, "nineteenth", true));

        assertThat(evaluator.evaluate(q, key, " Nineteenth. ").correct()).isTrue();
        assertThat(evaluator.evaluate(q, key, "19TH").correct()).isTrue();
        assertThat(evaluator.evaluate(q, key, "twelfth").correct()).isFalse();
        assertThat(evaluator.evaluate(q, key, "twelfth").correctAnswer()).isEqualTo("19 / 19th / nineteenth");
    }

    @Test
    void fillBlank_numberValueIsAccepted() {
        Question q = question(QuestionType.FILL_BLANK);
        List<QuestionOption> key = List.of(option(q, "85", true));

        assertThat(evaluator.validate(q, key, 85)).isEmpty();
        assertThat(evaluator.evaluate(q, key, 85).correct()).isTrue();
        assertThat(evaluator.validate(q, key, List.of("85"))).isPresent();
    }

    @Test
    void fillBlank_keepsTypedTextForStorage() {
        Question q = question(QuestionType.FILL_BLANK);

        Evaluation eval = evaluator.evaluate(q, List.of(option(q, "sponge", true)), "  Sponge ");

        assertThat(eval.answerText()).isEqualTo("Sponge");
        assertThat(eval.selectedOptionIds()).isNull();
    }

    // ---------- Blank answers and question types ----------

    @Test
    void blankAnswer_isValidAndWrong() {
        Question q = question(QuestionType.FILL_BLANK);
        List<QuestionOption> key = List.of(option(q, "sponge", true));

        assertThat(evaluator.validate(q, key, null)).isEmpty();
        assertThat(evaluator.validate(q, key, "   ")).isEmpty();
        Evaluation eval = evaluator.evaluate(q, key, null);
        assertThat(eval.correct()).isFalse();
        assertThat(eval.userAnswer()).isNull();
        assertThat(eval.correctAnswer()).isEqualTo("sponge");
    }

    @Test
    void essayAndSpeaking_areNotGradable() {
        assertThat(evaluator.isGradable(QuestionType.ESSAY)).isFalse();
        assertThat(evaluator.isGradable(QuestionType.SPEAKING)).isFalse();
        assertThat(evaluator.isGradable(QuestionType.DROPLIST)).isTrue();
    }

    private static Question question(QuestionType type) {
        return Question.builder().id(UUID.randomUUID()).questionText("q").questionType(type).build();
    }

    private static QuestionOption option(Question question, String text, boolean correct) {
        return QuestionOption.builder().id(UUID.randomUUID()).question(question).optionText(text).isCorrect(correct).build();
    }
}
