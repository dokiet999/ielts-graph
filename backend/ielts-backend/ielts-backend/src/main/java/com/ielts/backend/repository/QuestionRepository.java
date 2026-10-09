package com.ielts.backend.repository;

import com.ielts.backend.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

public interface QuestionRepository extends JpaRepository<Question, UUID> {

    List<Question> findByExerciseIdOrderByOrderingAsc(UUID exerciseId);

    @Query("""
            select q.exercise.id as exerciseId, count(q) as total
            from Question q
            where q.exercise.id in :exerciseIds
            group by q.exercise.id
            """)
    List<ExerciseQuestionCount> countByExerciseIds(@Param("exerciseIds") Collection<UUID> exerciseIds);

    /** Question count per exercise in one grouped query; exercises without questions are absent. */
    default Map<UUID, Long> countMapByExerciseIds(Collection<UUID> exerciseIds) {
        if (exerciseIds.isEmpty()) {
            return Map.of();
        }
        return countByExerciseIds(exerciseIds).stream()
                .collect(Collectors.toMap(ExerciseQuestionCount::getExerciseId, ExerciseQuestionCount::getTotal));
    }

    interface ExerciseQuestionCount {
        UUID getExerciseId();

        long getTotal();
    }
}
