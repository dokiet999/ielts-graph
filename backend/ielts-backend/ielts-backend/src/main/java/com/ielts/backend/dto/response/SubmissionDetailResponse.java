package com.ielts.backend.dto.response;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import java.util.List;
import java.util.Map;

/** A graded attempt with the learner's answers and the exercise including its answer key, for review. */
@Data
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@SuperBuilder
public class SubmissionDetailResponse extends SubmissionSummaryResponse {
    /** Answers as sent by the learner: question id -> option id or typed text, or Writing/Speaking payload. */
    private Map<String, Object> answers;
    /** One entry per question, in question order. */
    private List<QuestionScoreResponse> results;
    private ExerciseReviewResponse exercise;
    /** Writing & Speaking: the AI feedback as stored after grading, so a result can be reopened. */
    private Map<String, Object> aiStructuredFeedback;
    /** Writing & Speaking: the AI summary text. */
    private String aiFeedback;
    /** Writing & Speaking: the AI model that graded the submission. */
    private String aiModel;
    /** Writing & Speaking: the prompt version used for grading. */
    private String aiPromptVersion;
}
