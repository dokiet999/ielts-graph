package com.ielts.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration of the speech recognition service (Python, Whisper), prefix app.speaking.asr.
 */
@Configuration
@ConfigurationProperties(prefix = "app.speaking.asr")
@Getter
@Setter
public class SpeakingAsrConfig {

    /**
     * Full URL of the transcribe endpoint. The service (ai/asr_service/app.py) listens on 127.0.0.1 only, so the
     * address is used instead of "localhost", which may resolve to the IPv6 ::1 on some machines.
     */
    private String url = "http://127.0.0.1:8000/transcribe";
    /** Read timeout. Whisper on a CPU can be slow, so this is generous. */
    private Integer timeoutSeconds = 180;
    /** Name of the multipart field that carries the audio file; ai/asr_service/app.py expects "audio". */
    private String fileField = "audio";
    /** When true no request is sent: the client returns ai/schema/speaking_asr.sample.json. */
    private boolean fake = false;
}
