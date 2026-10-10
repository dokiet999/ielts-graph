package com.ielts.backend.repository;

import com.ielts.backend.entity.QuestionAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface QuestionAnswerRepository extends JpaRepository<QuestionAnswer, UUID> {

    List<QuestionAnswer> findBySubmissionIdOrderByCreatedAtAsc(UUID submissionId);

    /** Number of graded questions and correct answers per submission. */
    @Query("""
            select qa.submission.id as submissionId, count(qa) as questionCount,
                   sum(case when qa.isCorrect = true then 1 else 0 end) as correctCount
            from QuestionAnswer qa
            where qa.submission.id in :submissionIds
            group by qa.submission.id
            """)
    List<SubmissionAnswerCount> countBySubmissionIds(@Param("submissionIds") Collection<UUID> submissionIds);

    interface SubmissionAnswerCount {
        UUID getSubmissionId();

        long getQuestionCount();

        long getCorrectCount();
    }
}
