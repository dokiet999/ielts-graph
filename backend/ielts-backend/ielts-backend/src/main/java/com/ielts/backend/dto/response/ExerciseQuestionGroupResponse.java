package com.ielts.backend.dto.response;

import com.ielts.backend.enums.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/** Learner view of a question group. id is null for questions that belong to no group. */
@Data
@Builder
public class ExerciseQuestionGroupResponse {
    private UUID id;
    private String groupTitle;
    private String groupInstruction;
    private String passageReference;
    private String imageUrl;
    private QuestionType questionType;
    private String questionRange;
    private Integer correctAnswerCount;
    private Integer ordering;
    private List<ExerciseQuestionResponse> questions;
}
