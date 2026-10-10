package com.ielts.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ObjectiveSubmissionRequest {

    /**
     * Key: question id. Value: the id of one of the question's options for choice questions,
     * or the typed text for FILL_BLANK. Questions left out are graded as unanswered (wrong).
     */
    @NotNull(message = "answers must not be null")
    private Map<String, Object> answers;

    /** Seconds spent on the attempt, measured by the client. Optional; at most one day. */
    @PositiveOrZero(message = "timeSpent must not be negative")
    @Max(value = 86400, message = "timeSpent must be at most 86400 seconds")
    private Integer timeSpent;
}
