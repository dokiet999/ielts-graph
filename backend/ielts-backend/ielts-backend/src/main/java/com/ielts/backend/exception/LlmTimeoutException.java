package com.ielts.backend.exception;

/**
 * Thrown by {@link com.ielts.backend.service.llm.LlmClient} when the LLM API call
 * exceeds the configured timeout. Mapped to HTTP 502 by {@link GlobalExceptionHandler}.
 */
public class LlmTimeoutException extends RuntimeException {

    public LlmTimeoutException(String message) {
        super(message);
    }

    public LlmTimeoutException(String message, Throwable cause) {
        super(message, cause);
    }
}
