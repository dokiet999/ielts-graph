package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class CourseProgressOverviewResponse {
    private UUID courseId;
    private String courseTitle;
    private Integer maxStudents;
    private int activeStudentCount;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private int totalExercises;
    private double averageProgressPercent;
    private int completedCount;
    private int behindOrInactiveCount;
    private int preEnrolledCount;
    private List<CourseStudentProgressItemResponse> students;
}
