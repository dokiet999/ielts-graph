package com.ielts.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class SectionRequest {

    @NotNull
    private UUID courseId;

    @NotBlank
    @Size(max = 512)
    private String title;

    private String description;

    private Integer ordering = 0;
}
