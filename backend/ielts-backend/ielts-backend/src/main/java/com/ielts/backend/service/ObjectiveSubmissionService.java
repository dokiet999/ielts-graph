package com.ielts.backend.service;

import com.ielts.backend.dto.request.ObjectiveSubmissionRequest;
import com.ielts.backend.dto.response.ObjectiveSubmissionResultResponse;

import java.util.UUID;

public interface ObjectiveSubmissionService {

    /**
     * Grades a Reading or Listening exercise against its answer key and stores the attempt (issues #5, #6, UC09, UC12, FR-8.01).
     *
     * @param username the logged-in user
     */
    ObjectiveSubmissionResultResponse submit(UUID exerciseId, String username, ObjectiveSubmissionRequest request);
}
