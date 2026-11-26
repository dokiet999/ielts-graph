package com.ielts.backend.repository;

import com.ielts.backend.entity.FinalTestGrant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinalTestGrantRepository extends JpaRepository<FinalTestGrant, UUID> {

    Optional<FinalTestGrant> findByUserIdAndSectionId(UUID userId, UUID sectionId);

    List<FinalTestGrant> findByUserIdAndSectionIdIn(UUID userId, Collection<UUID> sectionIds);

    void deleteByUserIdAndSectionId(UUID userId, UUID sectionId);
}

