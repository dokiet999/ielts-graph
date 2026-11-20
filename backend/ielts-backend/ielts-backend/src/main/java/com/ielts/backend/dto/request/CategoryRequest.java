package com.ielts.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CategoryRequest {

    @NotBlank
    @Size(max = 255)
    private String name;

    @Size(max = 255)
    private String slug;

    private String description;

    @Size(max = 512)
    private String iconUrl;

    private Boolean isActive = true;

    @PositiveOrZero
    private Integer ordering = 0;
}
