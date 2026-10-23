package com.ielts.backend.exception;

public class AsrUnavailableException extends RuntimeException {

    public AsrUnavailableException(String message) {
        super(message);
    }

    public AsrUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
