package com.ielts.backend.entity;

import jakarta.persistence.*;
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

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "section_id", nullable = false)
    private UUID sectionId;

    @Column(name = "unlocked_by")
    private UUID unlockedBy;

    @Column(name = "deadline_days", nullable = false)
    @Builder.Default
    private Integer deadlineDays = 7;

    @Column(name = "unlocked_at", nullable = false)
    @Builder.Default
    private LocalDateTime unlockedAt = LocalDateTime.now();

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}

