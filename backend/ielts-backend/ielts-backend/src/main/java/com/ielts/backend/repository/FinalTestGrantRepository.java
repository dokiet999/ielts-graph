package com.ielts.backend.repository;

import com.ielts.backend.entity.FinalTestGrant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FinalTestGrantRepository extends JpaRepository<FinalTestGrant, UUID> {

    Optional<FinalTestGrant> findByUserIdAndSectionId(UUID userId, UUID sectionId);

    void deleteByUserIdAndSectionId(UUID userId, UUID sectionId);
}

