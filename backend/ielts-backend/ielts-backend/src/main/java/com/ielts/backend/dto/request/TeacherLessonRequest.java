package com.ielts.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TeacherLessonRequest {

    @NotBlank
    @Size(max = 512)
    private String title;

    @NotBlank
    @Size(max = 50)
    private String lessonType = "VIDEO";

    @Size(max = 512)
    private String videoUrl;

    @PositiveOrZero
    private Integer videoDuration;

    @Size(max = 512)
    private String documentUrl;

    @PositiveOrZero
    private Integer ordering;

    private Boolean isPreview = false;
}
