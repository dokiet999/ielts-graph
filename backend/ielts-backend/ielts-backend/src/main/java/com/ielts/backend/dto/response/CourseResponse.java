package com.ielts.backend.dto.response;

import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.SkillType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class CourseResponse {
    private UUID id;
    private UUID teacherId;
    private String teacherName;
    private UUID categoryId;
    private String categoryName;
    private String title;
    private String description;
    private String thumbnail;
    private SkillType skillFocus;
    private DifficultyLevel difficultyLevel;
    private Integer estimatedDuration;
    private Boolean isFeatured;
    private Integer enrollmentCount;
    private BigDecimal rating;
    private Map<String, Object> courseOutline;
    private LocalDateTime publishedAt;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
