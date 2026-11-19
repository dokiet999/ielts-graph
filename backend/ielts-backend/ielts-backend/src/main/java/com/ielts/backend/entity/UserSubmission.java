package com.ielts.backend.entity;

import com.ielts.backend.enums.GradingMethod;
import com.ielts.backend.enums.SubmissionStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
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
@Table(name = "user_submissions",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_submission_attempt",
                columnNames = {"user_id", "exercise_id", "attempt_number"}
        ))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @NotNull
    @Min(1)
    @Column(name = "attempt_number", nullable = false)
    @Builder.Default
    private Integer attemptNumber = 1;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answers", columnDefinition = "jsonb")
    private Map<String, Object> answers;

    @NotNull
    @DecimalMin("0.00")
    @Column(name = "score", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal score = BigDecimal.ZERO;

    @NotNull
    @DecimalMin("0.00")
    @Column(name = "max_score", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal maxScore = BigDecimal.ZERO;

    @DecimalMin("0.00")
    @Column(name = "ai_score", precision = 5, scale = 2)
    private BigDecimal aiScore;

    @Column(name = "ai_feedback", columnDefinition = "TEXT")
    private String aiFeedback;

    /** Full structured AI feedback JSON (WritingFeedback schema). Null for non-AI-graded submissions. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_structured_feedback", columnDefinition = "jsonb")
    private Map<String, Object> aiStructuredFeedback;

    /** LLM model identifier used for grading, e.g. "gemini-2.5-flash". */
    @Size(max = 100)
    @Column(name = "ai_model", length = 100)
    private String aiModel;

    /** Prompt version tag used for grading, e.g. "writing-v1.0". */
    @Size(max = 50)
    @Column(name = "ai_prompt_version", length = 50)
    private String aiPromptVersion;

    /** Round-trip latency in milliseconds from calling the LLM to receiving the parsed response. */
    @PositiveOrZero
    @Column(name = "ai_latency_ms")
    private Integer aiLatencyMs;

    @DecimalMin("0.00")
    @Column(name = "teacher_score", precision = 5, scale = 2)
    private BigDecimal teacherScore;

    @Column(name = "teacher_feedback", columnDefinition = "TEXT")
    private String teacherFeedback;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "grading_method", columnDefinition = "grading_method")
    private GradingMethod gradingMethod;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "graded_by")
    private Users gradedBy;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    /** Timestamp when this submission's events were applied to learner_skill_state (null if not applied yet). */
    @Column(name = "profile_applied_at")
    private LocalDateTime profileAppliedAt;

    @NotNull
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "submission_status")
    @Builder.Default
    private SubmissionStatus status = SubmissionStatus.PENDING;

    /** Seconds the learner spent on the attempt, as reported by the client. */
    @PositiveOrZero
    @Column(name = "time_spent")
    private Integer timeSpent;

    @NotNull
    @Column(name = "submitted_at", nullable = false)
    @Builder.Default
    private LocalDateTime submittedAt = LocalDateTime.now();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
