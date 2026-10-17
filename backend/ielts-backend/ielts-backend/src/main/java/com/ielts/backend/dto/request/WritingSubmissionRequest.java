package com.ielts.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for submitting an IELTS Writing essay.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WritingSubmissionRequest {

    @NotBlank(message = "essayText must not be blank")
    @Size(max = 10000, message = "Essay must be at most 10000 characters")
    private String essayText;

    @PositiveOrZero(message = "timeSpent must not be negative")
    @Max(value = 86400, message = "timeSpent must be at most 86400 seconds")
    private Integer timeSpent;
}
