package com.ielts.backend.mapper;

import com.ielts.backend.dto.response.ExerciseDetailResponse;
import com.ielts.backend.dto.response.ExerciseQuestionGroupResponse;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Question;
import com.ielts.backend.entity.QuestionGroup;
import com.ielts.backend.entity.QuestionOption;
import com.ielts.backend.enums.QuestionType;
import com.ielts.backend.enums.SkillType;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Answer hiding rules, checked without a database. */
class ExerciseMapperTest {

    private final ExerciseMapper mapper = new ExerciseMapper();

    @Test
    void toDetail_hidesTranscriptWithoutChangingTheEntity() {
        Map<String, Object> content = new LinkedHashMap<>();
        content.put("sectionTitle", "Section 1");
        content.put("transcript", List.of(Map.of("speaker", "Tom", "text", "It's Maria Thornley.")));
        Exercise exercise = exercise(content);

        ExerciseDetailResponse detail = mapper.toDetail(exercise, List.of(), List.of(), List.of());

        assertThat(detail.getContent()).containsOnlyKeys("sectionTitle");
        assertThat(exercise.getContent()).containsKey("transcript");
    }

    @Test
    void toDetail_returnsChoicesButNotAnswersForChoiceQuestions() {
        Exercise exercise = exercise(null);
        QuestionGroup group = group(exercise, QuestionType.TRUE_FALSE);
        Question question = question(exercise, group, QuestionType.TRUE_FALSE, 1);
        List<QuestionOption> options = List.of(
                option(question, "TRUE", true, 1),
                option(question, "FALSE", false, 2),
                option(question, "NOT GIVEN", false, 3));

        ExerciseDetailResponse detail = mapper.toDetail(exercise, List.of(group), List.of(question), options);

        assertThat(detail.getGroups()).hasSize(1);
        assertThat(detail.getGroups().get(0).getQuestions().get(0).getOptions())
                .extracting("optionText")
                .containsExactly("TRUE", "FALSE", "NOT GIVEN");
    }

    @Test
    void toDetail_fillBlankReturnsNoOptions() {
        Exercise exercise = exercise(null);
        QuestionGroup group = group(exercise, QuestionType.FILL_BLANK);
        Question question = question(exercise, group, QuestionType.FILL_BLANK, 1);
        List<QuestionOption> answers = List.of(option(question, "19", true, 1), option(question, "nineteenth", true, 2));

        ExerciseDetailResponse detail = mapper.toDetail(exercise, List.of(group), List.of(question), answers);

        assertThat(detail.getGroups().get(0).getQuestions().get(0).getOptions()).isEmpty();
    }

    @Test
    void toDetail_ungroupedQuestionsGoLast() {
        Exercise exercise = exercise(null);
        QuestionGroup group = group(exercise, QuestionType.MULTIPLE_CHOICE);
        Question grouped = question(exercise, group, QuestionType.MULTIPLE_CHOICE, 1);
        Question loose = question(exercise, null, QuestionType.MULTIPLE_CHOICE, 2);

        ExerciseDetailResponse detail = mapper.toDetail(exercise, List.of(group), List.of(grouped, loose), List.of());

        assertThat(detail.getTotalQuestions()).isEqualTo(2);
        assertThat(detail.getGroups()).extracting(ExerciseQuestionGroupResponse::getId)
                .containsExactly(group.getId(), null);
        assertThat(detail.getGroups().get(1).getQuestions()).extracting("number").containsExactly(2);
    }

    private static Exercise exercise(Map<String, Object> content) {
        return Exercise.builder().id(UUID.randomUUID()).title("Sample").skillType(SkillType.READING)
                .content(content).build();
    }

    private static QuestionGroup group(Exercise exercise, QuestionType type) {
        return QuestionGroup.builder().id(UUID.randomUUID()).exercise(exercise).questionType(type).build();
    }

    private static Question question(Exercise exercise, QuestionGroup group, QuestionType type, int number) {
        return Question.builder().id(UUID.randomUUID()).exercise(exercise).questionGroup(group)
                .questionText("Question " + number).questionType(type).explanation("secret").ordering(number).build();
    }

    private static QuestionOption option(Question question, String text, boolean correct, int ordering) {
        return QuestionOption.builder().id(UUID.randomUUID()).question(question).optionText(text)
                .isCorrect(correct).ordering(ordering).build();
    }
}
