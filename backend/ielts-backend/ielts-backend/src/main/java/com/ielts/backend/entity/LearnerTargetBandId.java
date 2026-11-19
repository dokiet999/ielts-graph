package com.ielts.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite primary key (user_id, skill_type) for {@link LearnerTargetBand}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LearnerTargetBandId implements Serializable {

    private UUID userId;
    private String skillType;
}
