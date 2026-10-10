package com.ielts.backend.service.progress;

import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.ExerciseRepository.CountableExercise;
import com.ielts.backend.repository.QuestionRepository;
import com.ielts.backend.repository.QuestionRepository.ExerciseQuestionStats;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.repository.UserSubmissionRepository.SubmissionScore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Exercise counts and per-user statistics shown in course, section and lesson views.
 * Each method runs a fixed number of grouped queries, whatever the number of exercises.
 * <p>
 * Counting rule: an exercise counts when it belongs to a lesson, has at least one question and
 * is not a mock test. It is completed when the user has at least one GRADED submission for it.
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningProgressReader {

    private final ExerciseRepository exerciseRepository;
    private final QuestionRepository questionRepository;
    private final UserSubmissionRepository userSubmissionRepository;

    /**
     * @param userId the learner, or null for anonymous access (nothing is completed)
     */
    public ExerciseCounts countExercises(Collection<UUID> courseIds, UUID userId) {
        if (courseIds.isEmpty()) {
            return new ExerciseCounts(Map.of(), Map.of());
        }
        List<CountableExercise> exercises = exerciseRepository.findCountableByCourseIds(courseIds);
        Set<UUID> completedIds = userId == null || exercises.isEmpty() ? Set.of()
                : new HashSet<>(userSubmissionRepository.findExerciseIdsWithStatus(userId,
                        exercises.stream().map(CountableExercise::getExerciseId).toList(), SubmissionStatus.GRADED));

        Map<UUID, Integer> total = new HashMap<>();
        Map<UUID, Integer> completed = new HashMap<>();
        for (CountableExercise e : exercises) {
            List<UUID> levels = List.of(e.getCourseId(), e.getSectionId(), e.getLessonId());
            levels.forEach(id -> total.merge(id, 1, Integer::sum));
            if (completedIds.contains(e.getExerciseId())) {
                levels.forEach(id -> completed.merge(id, 1, Integer::sum));
            }
        }
        return new ExerciseCounts(total, completed);
    }

    /**
     * @param userId the learner, or null for anonymous access (no attempts)
     * @return stats for every given exercise id
     */
    public Map<UUID, ExerciseStats> exerciseStats(Collection<UUID> exerciseIds, UUID userId) {
        if (exerciseIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, ExerciseQuestionStats> questions = questionRepository.summarizeByExerciseIds(exerciseIds).stream()
                .collect(Collectors.toMap(ExerciseQuestionStats::getExerciseId, Function.identity()));
        Map<UUID, List<SubmissionScore>> attempts = userId == null ? Map.of()
                : userSubmissionRepository.findScoresByUserIdAndExerciseIds(userId, exerciseIds).stream()
                        .collect(Collectors.groupingBy(SubmissionScore::getExerciseId));

        Map<UUID, ExerciseStats> stats = new HashMap<>();
        for (UUID id : exerciseIds) {
            ExerciseQuestionStats q = questions.get(id);
            List<SubmissionScore> mine = attempts.getOrDefault(id, List.of());
            stats.put(id, new ExerciseStats(
                    q != null ? Math.toIntExact(q.getQuestionCount()) : 0,
                    q != null && q.getMaxScore() != null ? q.getMaxScore() : BigDecimal.ZERO,
                    mine.size(),
                    mine.stream()
                            .filter(s -> s.getStatus() == SubmissionStatus.GRADED)
                            .map(SubmissionScore::getScore)
                            .filter(Objects::nonNull)
                            .max(Comparator.naturalOrder())
                            .orElse(null),
                    mine.stream()
                            .max(Comparator.comparingInt(SubmissionScore::getAttemptNumber))
                            .map(SubmissionScore::getId)
                            .orElse(null)));
        }
        return stats;
    }
}
