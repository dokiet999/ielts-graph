package com.ielts.backend.service;

import com.ielts.backend.dto.response.SubmissionDetailResponse;
import com.ielts.backend.dto.response.SubmissionResponse;
import com.ielts.backend.dto.response.SubmissionReviewResponse;
import com.ielts.backend.dto.response.SubmissionSummaryResponse;

import java.util.List;
import java.util.UUID;

public interface SubmissionService {

    List<SubmissionResponse> getSubmissionHistory(UUID exerciseId, String username);

    SubmissionResponse getSubmissionDetail(UUID submissionId, String username);

    SubmissionReviewResponse getSubmissionReview(UUID submissionId, String username);

    /** Every attempt of the user, newest first. */
    List<SubmissionSummaryResponse> getMySubmissions(String username);

    /**
     * Result of an attempt with the learner's answers and the exercise including its answer key.
     * Same access rule as {@link #getSubmissionDetail}.
     */
    SubmissionDetailResponse getSubmissionResult(UUID submissionId, String username);
}
