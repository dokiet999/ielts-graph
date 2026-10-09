package com.ielts.backend.mapper;

import com.ielts.backend.dto.response.*;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Question;
import com.ielts.backend.entity.QuestionGroup;
import com.ielts.backend.entity.QuestionOption;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class ExerciseMapper {

    public ExerciseResponse toResponse(Exercise exercise) {
        return ExerciseResponse.builder()
                .id(exercise.getId())
                .lessonId(exercise.getLesson() != null ? exercise.getLesson().getId() : null)
                .title(exercise.getTitle())
                .instruction(exercise.getInstruction())
                .audioUrl(exercise.getAudioUrl())
                .content(exercise.getContent())
                .exerciseType(exercise.getExerciseType())
                .skillType(exercise.getSkillType())
                .timeLimit(exercise.getTimeLimit())
                .maxAttempts(exercise.getMaxAttempts())
                .passingScore(exercise.getPassingScore())
                .ordering(exercise.getOrdering())
                .createdAt(exercise.getCreatedAt())
                .updatedAt(exercise.getUpdatedAt())
                .build();
    }

    public ExerciseDetailPracticeResponse toPracticeResponse(
            Exercise exercise,
            List<QuestionGroup> groups,
            Map<UUID, List<Question>> questionsByGroup,
            Map<UUID, List<QuestionOption>> optionsByQuestion) {

        int totalQuestions = questionsByGroup.values().stream().mapToInt(List::size).sum();

        List<QuestionGroupPracticeResponse> groupResponses = groups.stream().map(g -> {
            List<Question> questions = questionsByGroup.getOrDefault(g.getId(), Collections.emptyList());

            List<QuestionPracticeResponse> questionResponses = questions.stream().map(q -> {
                List<QuestionOption> options = optionsByQuestion.getOrDefault(q.getId(), Collections.emptyList());

                List<QuestionOptionPracticeResponse> optionResponses = options.stream().map(opt ->
                        QuestionOptionPracticeResponse.builder()
                                .id(opt.getId())
                                .optionText(opt.getOptionText())
                                .ordering(opt.getOrdering())
                                .build()
                ).toList();

                return QuestionPracticeResponse.builder()
                        .id(q.getId())
                        .questionText(q.getQuestionText())
                        .questionType(q.getQuestionType())
                        .imageUrl(q.getImageUrl())
                        .audioUrl(q.getAudioUrl())
                        .readingPassage(q.getReadingPassage())
                        .points(q.getPoints())
                        .ordering(q.getOrdering())
                        .options(optionResponses)
                        .build();
            }).toList();

            return QuestionGroupPracticeResponse.builder()
                    .id(g.getId())
                    .groupTitle(g.getGroupTitle())
                    .groupInstruction(g.getGroupInstruction())
                    .passageReference(g.getPassageReference())
                    .imageUrl(g.getImageUrl())
                    .questionType(g.getQuestionType())
                    .questionRange(g.getQuestionRange())
                    .ordering(g.getOrdering())
                    .questions(questionResponses)
                    .build();
        }).toList();

        return ExerciseDetailPracticeResponse.builder()
                .id(exercise.getId())
                .lessonId(exercise.getLesson() != null ? exercise.getLesson().getId() : null)
                .title(exercise.getTitle())
                .instruction(exercise.getInstruction())
                .audioUrl(exercise.getAudioUrl())
                .content(exercise.getContent())
                .exerciseType(exercise.getExerciseType())
                .skillType(exercise.getSkillType())
                .timeLimit(exercise.getTimeLimit())
                .maxAttempts(exercise.getMaxAttempts())
                .passingScore(exercise.getPassingScore())
                .totalQuestions(totalQuestions)
                .questionGroups(groupResponses)
                .build();
    }
}
