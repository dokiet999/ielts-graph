package com.ielts.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite primary key (user_id, subskill_id) for {@link LearnerSkillState}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LearnerSkillStateId implements Serializable {

    private UUID userId;
    private String subskillId;
}

