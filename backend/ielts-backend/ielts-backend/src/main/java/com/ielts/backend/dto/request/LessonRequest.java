package com.ielts.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class LessonRequest {

    @NotNull
    private UUID sectionId;

    @NotBlank
    @Size(max = 512)
    private String title;

    @Size(max = 50)
    private String lessonType = "VIDEO";

    @Size(max = 512)
    private String videoUrl;

    @PositiveOrZero
    private Integer videoDuration;

    @Size(max = 512)
    private String documentUrl;

    @PositiveOrZero
    private Integer ordering = 0;

    private Boolean isPreview = false;
}
