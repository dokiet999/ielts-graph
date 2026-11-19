package com.ielts.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "final_test_grants",
        uniqueConstraints = @UniqueConstraint(name = "uq_final_test_grant", columnNames = {"user_id", "section_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinalTestGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotNull
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @NotNull
    @Column(name = "section_id", nullable = false)
    private UUID sectionId;

    @Column(name = "unlocked_by")
    private UUID unlockedBy;

    @NotNull
    @Min(1)
    @Max(365)
    @Column(name = "deadline_days", nullable = false)
    @Builder.Default
    private Integer deadlineDays = 7;

    @NotNull
    @Column(name = "unlocked_at", nullable = false)
    @Builder.Default
    private LocalDateTime unlockedAt = LocalDateTime.now();

    @NotNull
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}

