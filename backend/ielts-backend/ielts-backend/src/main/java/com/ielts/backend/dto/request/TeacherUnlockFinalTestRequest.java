package com.ielts.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class TeacherUnlockFinalTestRequest {

    @Min(1)
    @Max(365)
    private Integer deadlineDays;
}
