package com.ielts.backend.exception;

/**
 * Thrown when the Neo4j Knowledge Graph cannot be reached or a Cypher query fails.
 * Mapped to HTTP 503 {@code KG_UNAVAILABLE} by {@link GlobalExceptionHandler}.
 */
public class KgUnavailableException extends RuntimeException {

    public KgUnavailableException(String message) {
        super(message);
    }

    public KgUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}

