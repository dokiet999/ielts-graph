package com.ielts.backend.repository;

import com.ielts.backend.entity.LearnerSkillState;
import com.ielts.backend.entity.LearnerSkillStateId;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LearnerSkillStateRepository extends JpaRepository<LearnerSkillState, LearnerSkillStateId> {

    List<LearnerSkillState> findByUserIdOrderBySubskillIdAsc(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from LearnerSkillState s where s.userId = :userId and s.subskillId = :subskillId")
    Optional<LearnerSkillState> findByUserIdAndSubskillIdForUpdate(@Param("userId") UUID userId,
                                                                   @Param("subskillId") String subskillId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from LearnerSkillState s where s.userId = :userId and s.subskillId in :subskillIds")
    List<LearnerSkillState> findByUserIdAndSubskillIdInForUpdate(@Param("userId") UUID userId,
                                                                 @Param("subskillIds") Collection<String> subskillIds);
}

