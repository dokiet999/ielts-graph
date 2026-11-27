package com.ielts.backend.repository;

import com.ielts.backend.entity.FinalTestSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinalTestSessionRepository extends JpaRepository<FinalTestSession, UUID> {

    List<FinalTestSession> findByUserIdAndSectionIdOrderByStartedAtDesc(UUID userId, UUID sectionId);

    Optional<FinalTestSession> findFirstByUserIdAndExerciseIdAndSubmittedAtIsNullOrderByStartedAtDesc(
            UUID userId, UUID exerciseId);

    Optional<FinalTestSession> findBySubmissionId(UUID submissionId);

    /**
     * Open (not yet submitted) sessions of the learner for the final test, newest first, locked so two
     * submissions sent at the same time cannot both use the same session.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select s from FinalTestSession s
            where s.userId = :userId and s.exerciseId = :exerciseId and s.submittedAt is null
            order by s.startedAt desc
            """)
    List<FinalTestSession> findOpenForUpdate(@Param("userId") UUID userId, @Param("exerciseId") UUID exerciseId);
}
