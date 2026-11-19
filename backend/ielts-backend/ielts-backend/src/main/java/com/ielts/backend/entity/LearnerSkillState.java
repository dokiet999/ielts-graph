package com.ielts.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "learner_skill_state")
@IdClass(LearnerSkillStateId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearnerSkillState {

    @Id
    @NotNull
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Id
    @NotBlank
    @Size(max = 64)
    @Column(name = "subskill_id", length = 64, nullable = false)
    private String subskillId;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    @Column(name = "mastery", nullable = false)
    @Builder.Default
    private Double mastery = 0.5;

    @NotNull
    @DecimalMin("0.0")
    @Column(name = "evidence", nullable = false)
    @Builder.Default
    private Double evidence = 0.0;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;
}

