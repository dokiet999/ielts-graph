package com.ielts.backend.repository;

import com.ielts.backend.entity.FinalTestSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinalTestSessionRepository extends JpaRepository<FinalTestSession, UUID> {

    List<FinalTestSession> findByUserIdAndSectionIdOrderByStartedAtDesc(UUID userId, UUID sectionId);

    Optional<FinalTestSession> findFirstByUserIdAndExerciseIdAndSubmittedAtIsNullOrderByStartedAtDesc(
            UUID userId, UUID exerciseId);
}

