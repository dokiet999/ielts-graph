package com.ielts.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TeacherSectionRequest {

    @NotBlank
    @Size(max = 512)
    private String title;

    private String description;

    @PositiveOrZero
    private Integer ordering;
}
