package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class SectionResponse {
    private UUID id;
    private UUID courseId;
    private String title;
    private String description;
    private Integer ordering;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
