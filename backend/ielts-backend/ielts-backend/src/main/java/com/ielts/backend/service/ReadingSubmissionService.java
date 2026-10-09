package com.ielts.backend.service;

import com.ielts.backend.dto.request.ReadingSubmissionRequest;
import com.ielts.backend.dto.response.ReadingSubmissionResultResponse;

import java.util.UUID;

public interface ReadingSubmissionService {

    /**
     * Grades a Reading exercise against its answer key and stores the attempt (issue #5, UC12, FR-8.01).
     *
     * @param username the logged-in user
     */
    ReadingSubmissionResultResponse submit(UUID exerciseId, String username, ReadingSubmissionRequest request);
}
