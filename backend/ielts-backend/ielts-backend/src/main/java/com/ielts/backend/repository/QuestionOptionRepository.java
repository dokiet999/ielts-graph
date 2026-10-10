package com.ielts.backend.repository;

import com.ielts.backend.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface QuestionOptionRepository extends JpaRepository<QuestionOption, UUID> {

    List<QuestionOption> findByQuestionIdOrderByOrderingAsc(UUID questionId);

    List<QuestionOption> findByQuestionIdInOrderByOrderingAsc(Collection<UUID> questionIds);
}
