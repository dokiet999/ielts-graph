package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class CategoryResponse {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    private String iconUrl;
    private Boolean isActive;
    private Integer ordering;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
