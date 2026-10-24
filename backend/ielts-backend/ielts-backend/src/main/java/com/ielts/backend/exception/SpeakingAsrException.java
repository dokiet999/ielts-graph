package com.ielts.backend.exception;

import lombok.Getter;

/**
 * The speech recognition service (Whisper) could not give a usable result.
 * Codes: ASR_TIMEOUT, ASR_UNAVAILABLE, ASR_BAD_RESPONSE. Messages are generic: they never carry
 * transcript text, which is personal data.
 */
@Getter
public class SpeakingAsrException extends RuntimeException {

    private final String code;

    public SpeakingAsrException(String code, String message) {
        super(message);
        this.code = code;
    }

    public SpeakingAsrException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }
}
