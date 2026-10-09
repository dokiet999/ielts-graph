package com.ielts.backend.repository;

import com.ielts.backend.entity.QuestionAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuestionAnswerRepository extends JpaRepository<QuestionAnswer, UUID> {

    List<QuestionAnswer> findBySubmissionIdOrderByCreatedAtAsc(UUID submissionId);
}
