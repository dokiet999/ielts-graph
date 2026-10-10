package com.ielts.backend.repository;

import com.ielts.backend.entity.UserSubmission;
import com.ielts.backend.enums.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserSubmissionRepository extends JpaRepository<UserSubmission, UUID> {

    List<UserSubmission> findByUserIdAndExerciseIdOrderByAttemptNumberDesc(UUID userId, UUID exerciseId);

    Optional<UserSubmission> findTopByUserIdAndExerciseIdOrderByAttemptNumberDesc(UUID userId, UUID exerciseId);

    Optional<UserSubmission> findByIdAndUserId(UUID id, UUID userId);

    /** All submissions of a user with their exercise, lesson and section, newest first. */
    @Query("""
            select s from UserSubmission s
            join fetch s.exercise e
            left join fetch e.lesson l
            left join fetch l.section
            where s.user.id = :userId
            order by s.submittedAt desc, s.attemptNumber desc
            """)
    List<UserSubmission> findByUserIdWithExercise(@Param("userId") UUID userId);

    /** Among the given exercises, those the user has at least one submission with the given status for. */
    @Query("""
            select distinct s.exercise.id from UserSubmission s
            where s.user.id = :userId and s.status = :status and s.exercise.id in :exerciseIds
            """)
    List<UUID> findExerciseIdsWithStatus(@Param("userId") UUID userId,
                                         @Param("exerciseIds") Collection<UUID> exerciseIds,
                                         @Param("status") SubmissionStatus status);

    @Query("""
            select s.id as id, s.exercise.id as exerciseId, s.attemptNumber as attemptNumber,
                   s.score as score, s.status as status
            from UserSubmission s
            where s.user.id = :userId and s.exercise.id in :exerciseIds
            """)
    List<SubmissionScore> findScoresByUserIdAndExerciseIds(@Param("userId") UUID userId,
                                                           @Param("exerciseIds") Collection<UUID> exerciseIds);

    interface SubmissionScore {
        UUID getId();

        UUID getExerciseId();

        int getAttemptNumber();

        BigDecimal getScore();

        SubmissionStatus getStatus();
    }
}
