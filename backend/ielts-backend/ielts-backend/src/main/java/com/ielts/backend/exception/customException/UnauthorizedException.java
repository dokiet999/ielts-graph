package com.ielts.backend.exception.customException;

import com.ielts.backend.exception.GlobalExceptionHandler;

/** Mapped to HTTP 401 by {@link GlobalExceptionHandler}. */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
