package com.ielts.backend.repository;

import com.ielts.backend.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface QuestionOptionRepository extends JpaRepository<QuestionOption, UUID> {

    /** All options of an exercise in one query; callers group them by question. */
    @Query("""
            select o from QuestionOption o
            where o.question.exercise.id = :exerciseId
            order by o.ordering asc
            """)
    List<QuestionOption> findByExerciseId(@Param("exerciseId") UUID exerciseId);
}
