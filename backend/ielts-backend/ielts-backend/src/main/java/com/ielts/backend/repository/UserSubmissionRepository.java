package com.ielts.backend.repository;

import com.ielts.backend.entity.UserSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserSubmissionRepository extends JpaRepository<UserSubmission, UUID> {

    List<UserSubmission> findByUserIdAndExerciseIdOrderByAttemptNumberDesc(UUID userId, UUID exerciseId);

    Optional<UserSubmission> findTopByUserIdAndExerciseIdOrderByAttemptNumberDesc(UUID userId, UUID exerciseId);

    Optional<UserSubmission> findByIdAndUserId(UUID id, UUID userId);
}
