package com.ielts.backend.service.speaking;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

/**
 * Response of the speech recognition service, as defined by ai/schema/speaking_asr.schema.json.
 * The JSON uses snake_case; the application ObjectMapper does not, so each record says so itself.
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SpeakingAsrResult(
        String schemaVersion,
        String asrModel,
        String language,
        String transcript,
        Features features,
        Pronunciation pronunciation) {

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Features(
            double durationSec,
            int wordCount,
            double speechRateWpm,
            int pauseCount,
            double totalPauseSec,
            double longestPauseSec) {
    }

    /** Azure scores, 0-100. The whole object is null when the service did not run it. */
    public record Pronunciation(
            double accuracy,
            double fluency,
            double completeness,
            Double prosody) {
    }
}
