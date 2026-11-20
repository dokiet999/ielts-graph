package com.ielts.backend.dto.response;

import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class TeacherLessonExercisesResponse {
    private UUID lessonId;
    private String lessonTitle;
    private ContentStatus lessonStatus;
    private UUID sectionId;
    private String sectionTitle;
    private UUID courseId;
    private String courseTitle;
    private ContentStatus courseStatus;
    private SkillType courseSkillFocus;
    private List<TeacherExerciseSummaryResponse> exercises;

    @Data
    @Builder
    public static class TeacherExerciseSummaryResponse {
        private UUID id;
        private UUID lessonId;
        private String title;
        private String instruction;
        private String audioUrl;
        private ExerciseType exerciseType;
        private SkillType skillType;
        private Integer timeLimit;
        private Integer maxAttempts;
        private BigDecimal passingScore;
        private Integer ordering;
        private long questionCount;
        private long submissionCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
