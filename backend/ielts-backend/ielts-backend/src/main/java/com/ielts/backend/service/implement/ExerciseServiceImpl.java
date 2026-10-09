package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.ExerciseRequest;
import com.ielts.backend.dto.response.ExerciseDetailPracticeResponse;
import com.ielts.backend.dto.response.ExerciseResponse;
import com.ielts.backend.dto.response.PageResponse;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Lesson;
import com.ielts.backend.entity.Question;
import com.ielts.backend.entity.QuestionGroup;
import com.ielts.backend.entity.QuestionOption;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.exception.ResourceNotFoundException;
import com.ielts.backend.mapper.ExerciseMapper;
import com.ielts.backend.repository.*;
import com.ielts.backend.service.ExerciseService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ExerciseServiceImpl implements ExerciseService {

    private final ExerciseRepository exerciseRepository;
    private final QuestionGroupRepository questionGroupRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final LessonRepository lessonRepository;
    private final ExerciseMapper exerciseMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ExerciseResponse> getExercises(SkillType skill, ExerciseType type, Pageable pageable) {
        Page<Exercise> page;
        if (skill != null && type != null) {
            page = exerciseRepository.findBySkillTypeAndExerciseType(skill, type, pageable);
        } else if (skill != null) {
            page = exerciseRepository.findBySkillType(skill, pageable);
        } else {
            page = exerciseRepository.findAll(pageable);
        }

        return PageResponse.of(page, exerciseMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ExerciseDetailPracticeResponse getExerciseForPractice(UUID id) {
        Exercise exercise = exerciseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise", id));

        List<QuestionGroup> groups = questionGroupRepository.findByExerciseIdOrderByOrderingAsc(id);
        List<Question> questions = questionRepository.findByExerciseIdOrderByOrderingAsc(id);

        List<UUID> questionIds = questions.stream().map(Question::getId).toList();
        List<QuestionOption> options = questionOptionRepository.findByQuestionIdInOrderByOrderingAsc(questionIds);

        Map<UUID, List<Question>> questionsByGroup = new HashMap<>();
        for (Question q : questions) {
            UUID groupId = q.getQuestionGroup() != null ? q.getQuestionGroup().getId() : null;
            if (groupId != null) {
                questionsByGroup.computeIfAbsent(groupId, k -> new ArrayList<>()).add(q);
            }
        }

        Map<UUID, List<QuestionOption>> optionsByQuestion = new HashMap<>();
        for (QuestionOption opt : options) {
            optionsByQuestion.computeIfAbsent(opt.getQuestion().getId(), k -> new ArrayList<>()).add(opt);
        }

        return exerciseMapper.toPracticeResponse(exercise, groups, questionsByGroup, optionsByQuestion);
    }

    @Override
    @Transactional(readOnly = true)
    public ExerciseResponse getExercise(UUID id) {
        Exercise exercise = exerciseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise", id));
        return exerciseMapper.toResponse(exercise);
    }

    @Override
    @Transactional
    public ExerciseResponse createExercise(ExerciseRequest request) {
        Lesson lesson = null;
        if (request.getLessonId() != null) {
            lesson = lessonRepository.findById(request.getLessonId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lesson", request.getLessonId()));
        }

        Exercise exercise = Exercise.builder()
                .lesson(lesson)
                .title(request.getTitle())
                .instruction(request.getInstruction())
                .audioUrl(request.getAudioUrl())
                .content(request.getContent())
                .exerciseType(request.getExerciseType())
                .skillType(request.getSkillType())
                .timeLimit(request.getTimeLimit())
                .maxAttempts(request.getMaxAttempts() != null ? request.getMaxAttempts() : 1)
                .passingScore(request.getPassingScore())
                .ordering(request.getOrdering() != null ? request.getOrdering() : 0)
                .build();

        Exercise saved = exerciseRepository.save(exercise);
        return exerciseMapper.toResponse(saved);
    }
}
