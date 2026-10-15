package com.ielts.backend.exception;

/**
 * Thrown by {@link com.ielts.backend.service.llm.LlmClient} when the LLM API responds
 * with an auth error (401/403 — invalid/expired API key) or any 5xx server error that
 * makes the service unavailable. Mapped to HTTP 503 by {@link GlobalExceptionHandler}.
 */
public class LlmUnavailableException extends RuntimeException {

    public LlmUnavailableException(String message) {
        super(message);
    }

    public LlmUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
