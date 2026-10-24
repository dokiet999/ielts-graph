package com.ielts.backend.service.speaking;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.LinkedHashMap;
import java.util.Map;

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

    /** Features with the snake_case keys of the contract, as stored in the submission answers; null when absent. */
    public Map<String, Object> toFeaturesMap() {
        if (features == null) {
            return null;
        }
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("duration_sec", features.durationSec());
        map.put("word_count", features.wordCount());
        map.put("speech_rate_wpm", features.speechRateWpm());
        map.put("pause_count", features.pauseCount());
        map.put("total_pause_sec", features.totalPauseSec());
        map.put("longest_pause_sec", features.longestPauseSec());
        return map;
    }

    /** Pronunciation scores keyed as in the contract; null when the service did not run it. */
    public Map<String, Object> toPronunciationMap() {
        if (pronunciation == null) {
            return null;
        }
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("accuracy", pronunciation.accuracy());
        map.put("fluency", pronunciation.fluency());
        map.put("completeness", pronunciation.completeness());
        map.put("prosody", pronunciation.prosody());
        return map;
    }

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
