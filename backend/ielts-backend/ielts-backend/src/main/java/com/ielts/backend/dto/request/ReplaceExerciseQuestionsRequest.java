package com.ielts.backend.dto.request;

import com.ielts.backend.enums.QuestionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ReplaceExerciseQuestionsRequest {

    @NotNull
    @Valid
    private List<QuestionGroupInput> questionGroups;

    @Data
    public static class QuestionGroupInput {

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
        private Integer ordering;

        @NotEmpty
        @Valid
        private List<QuestionInput> questions;
    }

    @Data
    public static class QuestionInput {

        @NotBlank
        private String questionText;

        @NotNull
        private QuestionType questionType;

        @Size(max = 512)
        private String imageUrl;

        @Size(max = 512)
        private String audioUrl;

        private String readingPassage;

        private String explanation;

        @DecimalMin("0.00")
        private BigDecimal points = BigDecimal.ONE;

        @PositiveOrZero
        private Integer ordering;

        @Valid
        private List<QuestionOptionInput> options;
    }

    @Data
    public static class QuestionOptionInput {

        @NotBlank
        private String optionText;

        private Boolean isCorrect = false;

        @DecimalMin("0.00")
        private BigDecimal point;

        private String explanation;

        @PositiveOrZero
        private Integer ordering;
    }
}
