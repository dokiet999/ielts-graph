package com.ielts.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TargetBandRequest {

    /** WRITING or SPEAKING. */
    @NotBlank(message = "skill must not be blank")
    private String skill;

    /** 4.0 to 9.0 in steps of 0.5. */
    @NotNull(message = "targetBand must not be null")
    @DecimalMin(value = "4.0", message = "targetBand must be at least 4.0")
    @DecimalMax(value = "9.0", message = "targetBand must be at most 9.0")
    private BigDecimal targetBand;
}
