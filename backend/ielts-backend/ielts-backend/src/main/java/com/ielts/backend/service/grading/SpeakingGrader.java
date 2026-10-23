package com.ielts.backend.service.grading;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ielts.backend.exception.SpeakingGradingException;
import com.ielts.backend.service.llm.LlmClient;
import com.ielts.backend.service.speaking.SpeakingAsrResult;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Grades one Speaking answer (transcript, speech features, pronunciation scores) with the LLM.
 * Same pattern as {@link WritingEssayGrader}: build the prompt, call the LLM, parse the JSON, overwrite what the
 * backend owns (part, overall band), validate against the schema, drop evidence that cannot be trusted, and retry
 * once when the output is not valid JSON or does not match the schema. A timeout or an unavailable LLM is not retried.
 * <p>
 * The transcript is personal data: it is never written to the log or to an exception message.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SpeakingGrader {

    public static final String PROMPT_VERSION = "speaking-v1.1";
    private static final int MAX_RETRIES = 1;
    private static final int MAX_IMPROVEMENTS = 5;
    private static final String INDIRECT_PRONUNCIATION_NOTE =
            "Chưa có điểm phát âm từ máy nên band này chỉ là ước lượng gián tiếp. ";
    private static final String INDIRECT_MARKER = "gián tiếp";

    private static final Pattern CODE_BLOCK_PATTERN = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)\\s*```");
    private static final Pattern NON_WORD_PATTERN = Pattern.compile("[^\\p{L}\\p{N}']+");
    private static final Pattern CLOSING_TAG_PATTERN = Pattern.compile("(?i)</\\s*transcript\\s*>");

    private static final Set<String> PARTS = Set.of("QT_S_PART1", "QT_S_PART2", "QT_S_PART3");
    private static final List<String> CRITERIA = List.of("CRIT_S_FC", "CRIT_S_LR", "CRIT_S_GRA", "CRIT_S_P");

    private static final Map<String, Set<String>> ALLOWED_ERRORS_BY_CRITERION = Map.of(
            "CRIT_S_FC", Set.of("ERR_LONG_PAUSE", "ERR_SELF_CORRECTION", "ERR_SHORT_ANSWER"),
            "CRIT_S_LR", Set.of("ERR_WORD_CHOICE", "ERR_COLLOCATION", "ERR_REPETITION"),
            "CRIT_S_GRA", Set.of("ERR_ARTICLE", "ERR_VERB_TENSE", "ERR_SVA", "ERR_NOUN_NUM", "ERR_PREP", "ERR_SENT_STRUCTURE"),
            "CRIT_S_P", Set.of("ERR_MISPRONOUNCE", "ERR_WORD_STRESS", "ERR_MONOTONE")
    );

    private final LlmClient llmClient;
    private final ObjectMapper objectMapper;

    @Getter
    private String systemPrompt;
    private JsonSchema jsonSchema;

    @PostConstruct
    public void init() {
        try (InputStream is = new ClassPathResource("ai/prompts/speaking_v1.system.txt").getInputStream()) {
            this.systemPrompt = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            // No fallback prompt: grading with a stand-in prompt would silently give unreliable bands
            log.error("Could not load ai/prompts/speaking_v1.system.txt from classpath", e);
            throw new IllegalStateException("Failed to load the Speaking system prompt", e);
        }
        try (InputStream is = new ClassPathResource("ai/schema/speaking_feedback.schema.json").getInputStream()) {
            this.jsonSchema = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012).getSchema(is);
        } catch (Exception e) {
            log.error("Could not load ai/schema/speaking_feedback.schema.json from classpath", e);
            throw new IllegalStateException("Failed to initialize the SpeakingFeedback JSON Schema", e);
        }
    }

    /**
     * Grades one answer, with at most one retry when the output is not valid JSON or does not match the schema.
     * LlmTimeoutException and LlmUnavailableException from the LLM client are not caught here.
     *
     * @param part     QT_S_PART1, QT_S_PART2 or QT_S_PART3, taken from the exercise (never from the learner)
     * @param question the question or cue card
     * @throws SpeakingGradingException INVALID_PART, EMPTY_RESPONSE, MALFORMED_JSON or SCHEMA_VALIDATION_ERROR
     */
    public SpeakingGradingResult grade(String part, String question, SpeakingAsrResult asr) {
        if (part == null || !PARTS.contains(part)) {
            // Unlike Writing there is no sensible default: the Part sets the expected length
            throw new SpeakingGradingException("INVALID_PART", "Unknown Speaking part");
        }
        String userPrompt = buildUserPrompt(part, question, asr);

        SpeakingGradingException lastError = null;
        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    log.warn("Retrying LLM speaking grading (attempt {})", attempt + 1);
                }
                long startNanos = System.nanoTime();
                String rawResponse = llmClient.chat(systemPrompt, userPrompt);
                int latencyMs = (int) TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
                return parseValidateAndPostProcess(rawResponse, part, asr, latencyMs);
            } catch (SpeakingGradingException ex) {
                log.warn("Speaking grading attempt {} failed: {}", attempt + 1, ex.getCode());
                lastError = ex;
            }
        }
        throw lastError;
    }

    String buildUserPrompt(String part, String question, SpeakingAsrResult asr) {
        SpeakingAsrResult.Features f = asr.features();
        SpeakingAsrResult.Pronunciation p = asr.pronunciation();
        String pronunciation = p == null
                ? "not available"
                : String.format(Locale.ROOT, "accuracy=%.1f, fluency=%.1f, completeness=%.1f, prosody=%s",
                        p.accuracy(), p.fluency(), p.completeness(),
                        p.prosody() == null ? "n/a" : String.format(Locale.ROOT, "%.1f", p.prosody()));
        // A spoken "</transcript>" must not be able to close the tag the system prompt tells the LLM to trust
        String transcript = CLOSING_TAG_PATTERN.matcher(asr.transcript() == null ? "" : asr.transcript())
                .replaceAll("< /transcript>");

        return String.format(Locale.ROOT, """
                Part: %s

                Question:
                %s

                Transcript:
                <transcript>
                %s
                </transcript>

                Speech features:
                - duration_sec: %.1f
                - word_count: %d
                - speech_rate_wpm: %.1f (words per minute over the whole audio, pauses included)
                - pause_count: %d (silences of at least 0.5 s between words)
                - total_pause_sec: %.1f
                - longest_pause_sec: %.1f

                Pronunciation scores (0-100): %s
                """,
                part,
                question != null && !question.isBlank() ? question : "(no question text available)",
                transcript,
                f.durationSec(), f.wordCount(), f.speechRateWpm(),
                f.pauseCount(), f.totalPauseSec(), f.longestPauseSec(),
                pronunciation);
    }

    SpeakingGradingResult parseValidateAndPostProcess(String rawResponse, String part, SpeakingAsrResult asr, int latencyMs) {
        if (rawResponse == null || rawResponse.isBlank()) {
            throw new SpeakingGradingException("EMPTY_RESPONSE", "LLM returned an empty response");
        }

        JsonNode parsedNode;
        try {
            parsedNode = objectMapper.readTree(extractJson(rawResponse));
        } catch (Exception e) {
            // The Jackson message quotes part of the input, so it is neither logged nor passed on
            throw new SpeakingGradingException("MALFORMED_JSON", "LLM response is not valid JSON");
        }
        if (!parsedNode.isObject()) {
            throw new SpeakingGradingException("MALFORMED_JSON", "Root JSON node must be an object");
        }
        ObjectNode rootNode = (ObjectNode) parsedNode;

        // 1. The Part comes from the exercise, not from the LLM
        rootNode.put("part", part);
        // 2. overall_band and out_of_calibration_range are derived, so a wrong value must not fail the grading
        applyDerivedBands(rootNode);
        trimImprovements(rootNode);

        // 3. Schema check
        validateAgainstSchema(rootNode);

        // 4. Drop evidence that cannot be trusted; never fail the grading because of it
        ObjectNode criteriaObject = (ObjectNode) rootNode.path("criteria");
        String normalizedTranscript = " " + normalizeForComparison(asr.transcript()) + " ";
        BigDecimal bandSum = BigDecimal.ZERO;
        for (String critKey : CRITERIA) {
            ObjectNode crit = (ObjectNode) criteriaObject.path(critKey);
            bandSum = bandSum.add(BigDecimal.valueOf(crit.path("band").asInt()));
            filterEvidence(critKey, crit, normalizedTranscript);
        }

        // 5. Without pronunciation scores the LLM has nothing to base pronunciation evidence on, and the learner
        //    must be told the band is indirect, whether or not the LLM remembered to say so
        if (asr.pronunciation() == null) {
            ObjectNode pron = (ObjectNode) criteriaObject.path("CRIT_S_P");
            if (pron.path("evidence") instanceof ArrayNode evidence) {
                evidence.removeAll();
            }
            String comment = pron.path("comment").asText("");
            if (!comment.contains(INDIRECT_MARKER)) {
                pron.put("comment", INDIRECT_PRONUNCIATION_NOTE + comment);
            }
        }

        // 6. Final values, then validate again: the steps above must not break the contract
        BigDecimal overallBand = overallBandFromSum(bandSum);
        boolean outOfCalibration = isOutOfCalibration(overallBand);
        rootNode.put("overall_band", overallBand.doubleValue());
        rootNode.put("out_of_calibration_range", outOfCalibration);
        validateAgainstSchema(rootNode);

        return toResult(rootNode, part, overallBand, outOfCalibration, latencyMs);
    }

    private void filterEvidence(String critKey, ObjectNode crit, String normalizedTranscript) {
        if (!(crit.path("evidence") instanceof ArrayNode evidenceArray)) {
            return;
        }
        Set<String> allowedErrors = ALLOWED_ERRORS_BY_CRITERION.getOrDefault(critKey, Set.of());
        int removed = 0;
        Iterator<JsonNode> it = evidenceArray.elements();
        while (it.hasNext()) {
            JsonNode ev = it.next();
            if (!allowedErrors.contains(ev.path("error_type").asText(""))
                    || !isQuoteInTranscript(ev.path("quote").asText(""), normalizedTranscript)) {
                it.remove();
                removed++;
            }
        }
        if (removed > 0) {
            // Only the count: the quote is a piece of the learner's speech
            log.warn("Removed {} untrustworthy evidence item(s) in {}", removed, critKey);
        }
    }

    private SpeakingGradingResult toResult(ObjectNode rootNode, String part, BigDecimal overallBand,
                                           boolean outOfCalibration, int latencyMs) {
        Map<String, Object> feedbackMap = objectMapper.convertValue(rootNode, new TypeReference<Map<String, Object>>() {});

        List<SpeakingGradingResult.CriterionResult> criteriaResults = new ArrayList<>();
        for (String critKey : CRITERIA) {
            JsonNode crit = rootNode.path("criteria").path(critKey);
            List<SpeakingGradingResult.EvidenceResult> evidenceList = new ArrayList<>();
            for (JsonNode ev : crit.path("evidence")) {
                evidenceList.add(SpeakingGradingResult.EvidenceResult.builder()
                        .quote(ev.path("quote").asText(""))
                        .comment(ev.path("suggestion").asText(""))
                        .errorType(ev.path("error_type").asText(""))
                        .build());
            }
            criteriaResults.add(SpeakingGradingResult.CriterionResult.builder()
                    .criterionId(critKey)
                    .band(BigDecimal.valueOf(crit.path("band").asInt()))
                    .feedback(crit.path("comment").asText(""))
                    .evidence(evidenceList)
                    .build());
        }

        List<String> improvements = new ArrayList<>();
        rootNode.path("improvements").forEach(imp -> improvements.add(imp.asText()));

        return SpeakingGradingResult.builder()
                .part(part)
                .overallBand(overallBand)
                .outOfCalibrationRange(outOfCalibration)
                .criteria(criteriaResults)
                .summary(rootNode.path("summary").asText(""))
                .improvements(improvements)
                .feedbackMap(feedbackMap)
                .rawJson(rootNode)
                .latencyMs(latencyMs)
                .promptVersion(PROMPT_VERSION)
                .build();
    }

    /** Mean of the 4 criterion bands rounded to the nearest 0.5 (6.25 -> 6.5, 6.75 -> 7.0). */
    private static BigDecimal overallBandFromSum(BigDecimal bandSum) {
        BigDecimal mean = bandSum.divide(BigDecimal.valueOf(CRITERIA.size()), 4, RoundingMode.HALF_UP);
        return mean.multiply(BigDecimal.valueOf(2))
                .setScale(0, RoundingMode.HALF_UP)
                .divide(BigDecimal.valueOf(2), 1, RoundingMode.HALF_UP);
    }

    /** The calibrated range is band 4-8 (ontology v0, section 2.1). */
    private static boolean isOutOfCalibration(BigDecimal overallBand) {
        return overallBand.compareTo(BigDecimal.valueOf(4.0)) < 0
                || overallBand.compareTo(BigDecimal.valueOf(8.0)) > 0;
    }

    /**
     * Sets overall_band and out_of_calibration_range from the criterion bands. Does nothing when a band is missing
     * or not an integer, so the schema validation still reports that problem.
     */
    private void applyDerivedBands(ObjectNode rootNode) {
        BigDecimal bandSum = BigDecimal.ZERO;
        for (String critKey : CRITERIA) {
            JsonNode band = rootNode.path("criteria").path(critKey).path("band");
            if (!band.isIntegralNumber()) {
                return;
            }
            bandSum = bandSum.add(BigDecimal.valueOf(band.asInt()));
        }
        BigDecimal overallBand = overallBandFromSum(bandSum);
        rootNode.put("overall_band", overallBand.doubleValue());
        rootNode.put("out_of_calibration_range", isOutOfCalibration(overallBand));
    }

    /** The schema allows at most 5 improvements; an extra one is not worth a retry. */
    private void trimImprovements(ObjectNode rootNode) {
        if (rootNode.path("improvements") instanceof ArrayNode improvements) {
            while (improvements.size() > MAX_IMPROVEMENTS) {
                improvements.remove(improvements.size() - 1);
            }
        }
    }

    private void validateAgainstSchema(JsonNode rootNode) {
        int errors = jsonSchema.validate(rootNode).size();
        if (errors > 0) {
            log.warn("Speaking feedback violates the schema ({} errors)", errors);
            throw new SpeakingGradingException("SCHEMA_VALIDATION_ERROR", "Feedback violates the schema");
        }
    }

    private boolean isQuoteInTranscript(String quote, String normalizedTranscript) {
        String normQuote = normalizeForComparison(quote);
        // Padded with spaces so that a quote can only match whole words
        return !normQuote.isBlank() && normalizedTranscript.contains(" " + normQuote + " ");
    }

    /**
     * The transcript comes from a speech recogniser, which punctuates it its own way, and the LLM often copies a
     * quote without the commas. So case, punctuation and spacing are ignored when a quote is looked up.
     */
    static String normalizeForComparison(String text) {
        if (text == null) {
            return "";
        }
        String unified = text.replace('’', '\'').replace('‘', '\'');
        return NON_WORD_PATTERN.matcher(unified).replaceAll(" ").trim().toLowerCase(Locale.ROOT);
    }

    private String extractJson(String text) {
        String trimmed = text.trim();
        Matcher matcher = CODE_BLOCK_PATTERN.matcher(trimmed);
        return matcher.find() ? matcher.group(1).trim() : trimmed;
    }
}
