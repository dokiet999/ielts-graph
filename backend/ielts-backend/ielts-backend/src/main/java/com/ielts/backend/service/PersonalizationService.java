package com.ielts.backend.service;

import com.ielts.backend.dto.request.TargetBandRequest;
import com.ielts.backend.dto.response.PersonalizationResponse;

/**
 * The personalization tab (W7): weaknesses of the current learner across their graded Writing and Speaking attempts.
 */
public interface PersonalizationService {

    PersonalizationResponse getPersonalization(String username);

    /** Saves the target band of one skill and returns the updated personalization. */
    PersonalizationResponse setTargetBand(String username, TargetBandRequest request);
}
