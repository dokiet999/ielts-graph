package com.ielts.backend.repository;

import com.ielts.backend.entity.QuestionGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuestionGroupRepository extends JpaRepository<QuestionGroup, UUID> {

    List<QuestionGroup> findByExerciseIdOrderByOrderingAsc(UUID exerciseId);
}
