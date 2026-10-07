package com.ielts.backend.dto.request;

import com.ielts.backend.enums.QuestionType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class QuestionGroupRequest {

    @NotNull
    private UUID exerciseId;

    private String groupTitle;

    private String groupInstruction;

    private String passageReference;

    private String imageUrl;

    private QuestionType questionType;

    private String questionRange;

    private Integer correctAnswerCount = 0;

    private Integer ordering = 0;
}
