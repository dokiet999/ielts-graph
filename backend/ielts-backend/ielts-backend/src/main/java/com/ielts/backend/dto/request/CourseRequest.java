package com.ielts.backend.dto.request;

import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.SkillType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class CourseRequest {

    @NotNull
    private UUID categoryId;

    @NotBlank
    @Size(max = 512)
    private String title;

    private String description;

    private String thumbnail;

    private SkillType skillFocus;

    private DifficultyLevel difficultyLevel;

    private Integer estimatedDuration;

    private Boolean isFeatured = false;

    private Map<String, Object> courseOutline;
}
