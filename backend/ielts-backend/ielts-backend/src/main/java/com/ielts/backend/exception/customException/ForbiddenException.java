package com.ielts.backend.exception.customException;

import com.ielts.backend.exception.GlobalExceptionHandler;
import lombok.Getter;

/** Mapped to HTTP 403 by {@link GlobalExceptionHandler}. */
@Getter
public class ForbiddenException extends RuntimeException {

    public static final String DEFAULT_CODE = "FORBIDDEN";

    private final String code;

    public ForbiddenException(String message) {
        this(DEFAULT_CODE, message);
    }

    public ForbiddenException(String code, String message) {
        super(message);
        this.code = code;
    }
}
