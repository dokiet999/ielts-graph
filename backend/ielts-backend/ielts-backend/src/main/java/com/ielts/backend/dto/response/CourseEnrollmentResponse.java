package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CourseEnrollmentResponse {
    private LocalDateTime enrolledAt;
    private LocalDateTime completedAt;
}
