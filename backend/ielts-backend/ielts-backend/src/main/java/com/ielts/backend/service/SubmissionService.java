package com.ielts.backend.service;

import com.ielts.backend.dto.response.SubmissionResponse;
import com.ielts.backend.dto.response.SubmissionReviewResponse;

import java.util.List;
import java.util.UUID;

public interface SubmissionService {

    List<SubmissionResponse> getSubmissionHistory(UUID exerciseId, String username);

    SubmissionResponse getSubmissionDetail(UUID submissionId, String username);

    SubmissionReviewResponse getSubmissionReview(UUID submissionId, String username);
}
