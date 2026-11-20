package com.ielts.backend.repository;

import com.ielts.backend.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface QuestionOptionRepository extends JpaRepository<QuestionOption, UUID> {

    List<QuestionOption> findByQuestionIdOrderByOrderingAsc(UUID questionId);

    List<QuestionOption> findByQuestionIdInOrderByOrderingAsc(Collection<UUID> questionIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from QuestionOption o where o.question.id in (select q.id from Question q where q.exercise.id = :exerciseId)")
    void deleteByExerciseId(@Param("exerciseId") UUID exerciseId);
}
