package com.ielts.backend.repository;

import com.ielts.backend.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {

    List<Question> findByExerciseIdOrderByOrderingAsc(UUID exerciseId);

    List<Question> findByQuestionGroupIdOrderByOrderingAsc(UUID questionGroupId);
}
