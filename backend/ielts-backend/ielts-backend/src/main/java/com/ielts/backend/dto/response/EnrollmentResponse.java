package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class EnrollmentResponse {
    private UUID id;
    private UUID courseId;
    private LocalDateTime enrollmentDate;
    private BigDecimal progressPercentage;
    private LocalDateTime completionDate;
    /** True when this request created the enrollment, false when it already existed. */
    private boolean created;
}
