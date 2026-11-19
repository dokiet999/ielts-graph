package com.ielts.backend.dto.request;

import com.ielts.backend.enums.QuestionType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class QuestionGroupRequest {

    @NotNull
    private UUID exerciseId;

    @Size(max = 512)
    private String groupTitle;

    private String groupInstruction;

    private String passageReference;

    @Size(max = 512)
    private String imageUrl;

    private QuestionType questionType;

    @Size(max = 50)
    private String questionRange;

    @PositiveOrZero
    private Integer correctAnswerCount = 0;

    @PositiveOrZero
    private Integer ordering = 0;
}
