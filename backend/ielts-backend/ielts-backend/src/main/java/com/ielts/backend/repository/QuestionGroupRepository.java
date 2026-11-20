package com.ielts.backend.repository;

import com.ielts.backend.entity.QuestionGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface QuestionGroupRepository extends JpaRepository<QuestionGroup, UUID> {

    List<QuestionGroup> findByExerciseIdOrderByOrderingAsc(UUID exerciseId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from QuestionGroup g where g.exercise.id = :exerciseId")
    void deleteByExerciseId(@Param("exerciseId") UUID exerciseId);
}
