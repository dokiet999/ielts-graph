package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.ExerciseFilter;
import com.ielts.backend.dto.response.ExerciseDetailResponse;
import com.ielts.backend.dto.response.ExerciseSummaryResponse;
import com.ielts.backend.dto.response.PageResponse;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.exception.ResourceNotFoundException;
import com.ielts.backend.mapper.ExerciseMapper;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.QuestionGroupRepository;
import com.ielts.backend.repository.QuestionOptionRepository;
import com.ielts.backend.repository.QuestionRepository;
import com.ielts.backend.service.CourseAccessService;
import com.ielts.backend.service.ExerciseService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;

import static com.ielts.backend.repository.ExerciseSpecifications.hasLevel;
import static com.ielts.backend.repository.ExerciseSpecifications.hasQuestionType;
import static com.ielts.backend.repository.ExerciseSpecifications.hasSkill;
import static com.ielts.backend.repository.ExerciseSpecifications.standalonePractice;
import static com.ielts.backend.repository.ExerciseSpecifications.titleContains;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExerciseServiceImpl implements ExerciseService {

    private final ExerciseRepository exerciseRepository;
    private final QuestionGroupRepository questionGroupRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final CourseAccessService courseAccessService;
    private final ExerciseMapper exerciseMapper;

    @Override
    public PageResponse<ExerciseSummaryResponse> getExercises(ExerciseFilter filter, Pageable pageable) {
        List<Specification<Exercise>> specs = Stream.of(
                        standalonePractice(),
                        hasSkill(filter.skill()),
                        hasLevel(filter.level()),
                        hasQuestionType(filter.questionType()),
                        titleContains(filter.q()))
                .filter(Objects::nonNull)
                .toList();
        Page<Exercise> page = exerciseRepository.findAll(Specification.allOf(specs), pageable);

        // One grouped COUNT for the whole page
        Map<UUID, Long> counts = questionRepository.countMapByExerciseIds(
                page.getContent().stream().map(Exercise::getId).toList());

        return PageResponse.of(page, e -> exerciseMapper.toSummary(e, counts.getOrDefault(e.getId(), 0L)));
    }

    @Override
    public ExerciseDetailResponse getExerciseDetail(UUID exerciseId, String username) {
        Exercise exercise = exerciseRepository.findByIdWithLessonAndCourse(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise", exerciseId));
        courseAccessService.checkExerciseAccess(exercise, username);

        // Three queries for the whole question tree, grouped in memory by the mapper
        return exerciseMapper.toDetail(exercise,
                questionGroupRepository.findByExerciseIdOrderByOrderingAsc(exerciseId),
                questionRepository.findByExerciseIdOrderByOrderingAsc(exerciseId),
                questionOptionRepository.findByExerciseId(exerciseId));
    }
}
