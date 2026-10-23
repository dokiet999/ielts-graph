package com.ielts.backend.service.grading;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ielts.backend.exception.SpeakingGradingException;
import com.ielts.backend.service.asr.SpeakingAsrResult;
import com.ielts.backend.service.llm.LlmClient;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
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
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class SpeakingGrader {

    public static final String PROMPT_VERSION = "speaking-v1.0";
    private static final int MAX_RETRIES = 1;

    private static final Pattern CODE_BLOCK_PATTERN = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)\\s*```");
    private static final List<String> SPEAKING_CRITERIA = List.of("CRIT_S_FC", "CRIT_S_LR", "CRIT_S_GRA", "CRIT_S_P");
    private static final Set<String> VALID_PARTS = Set.of("QT_S_PART1", "QT_S_PART2", "QT_S_PART3");

    private static final Map<String, Set<String>> ALLOWED_ERRORS_BY_CRITERION = Map.of(
            "CRIT_S_FC", Set.of("ERR_LONG_PAUSE", "ERR_SELF_CORRECTION", "ERR_SHORT_ANSWER"),
            "CRIT_S_LR", Set.of("ERR_WORD_CHOICE", "ERR_COLLOCATION", "ERR_REPETITION"),
            "CRIT_S_GRA", Set.of("ERR_ARTICLE", "ERR_VERB_TENSE", "ERR_SVA", "ERR_NOUN_NUM", "ERR_PREP", "ERR_SENT_STRUCTURE"),
            "CRIT_S_P", Set.of("ERR_MISPRONOUNCE", "ERR_WORD_STRESS", "ERR_MONOTONE")
    );

    private static final String DEFAULT_SYSTEM_PROMPT = """
            You are an expert IELTS Speaking examiner. Evaluate the learner's spoken answer based on the transcript, speech features, and optional pronunciation scores according to the four official IELTS Speaking criteria (CRIT_S_FC, CRIT_S_LR, CRIT_S_GRA, CRIT_S_P). Return ONLY a valid JSON object matching speaking_feedback.schema.json with learner-facing comments, suggestions, summary, and improvements in Vietnamese.
            """.trim();

    private final LlmClient llmClient;
    private final ObjectMapper objectMapper;

    @Getter
    private String systemPrompt;
    private JsonSchema jsonSchema;

    @PostConstruct
    public void init() {
        loadSystemPrompt();
        loadJsonSchema();
    }

    private void loadSystemPrompt() {
        try {
            ClassPathResource resource = new ClassPathResource("ai/prompts/speaking_v1.system.txt");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    this.systemPrompt = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                    return;
                }
            }
        } catch (Exception e) {
            log.debug("ai/prompts/speaking_v1.system.txt not found on classpath, using default system prompt: {}", e.getMessage());
        }
        this.systemPrompt = DEFAULT_SYSTEM_PROMPT;
    }

    private void loadJsonSchema() {
        try {
            ClassPathResource resource = new ClassPathResource("ai/schema/speaking_feedback.schema.json");
            try (InputStream is = resource.getInputStream()) {
                JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
                this.jsonSchema = factory.getSchema(is);
            }
        } catch (Exception e) {
            log.error("Could not load ai/schema/speaking_feedback.schema.json from classpath", e);
            throw new IllegalStateException("Failed to initialize SpeakingFeedback JSON Schema", e);
        }
    }

    public SpeakingGradingResult grade(String part, String question, SpeakingAsrResult asr) {
        String effectivePart = (part != null && VALID_PARTS.contains(part)) ? part : "QT_S_PART2";
        String transcript = asr != null && asr.getTranscript() != null ? asr.getTranscript() : "";
        String userPrompt = buildUserPrompt(effectivePart, question, asr);

        SpeakingGradingException lastError = null;
        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    log.warn("Retrying LLM speaking grading (attempt {})", attempt + 1);
                }
                long startNanos = System.nanoTime();
                String rawResponse = llmClient.chat(systemPrompt, userPrompt);
                int latencyMs = (int) TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);

                return parseValidateAndPostProcess(rawResponse, effectivePart, transcript, latencyMs);
            } catch (SpeakingGradingException ex) {
                log.warn("Speaking grading attempt {} failed: {} - {}", attempt + 1, ex.getCode(), ex.getMessage());
                lastError = ex;
            }
        }

        throw lastError != null ? lastError : new SpeakingGradingException("LLM_INVALID_RESPONSE", "Speaking grading failed");
    }

    private String buildUserPrompt(String part, String question, SpeakingAsrResult asr) {
        String featuresJson = "{}";
        String pronunciationJson = "null";
        try {
            if (asr != null && asr.getFeatures() != null) {
                featuresJson = objectMapper.writeValueAsString(asr.toFeaturesMap());
            }
            if (asr != null && asr.getPronunciation() != null) {
                pronunciationJson = objectMapper.writeValueAsString(asr.toPronunciationMap());
            }
        } catch (Exception ignored) {
        }
        String transcript = asr != null && asr.getTranscript() != null ? asr.getTranscript() : "";
        return """
                Part: %s

                Question:
                %s

                Speech features:
                %s

                Pronunciation assessment:
                %s

                Transcript:
                <transcript>
                %s
                </transcript>
                """.formatted(
                part,
                question != null ? question : "Answer the IELTS Speaking prompt.",
                featuresJson,
                pronunciationJson,
                transcript
        );
    }

    public SpeakingGradingResult parseValidateAndPostProcess(
            String rawResponse, String expectedPart, String transcript, int latencyMs) {

        if (rawResponse == null || rawResponse.isBlank()) {
            throw new SpeakingGradingException("EMPTY_RESPONSE", "LLM returned empty response");
        }

        String cleanedJson = extractJson(rawResponse);
        JsonNode parsedNode;
        try {
            parsedNode = objectMapper.readTree(cleanedJson);
        } catch (Exception e) {
            log.error("Failed to parse LLM speaking response as JSON: {}", cleanedJson, e);
            throw new SpeakingGradingException("MALFORMED_JSON", "LLM response is not valid JSON: " + e.getMessage(), e);
        }

        if (!parsedNode.isObject()) {
            throw new SpeakingGradingException("MALFORMED_JSON", "Root JSON node must be an object");
        }
        ObjectNode rootNode = (ObjectNode) parsedNode;

        if (expectedPart != null && VALID_PARTS.contains(expectedPart)) {
            rootNode.put("part", expectedPart);
        }

        applyDerivedBands(rootNode);
        validateAgainstSchema(rootNode);

        ObjectNode criteriaObject = (ObjectNode) rootNode.path("criteria");
        BigDecimal bandSum = BigDecimal.ZERO;
        String normalizedTranscript = normalizeForComparison(transcript);

        for (String critKey : SPEAKING_CRITERIA) {
            JsonNode critNode = criteriaObject.path(critKey);
            if (!critNode.isObject()) {
                throw new SpeakingGradingException("MISSING_CRITERION", "Missing required criterion: " + critKey);
            }

            int bandInt = critNode.path("band").asInt();
            bandSum = bandSum.add(BigDecimal.valueOf(bandInt));

            JsonNode evidenceNode = critNode.path("evidence");
            if (evidenceNode.isArray()) {
                ArrayNode evidenceArray = (ArrayNode) evidenceNode;
                Set<String> allowedErrors = ALLOWED_ERRORS_BY_CRITERION.getOrDefault(critKey, Set.of());

                Iterator<JsonNode> it = evidenceArray.elements();
                while (it.hasNext()) {
                    JsonNode ev = it.next();
                    String quote = ev.path("quote").asText("");
                    String errorType = ev.path("error_type").asText("");

                    if (!allowedErrors.contains(errorType)) {
                        log.warn("Removing evidence in {} due to mismatched error_type '{}'", critKey, errorType);
                        it.remove();
                        continue;
                    }

                    if (!isQuoteInTranscript(quote, normalizedTranscript)) {
                        log.warn("Removing hallucinated quote in {}: '{}'", critKey, quote);
                        it.remove();
                    }
                }
            }
        }

        BigDecimal computedOverallBand = overallBandFromSum(bandSum);
        boolean outOfCalibration = isOutOfCalibration(computedOverallBand);

        rootNode.put("overall_band", computedOverallBand.doubleValue());
        rootNode.put("out_of_calibration_range", outOfCalibration);

        validateAgainstSchema(rootNode);

        Map<String, Object> feedbackMap = objectMapper.convertValue(
                rootNode, new TypeReference<Map<String, Object>>() {});

        List<SpeakingGradingResult.CriterionResult> criteriaResults = new ArrayList<>();
        for (String critKey : SPEAKING_CRITERIA) {
            JsonNode critNode = criteriaObject.path(critKey);
            if (critNode.isObject()) {
                double bVal = critNode.path("band").asDouble();
                String comment = critNode.path("comment").asText(critNode.path("feedback").asText(""));
                List<SpeakingGradingResult.EvidenceResult> evidenceList = new ArrayList<>();
                JsonNode evArray = critNode.path("evidence");
                if (evArray.isArray()) {
                    for (JsonNode ev : evArray) {
                        evidenceList.add(SpeakingGradingResult.EvidenceResult.builder()
                                .quote(ev.path("quote").asText(""))
                                .comment(ev.path("comment").asText(ev.path("suggestion").asText("")))
                                .errorType(ev.path("error_type").asText(""))
                                .build());
                    }
                }
                criteriaResults.add(SpeakingGradingResult.CriterionResult.builder()
                        .criterionId(critKey)
                        .band(BigDecimal.valueOf(bVal))
                        .feedback(comment)
                        .evidence(evidenceList)
                        .build());
            }
        }

        List<String> improvementsList = new ArrayList<>();
        JsonNode impNode = rootNode.path("improvements");
        if (impNode.isArray()) {
            for (JsonNode imp : impNode) {
                improvementsList.add(imp.asText());
            }
        }

        String summary = rootNode.path("summary").asText("");
        String partValue = rootNode.path("part").asText(expectedPart != null ? expectedPart : "QT_S_PART2");

        return SpeakingGradingResult.builder()
                .part(partValue)
                .overallBand(computedOverallBand)
                .outOfCalibrationRange(outOfCalibration)
                .criteria(criteriaResults)
                .summary(summary)
                .improvements(improvementsList)
                .feedbackMap(feedbackMap)
                .rawJson(rootNode)
                .latencyMs(latencyMs)
                .promptVersion(PROMPT_VERSION)
                .build();
    }

    private static BigDecimal overallBandFromSum(BigDecimal bandSum) {
        BigDecimal mean = bandSum.divide(BigDecimal.valueOf(4), 4, RoundingMode.HALF_UP);
        return mean.multiply(BigDecimal.valueOf(2))
                .setScale(0, RoundingMode.HALF_UP)
                .divide(BigDecimal.valueOf(2), 1, RoundingMode.HALF_UP);
    }

    private static boolean isOutOfCalibration(BigDecimal overallBand) {
        return overallBand.compareTo(BigDecimal.valueOf(4.0)) < 0
                || overallBand.compareTo(BigDecimal.valueOf(8.0)) > 0;
    }

    private void applyDerivedBands(ObjectNode rootNode) {
        JsonNode criteria = rootNode.path("criteria");
        BigDecimal bandSum = BigDecimal.ZERO;
        for (String critKey : SPEAKING_CRITERIA) {
            JsonNode band = criteria.path(critKey).path("band");
            if (!band.isIntegralNumber()) {
                return;
            }
            bandSum = bandSum.add(BigDecimal.valueOf(band.asInt()));
        }
        BigDecimal overallBand = overallBandFromSum(bandSum);
        rootNode.put("overall_band", overallBand.doubleValue());
        rootNode.put("out_of_calibration_range", isOutOfCalibration(overallBand));
    }

    private void validateAgainstSchema(JsonNode rootNode) {
        if (jsonSchema != null) {
            Set<ValidationMessage> validationMessages = jsonSchema.validate(rootNode);
            if (!validationMessages.isEmpty()) {
                String errors = validationMessages.stream()
                        .map(ValidationMessage::getMessage)
                        .collect(Collectors.joining("; "));
                log.warn("Speaking schema validation failed: {}", errors);
                throw new SpeakingGradingException("SCHEMA_VALIDATION_ERROR", "Feedback violates schema: " + errors);
            }
        }
    }

    private boolean isQuoteInTranscript(String quote, String normalizedTranscript) {
        if (quote == null || quote.isBlank()) {
            return false;
        }
        String normQuote = normalizeForComparison(quote);
        return !normQuote.isBlank() && normalizedTranscript.contains(normQuote);
    }

    private String normalizeForComparison(String text) {
        if (text == null) return "";
        return text
                .replace('’', '\'')
                .replace('‘', '\'')
                .replace('“', '"')
                .replace('”', '"')
                .replaceAll("\\s+", " ")
                .trim()
                .toLowerCase();
    }

    private String extractJson(String text) {
        String trimmed = text.trim();
        Matcher matcher = CODE_BLOCK_PATTERN.matcher(trimmed);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return trimmed;
    }
}
