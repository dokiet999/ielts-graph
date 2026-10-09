package com.ielts.backend.service;

import com.ielts.backend.dto.request.ListeningSubmissionRequest;
import com.ielts.backend.dto.response.SubmissionResponse;
import com.ielts.backend.dto.response.SubmissionResultResponse;
import com.ielts.backend.dto.response.SubmissionReviewResponse;

import java.util.List;
import java.util.UUID;

public interface SubmissionService {

    SubmissionResultResponse submitListeningExercise(UUID exerciseId, String username, ListeningSubmissionRequest request);

    List<SubmissionResponse> getSubmissionHistory(UUID exerciseId, String username);

    SubmissionResponse getSubmissionDetail(UUID submissionId, String username);

    SubmissionReviewResponse getSubmissionReview(UUID submissionId, String username);
}
