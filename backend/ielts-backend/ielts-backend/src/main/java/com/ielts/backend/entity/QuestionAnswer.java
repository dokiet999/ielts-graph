package com.ielts.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Array;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "question_answers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private UserSubmission submission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "answer_text", columnDefinition = "TEXT")
    private String answerText;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Array(length = 100)
    @Column(name = "selected_options", columnDefinition = "uuid[]")
    private UUID[] selectedOptions;

    @Column(name = "media_url", length = 512)
    private String mediaUrl;

    @Column(name = "is_correct")
    private Boolean isCorrect;

    @Column(name = "points_earned", nullable = false, precision = 5, scale = 2)
    private BigDecimal pointsEarned = BigDecimal.ZERO;

    @Column(name = "ai_points", precision = 5, scale = 2)
    private BigDecimal aiPoints;

    @Column(name = "ai_feedback", columnDefinition = "TEXT")
    private String aiFeedback;

    @Column(name = "teacher_points", precision = 5, scale = 2)
    private BigDecimal teacherPoints;

    @Column(name = "teacher_feedback", columnDefinition = "TEXT")
    private String teacherFeedback;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
