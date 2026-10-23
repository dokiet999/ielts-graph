package com.ielts.backend.service.asr;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Structured ASR result returned by the Python AI service (matches ai/schema/speaking_asr.schema.json).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SpeakingAsrResult {

    @JsonProperty("schema_version")
    private String schemaVersion;

    @JsonProperty("asr_model")
    private String asrModel;

    @JsonProperty("language")
    private String language;

    @JsonProperty("transcript")
    private String transcript;

    @JsonProperty("features")
    private Features features;

    @JsonProperty("pronunciation")
    private Pronunciation pronunciation;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Features {
        @JsonProperty("duration_sec")
        private double durationSec;

        @JsonProperty("word_count")
        private int wordCount;

        @JsonProperty("speech_rate_wpm")
        private double speechRateWpm;

        @JsonProperty("pause_count")
        private int pauseCount;

        @JsonProperty("total_pause_sec")
        private double totalPauseSec;

        @JsonProperty("longest_pause_sec")
        private double longestPauseSec;

        public Map<String, Object> toMap() {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("duration_sec", durationSec);
            map.put("word_count", wordCount);
            map.put("speech_rate_wpm", speechRateWpm);
            map.put("pause_count", pauseCount);
            map.put("total_pause_sec", totalPauseSec);
            map.put("longest_pause_sec", longestPauseSec);
            return map;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Pronunciation {
        @JsonProperty("accuracy")
        private double accuracy;

        @JsonProperty("fluency")
        private double fluency;

        @JsonProperty("completeness")
        private double completeness;

        @JsonProperty("prosody")
        private Double prosody;

        public Map<String, Object> toMap() {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("accuracy", accuracy);
            map.put("fluency", fluency);
            map.put("completeness", completeness);
            map.put("prosody", prosody);
            return map;
        }
    }

    public Map<String, Object> toFeaturesMap() {
        return features != null ? features.toMap() : null;
    }

    public Map<String, Object> toPronunciationMap() {
        return pronunciation != null ? pronunciation.toMap() : null;
    }
}
