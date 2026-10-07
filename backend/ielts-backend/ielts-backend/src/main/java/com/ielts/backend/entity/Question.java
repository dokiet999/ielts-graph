package com.ielts.backend.entity;

import com.ielts.backend.enums.QuestionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_group_id")
    private QuestionGroup questionGroup;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, columnDefinition = "question_type")
    private QuestionType questionType;

    @Column(name = "image_url", length = 512)
    private String imageUrl;

    @Column(name = "audio_url", length = 512)
    private String audioUrl;

    @Column(name = "reading_passage", columnDefinition = "TEXT")
    private String readingPassage;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "points", nullable = false, precision = 5, scale = 2)
    private BigDecimal points = BigDecimal.ONE;

    @Column(name = "ordering", nullable = false)
    private Integer ordering = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
