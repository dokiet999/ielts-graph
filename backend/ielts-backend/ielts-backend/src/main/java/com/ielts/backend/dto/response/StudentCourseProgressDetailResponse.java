package com.ielts.backend.dto.response;

import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.GradingMethod;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class StudentCourseProgressDetailResponse {
    private UUID courseId;
    private String courseTitle;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Integer maxStudents;
    private UUID studentId;
    private String fullName;
    private String username;
    private String email;
    private LocalDateTime enrolledAt;
    private LocalDateTime completedAt;
    private int completedExercises;
    private int totalExercises;
    private double progressPercent;
    private Double averageScore;
    private LocalDateTime lastSubmittedAt;
    private String scheduleStatus;
    private List<SectionProgressItem> sections;
    private List<StudentSubmissionHistoryItem> submissions;

    @Data
    @Builder
    public static class SectionProgressItem {
        private UUID sectionId;
        private String title;
        private int ordering;
        private int completedExercises;
        private int totalExercises;
        private SectionFinalTestProgress finalTest;
        private List<LessonProgressItem> lessons;
    }

    @Data
    @Builder
    public static class SectionFinalTestProgress {
        private UUID exerciseId;
        private String exerciseTitle;
        private boolean unlocked;
        private boolean grantExpired;
        private Integer deadlineDays;
        private LocalDateTime unlockedAt;
        private LocalDateTime grantExpiresAt;
        private int attemptCount;
        private BigDecimal bestScore;
        private UUID latestSubmissionId;
    }

    @Data
    @Builder
    public static class LessonProgressItem {
        private UUID lessonId;
        private String title;
        private String lessonType;
        private int ordering;
        private int completedExercises;
        private int totalExercises;
        private List<ExerciseProgressItem> exercises;
    }

    @Data
    @Builder
    public static class ExerciseProgressItem {
        private UUID exerciseId;
        private String title;
        private ExerciseType exerciseType;
        private SkillType skillType;
        private int questionCount;
        private BigDecimal maxScore;
        private int attemptCount;
        private BigDecimal bestScore;
        private boolean completed;
        private UUID latestSubmissionId;
        private SubmissionStatus latestStatus;
        private LocalDateTime lastSubmittedAt;
        private boolean hasTeacherFeedback;
    }

    @Data
    @Builder
    public static class StudentSubmissionHistoryItem {
        private UUID id;
        private UUID exerciseId;
        private String exerciseTitle;
        private SkillType skillType;
        private ExerciseType exerciseType;
        private int attemptNumber;
        private SubmissionStatus status;
        private BigDecimal score;
        private BigDecimal maxScore;
        private BigDecimal aiScore;
        private BigDecimal teacherScore;
        private String teacherFeedback;
        private GradingMethod gradingMethod;
        private String gradedByName;
        private LocalDateTime gradedAt;
        private LocalDateTime submittedAt;
        private Integer timeSpent;
    }
}
