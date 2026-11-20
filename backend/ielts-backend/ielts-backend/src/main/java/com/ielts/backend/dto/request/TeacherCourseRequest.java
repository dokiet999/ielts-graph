package com.ielts.backend.dto.request;

import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.SkillType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class TeacherCourseRequest {

    @NotNull
    private UUID categoryId;

    @NotBlank
    @Size(max = 512)
    private String title;

    private String description;

    @Size(max = 512)
    private String thumbnail;

    @NotNull
    private SkillType skillFocus;

    @NotNull
    private DifficultyLevel difficultyLevel;

    @Positive
    private Integer estimatedDuration;

    private Map<String, Object> courseOutline;
}
