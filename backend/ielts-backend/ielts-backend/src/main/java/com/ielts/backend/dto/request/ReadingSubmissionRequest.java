package com.ielts.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadingSubmissionRequest {

    /**
     * Key: question id. Value: the id of one of the question's options for choice questions,
     * or the typed text for FILL_BLANK. Questions left out are graded as unanswered (wrong).
     */
    @NotNull(message = "answers must not be null")
    private Map<String, Object> answers;
}
