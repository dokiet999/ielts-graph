package com.ielts.backend.service;

import java.util.UUID;

/**
 * Updates a learner's SubSkill mastery profile from graded submissions (W6, Issue 2).
 */
public interface LearnerProfileService {

    /**
     * Applies the events of a graded submission to the learner's profile and marks
     * {@code user_submissions.profile_applied_at}.
     * <p>
     * Idempotent: if the submission does not exist, is not {@code GRADED}, or already has
     * {@code profile_applied_at} set, this method returns without error.
     *
     * @param submissionId ID of the submission in {@code user_submissions}
     */
    void applySubmission(UUID submissionId);
}

