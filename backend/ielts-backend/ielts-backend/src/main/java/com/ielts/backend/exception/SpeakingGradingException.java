package com.ielts.backend.exception;

import lombok.Getter;

/**
 * The LLM did not produce a valid Speaking grading result, even after the retry.
 * Messages are generic: they never carry transcript text or LLM output, which may hold personal data.
 */
@Getter
public class SpeakingGradingException extends RuntimeException {

    private final String code;

    public SpeakingGradingException(String code, String message) {
        super(message);
        this.code = code;
    }
}
