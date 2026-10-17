package com.ielts.backend.service;

import com.ielts.backend.dto.request.WritingSubmissionRequest;
import com.ielts.backend.dto.response.WritingSubmissionResultResponse;

import java.util.UUID;

/**
 * Service for submitting and grading IELTS Writing essays via AI.
 */
public interface WritingSubmissionService {

    /**
     * Submits an IELTS Writing essay, evaluates it via LLM against IELTS criteria,
     * persists the submission and returns the detailed feedback.
     *
     * @param exerciseId id of the Writing exercise
     * @param username current authenticated student's username
     * @param request essay submission request containing essay text and time spent
     * @return structured grading result
     */
    WritingSubmissionResultResponse submit(UUID exerciseId, String username, WritingSubmissionRequest request);
}
