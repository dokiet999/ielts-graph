package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class CourseStudentProgressItemResponse {
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
    private int totalSubmissions;
    private int pendingReviewCount;
    private LocalDateTime lastSubmittedAt;
    private String scheduleStatus;
}
