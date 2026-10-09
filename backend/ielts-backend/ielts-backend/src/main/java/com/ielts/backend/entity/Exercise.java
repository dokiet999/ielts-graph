package com.ielts.backend.entity;

import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "exercises")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    @Column(name = "title", nullable = false, length = 512)
    private String title;

    @Column(name = "instruction", columnDefinition = "TEXT")
    private String instruction;

    @Column(name = "audio_url", length = 512)
    private String audioUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content", columnDefinition = "jsonb")
    private Map<String, Object> content;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "exercise_type", nullable = false, columnDefinition = "exercise_type")
    @Builder.Default
    private ExerciseType exerciseType = ExerciseType.LESSON;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "skill_type", nullable = false, columnDefinition = "skill_type")
    private SkillType skillType;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "difficulty_level", columnDefinition = "difficulty_level")
    private DifficultyLevel difficultyLevel;

    @Column(name = "time_limit")
    private Integer timeLimit;

    @Column(name = "max_attempts", nullable = false)
    @Builder.Default
    private Integer maxAttempts = 1;

    @Column(name = "passing_score", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal passingScore = BigDecimal.ZERO;

    @Column(name = "ordering", nullable = false)
    @Builder.Default
    private Integer ordering = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
