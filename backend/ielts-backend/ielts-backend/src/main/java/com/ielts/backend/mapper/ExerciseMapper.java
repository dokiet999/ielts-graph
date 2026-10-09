package com.ielts.backend.mapper;

import com.ielts.backend.dto.response.ExerciseDetailResponse;
import com.ielts.backend.dto.response.ExerciseOptionResponse;
import com.ielts.backend.dto.response.ExerciseQuestionGroupResponse;
import com.ielts.backend.dto.response.ExerciseQuestionResponse;
import com.ielts.backend.dto.response.ExerciseSummaryResponse;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Question;
import com.ielts.backend.entity.QuestionGroup;
import com.ielts.backend.entity.QuestionOption;
import com.ielts.backend.enums.QuestionType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Builds the learner view of an exercise. This is the only place that decides
 * what a learner may see before submitting, so answer keys never leave the server:
 * <ul>
 *   <li>isCorrect, point and explanation are never mapped</li>
 *   <li>FILL_BLANK options are the accepted answers, so they are not returned at all</li>
 *   <li>content keys that give the answers away (the Listening transcript) are removed</li>
 * </ul>
 */
@Component
public class ExerciseMapper {

    /** Keys inside exercises.content that contain answers. Agree new keys with the data schema (#9). */
    static final Set<String> HIDDEN_CONTENT_KEYS = Set.of("transcript");

    /** Question types whose options are the answer key rather than choices. */
    private static final Set<QuestionType> TYPES_WITHOUT_CHOICES = Set.of(QuestionType.FILL_BLANK);

    public ExerciseSummaryResponse toSummary(Exercise exercise, long questionCount) {
        return ExerciseSummaryResponse.builder()
                .id(exercise.getId())
                .lessonId(exercise.getLesson() != null ? exercise.getLesson().getId() : null)
                .title(exercise.getTitle())
                .exerciseType(exercise.getExerciseType())
                .skillType(exercise.getSkillType())
                .difficultyLevel(exercise.getDifficultyLevel())
                .timeLimit(exercise.getTimeLimit())
                .ordering(exercise.getOrdering())
                .questionCount(questionCount)
                .build();
    }

    /**
     * @param groups    groups of the exercise, ordered
     * @param questions questions of the exercise, ordered
     * @param options   options of all questions of the exercise, ordered
     */
    public ExerciseDetailResponse toDetail(Exercise exercise, List<QuestionGroup> groups,
                                           List<Question> questions, List<QuestionOption> options) {
        Map<UUID, List<QuestionOption>> optionsByQuestion = options.stream()
                .collect(Collectors.groupingBy(o -> o.getQuestion().getId()));
        // LinkedHashMap keeps question order inside each group
        Map<UUID, List<ExerciseQuestionResponse>> questionsByGroup = new LinkedHashMap<>();
        List<ExerciseQuestionResponse> ungrouped = new ArrayList<>();
        for (Question question : questions) {
            ExerciseQuestionResponse view = toQuestion(question, optionsByQuestion.getOrDefault(question.getId(), List.of()));
            if (question.getQuestionGroup() == null) {
                ungrouped.add(view);
            } else {
                questionsByGroup.computeIfAbsent(question.getQuestionGroup().getId(), id -> new ArrayList<>()).add(view);
            }
        }

        List<ExerciseQuestionGroupResponse> groupViews = new ArrayList<>(groups.stream()
                .map(g -> toGroup(g, questionsByGroup.getOrDefault(g.getId(), List.of())))
                .toList());
        if (!ungrouped.isEmpty()) {
            groupViews.add(ExerciseQuestionGroupResponse.builder()
                    .ordering(Integer.MAX_VALUE)
                    .questions(ungrouped)
                    .build());
        }

        return ExerciseDetailResponse.builder()
                .id(exercise.getId())
                .lessonId(exercise.getLesson() != null ? exercise.getLesson().getId() : null)
                .title(exercise.getTitle())
                .instruction(exercise.getInstruction())
                .audioUrl(exercise.getAudioUrl())
                .content(hideAnswers(exercise.getContent()))
                .exerciseType(exercise.getExerciseType())
                .skillType(exercise.getSkillType())
                .difficultyLevel(exercise.getDifficultyLevel())
                .timeLimit(exercise.getTimeLimit())
                .maxAttempts(exercise.getMaxAttempts())
                .totalQuestions(questions.size())
                .groups(groupViews)
                .build();
    }

    /** Works on a copy: changing the entity's map would mark it dirty. */
    private Map<String, Object> hideAnswers(Map<String, Object> content) {
        if (content == null) {
            return null;
        }
        Map<String, Object> safe = new LinkedHashMap<>(content);
        HIDDEN_CONTENT_KEYS.forEach(safe::remove);
        return safe;
    }

    private ExerciseQuestionGroupResponse toGroup(QuestionGroup group, List<ExerciseQuestionResponse> questions) {
        return ExerciseQuestionGroupResponse.builder()
                .id(group.getId())
                .groupTitle(group.getGroupTitle())
                .groupInstruction(group.getGroupInstruction())
                .passageReference(group.getPassageReference())
                .imageUrl(group.getImageUrl())
                .questionType(group.getQuestionType())
                .questionRange(group.getQuestionRange())
                .correctAnswerCount(group.getCorrectAnswerCount())
                .ordering(group.getOrdering())
                .questions(questions)
                .build();
    }

    private ExerciseQuestionResponse toQuestion(Question question, List<QuestionOption> options) {
        List<ExerciseOptionResponse> choices = TYPES_WITHOUT_CHOICES.contains(question.getQuestionType())
                ? List.of()
                : options.stream().map(this::toOption).toList();
        return ExerciseQuestionResponse.builder()
                .id(question.getId())
                .number(question.getOrdering())
                .questionText(question.getQuestionText())
                .questionType(question.getQuestionType())
                .imageUrl(question.getImageUrl())
                .audioUrl(question.getAudioUrl())
                .readingPassage(question.getReadingPassage())
                .points(question.getPoints())
                .options(choices)
                .build();
    }

    private ExerciseOptionResponse toOption(QuestionOption option) {
        return ExerciseOptionResponse.builder()
                .id(option.getId())
                .optionText(option.getOptionText())
                .ordering(option.getOrdering())
                .build();
    }
}
