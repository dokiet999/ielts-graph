package com.ielts.backend.repository;

import com.ielts.backend.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {

    List<Question> findByExerciseIdOrderByOrderingAsc(UUID exerciseId);

    List<Question> findByQuestionGroupIdOrderByOrderingAsc(UUID questionGroupId);

    /** Number of questions and total points per exercise; exercises without questions are absent. */
    @Query("""
            select q.exercise.id as exerciseId, count(q) as questionCount, sum(q.points) as maxScore
            from Question q
            where q.exercise.id in :exerciseIds
            group by q.exercise.id
            """)
    List<ExerciseQuestionStats> summarizeByExerciseIds(@Param("exerciseIds") Collection<UUID> exerciseIds);

    interface ExerciseQuestionStats {
        UUID getExerciseId();

        long getQuestionCount();

        BigDecimal getMaxScore();
    }
}
