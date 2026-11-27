package com.ielts.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Target band a learner chose for one AI-graded skill ({@code WRITING} or {@code SPEAKING}).
 */
@Entity
@Table(name = "learner_target_band")
@IdClass(LearnerTargetBandId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearnerTargetBand {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Id
    @Column(name = "skill_type", length = 16, nullable = false)
    private String skillType;

    @Column(name = "target_band", nullable = false, precision = 2, scale = 1)
    private BigDecimal targetBand;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
