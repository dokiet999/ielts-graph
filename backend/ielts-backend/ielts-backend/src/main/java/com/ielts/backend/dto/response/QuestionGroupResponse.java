package com.ielts.backend.dto.response;

import com.ielts.backend.enums.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class QuestionGroupResponse {
    private UUID id;
    private UUID exerciseId;
    private String groupTitle;
    private String groupInstruction;
    private String passageReference;
    private String imageUrl;
    private QuestionType questionType;
    private String questionRange;
    private Integer correctAnswerCount;
    private Integer ordering;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
