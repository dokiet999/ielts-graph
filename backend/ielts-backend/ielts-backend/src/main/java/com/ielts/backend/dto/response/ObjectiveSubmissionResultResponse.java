package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ObjectiveSubmissionResultResponse {
    /** Same fields as SubmissionResultResponse. bandScore is null: practice is not converted to a band (SRS 2.2.2.1). */
    private SubmissionResultResponse result;
    private List<QuestionTypeStatResponse> byQuestionType;
    private List<IncorrectQuestionResponse> incorrectQuestions;
}
