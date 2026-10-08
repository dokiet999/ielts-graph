package com.ielts.backend.exception;

/** Mapped to HTTP 401 by {@link GlobalExceptionHandler}. */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
