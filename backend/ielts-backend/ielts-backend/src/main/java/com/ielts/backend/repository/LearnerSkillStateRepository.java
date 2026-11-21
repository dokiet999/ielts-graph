package com.ielts.backend.repository;

import com.ielts.backend.entity.LearnerSkillState;
import com.ielts.backend.entity.LearnerSkillStateId;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
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

    /**
     * Creates the row with the initial state if it does not exist yet. {@code SELECT ... FOR UPDATE} cannot lock
     * a row that does not exist, so without this two submissions of the same learner applied at the same time
     * would both insert the row and one of them would fail on the primary key. With ON CONFLICT DO NOTHING the
     * second insert waits for the first transaction and then does nothing.
     */
    @Modifying
    @Query(value = """
            INSERT INTO learner_skill_state (user_id, subskill_id, mastery, evidence, last_update)
            VALUES (:userId, :subskillId, :mastery, 0, NULL)
            ON CONFLICT (user_id, subskill_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfMissing(@Param("userId") UUID userId,
                        @Param("subskillId") String subskillId,
                        @Param("mastery") double initialMastery);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from LearnerSkillState s where s.userId = :userId and s.subskillId in :subskillIds")
    List<LearnerSkillState> findByUserIdAndSubskillIdInForUpdate(@Param("userId") UUID userId,
                                                                 @Param("subskillIds") Collection<String> subskillIds);
}

