package com.ielts.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class TeacherSubmissionFeedbackRequest {

    @DecimalMin("0.00")
    private BigDecimal teacherScore;

    @NotBlank
    @Size(max = 5000)
    private String teacherFeedback;
}
