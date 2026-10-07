package com.ielts.backend.entity;

import com.ielts.backend.enums.QuestionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "question_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "group_title", length = 512)
    private String groupTitle;

    @Column(name = "group_instruction", columnDefinition = "TEXT")
    private String groupInstruction;

    @Column(name = "passage_reference", columnDefinition = "TEXT")
    private String passageReference;

    @Column(name = "image_url", length = 512)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", columnDefinition = "question_type")
    private QuestionType questionType;

    @Column(name = "question_range", length = 50)
    private String questionRange;

    @Column(name = "correct_answer_count", nullable = false)
    private Integer correctAnswerCount = 0;

    @Column(name = "ordering", nullable = false)
    private Integer ordering = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
