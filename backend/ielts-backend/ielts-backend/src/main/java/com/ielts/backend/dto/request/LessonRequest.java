package com.ielts.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    private String lessonType = "VIDEO";

    private String videoUrl;

    private Integer videoDuration;

    private String documentUrl;

    private Integer ordering = 0;

    private Boolean isPreview = false;
}
