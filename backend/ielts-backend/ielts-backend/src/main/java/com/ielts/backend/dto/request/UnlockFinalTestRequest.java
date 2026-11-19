package com.ielts.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnlockFinalTestRequest {

    @Min(1)
    @Max(365)
    private Integer deadlineDays;

    @Size(max = 50)
    private String username;
}

