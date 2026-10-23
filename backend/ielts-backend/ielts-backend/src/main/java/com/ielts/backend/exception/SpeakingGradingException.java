package com.ielts.backend.exception;

import lombok.Getter;

@Getter
public class SpeakingGradingException extends RuntimeException {

    private final String code;

    public SpeakingGradingException(String code, String message) {
        super(message);
        this.code = code;
    }

    public SpeakingGradingException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }
}
