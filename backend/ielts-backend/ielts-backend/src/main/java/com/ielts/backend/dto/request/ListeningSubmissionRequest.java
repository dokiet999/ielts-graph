package com.ielts.backend.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListeningSubmissionRequest {

    /**
     * Map of user answers:
     * Key: questionId (UUID as string)
     * Value: answer value (can be String text for FILL_BLANK, or optionId UUID String, or List of option UUIDs)
     */
    @NotEmpty(message = "Answers map must not be empty")
    private Map<String, Object> answers;
}
