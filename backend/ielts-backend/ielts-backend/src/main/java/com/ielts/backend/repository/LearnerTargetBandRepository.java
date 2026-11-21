package com.ielts.backend.repository;

import com.ielts.backend.entity.LearnerTargetBand;
import com.ielts.backend.entity.LearnerTargetBandId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LearnerTargetBandRepository extends JpaRepository<LearnerTargetBand, LearnerTargetBandId> {

    List<LearnerTargetBand> findByUserId(UUID userId);
}
