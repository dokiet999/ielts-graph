package com.ielts.backend.service.grading;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ielts.backend.exception.WritingGradingException;
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
public class WritingEssayGrader {

    public static final String PROMPT_VERSION = "writing-v1.0";
    private static final int MAX_RETRIES = 1;
    private static final int TASK_2_MIN_WORDS = 250;
    private static final int MAX_IMPROVEMENTS = 5;
    private static final String UNDER_LENGTH_WARNING = "Bài viết chưa đạt độ dài tối thiểu 250 từ của IELTS Writing Task 2.";

    private static final Pattern CODE_BLOCK_PATTERN = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)\\s*```");
    private static final List<String> TASK_2_CRITERIA = List.of("CRIT_W_TR", "CRIT_W_CC", "CRIT_W_LR", "CRIT_W_GRA");

    private static final Map<String, Set<String>> ALLOWED_ERRORS_BY_CRITERION = Map.of(
            "CRIT_W_TR", Set.of("ERR_OFF_TOPIC", "ERR_PARTIAL_ANSWER", "ERR_UNDER_LENGTH", "ERR_UNCLEAR_POSITION", "ERR_UNDERDEVELOPED"),
            "CRIT_W_CC", Set.of("ERR_LINKER_MISUSE", "ERR_LINKER_OVERUSE", "ERR_NO_PARAGRAPH", "ERR_UNCLEAR_REFERENCE"),
            "CRIT_W_LR", Set.of("ERR_WORD_CHOICE", "ERR_COLLOCATION", "ERR_REPETITION", "ERR_SPELLING", "ERR_WORD_FORM"),
            "CRIT_W_GRA", Set.of("ERR_ARTICLE", "ERR_VERB_TENSE", "ERR_SVA", "ERR_NOUN_NUM", "ERR_PREP", "ERR_SENT_STRUCTURE", "ERR_PUNCT")
    );

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
            ClassPathResource resource = new ClassPathResource("ai/prompts/writing_v1.system.txt");
            try (InputStream is = resource.getInputStream()) {
                this.systemPrompt = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            // No fallback prompt: grading with a stand-in prompt would silently give unreliable bands
            log.error("Could not load ai/prompts/writing_v1.system.txt from classpath", e);
            throw new IllegalStateException("Failed to load the Writing system prompt", e);
        }
    }

    private void loadJsonSchema() {
        try {
            ClassPathResource resource = new ClassPathResource("ai/schema/writing_feedback.schema.json");
            try (InputStream is = resource.getInputStream()) {
                JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
                this.jsonSchema = factory.getSchema(is);
            }
        } catch (Exception e) {
            log.error("Could not load ai/schema/writing_feedback.schema.json from classpath", e);
            throw new IllegalStateException("Failed to initialize WritingFeedback JSON Schema", e);
        }
    }

    public WritingGradingResult grade(String questionPrompt, String essayText) {
        return grade("QT_W2_OPINION", questionPrompt, essayText, countWords(essayText));
    }

    public static int countWords(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return text.trim().split("\\s+").length;
    }

    /**
     * Chấm bài Writing Task 2 với tối đa 1 lần retry nếu lỗi parse/schema.
     * Không retry nếu LlmClient ném LlmTimeoutException hoặc LlmUnavailableException.
     */
    public WritingGradingResult grade(String expectedTask, String questionPrompt, String essayText, int wordCount) {
        String effectiveTask = (expectedTask != null && expectedTask.startsWith("QT_W2_"))
                ? expectedTask
                : "QT_W2_OPINION";
        if (!effectiveTask.equals(expectedTask)) {
            log.warn("Exercise has no valid Task 2 type (content.task = {}), defaulting to {}", expectedTask, effectiveTask);
        }
        String userPrompt = buildUserPrompt(effectiveTask, questionPrompt, essayText, wordCount);

        WritingGradingException lastError = null;
        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    log.warn("Retrying LLM essay grading (attempt {})", attempt + 1);
                }
                long startNanos = System.nanoTime();
                String rawResponse = llmClient.chat(systemPrompt, userPrompt);
                int latencyMs = (int) TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);

                return parseValidateAndPostProcess(rawResponse, effectiveTask, essayText, wordCount, latencyMs);
            } catch (WritingGradingException ex) {
                log.warn("Grading attempt {} failed: {} - {}", attempt + 1, ex.getCode(), ex.getMessage());
                lastError = ex;
            }
        }

        throw lastError != null ? lastError : new WritingGradingException("LLM_INVALID_RESPONSE", "Essay grading failed");
    }

    private String buildUserPrompt(String task, String questionPrompt, String essayText, int wordCount) {
        return """
                Task: %s
                Word count: %d

                Question:
                %s

                Essay:
                <essay>
                %s
                </essay>
                """.formatted(
                task,
                wordCount,
                questionPrompt != null ? questionPrompt : "Write an IELTS Task 2 Essay.",
                essayText
        );
    }

    public WritingGradingResult parseAndValidate(String rawResponse, String essayText) {
        return parseValidateAndPostProcess(rawResponse, "QT_W2_OPINION", essayText, countWords(essayText), 0);
    }

    public WritingGradingResult parseValidateAndPostProcess(
            String rawResponse, String expectedTask, String essayText, int wordCount, int latencyMs) {

        if (rawResponse == null || rawResponse.isBlank()) {
            throw new WritingGradingException("EMPTY_RESPONSE", "LLM returned empty response");
        }

        String cleanedJson = extractJson(rawResponse);
        JsonNode parsedNode;
        try {
            parsedNode = objectMapper.readTree(cleanedJson);
        } catch (Exception e) {
            log.error("Failed to parse LLM response as JSON: {}", cleanedJson, e);
            throw new WritingGradingException("MALFORMED_JSON", "LLM response is not valid JSON: " + e.getMessage(), e);
        }

        if (!parsedNode.isObject()) {
            throw new WritingGradingException("MALFORMED_JSON", "Root JSON node must be an object");
        }
        ObjectNode rootNode = (ObjectNode) parsedNode;

        // 1. Ghi đè task từ đề bài trước khi validate (phòng trường hợp LLM điền sai mã task)
        if (expectedTask != null && !expectedTask.isBlank()) {
            rootNode.put("task", expectedTask);
        }

        // 1b. overall_band and out_of_calibration_range are derived from the 4 criterion bands, so set them
        //     before validating: a wrong or missing value from the LLM must not fail the whole grading
        applyDerivedBands(rootNode);

        // 2. Validate JSON Schema Draft 2020-12
        validateAgainstSchema(rootNode);

        // 3. Duyệt 4 tiêu chí để lọc evidence (quote & error_type) và tính tổng band
        ObjectNode criteriaObject = (ObjectNode) rootNode.path("criteria");
        BigDecimal bandSum = BigDecimal.ZERO;
        String normalizedEssay = normalizeForComparison(essayText);

        for (String critKey : TASK_2_CRITERIA) {
            JsonNode critNode = criteriaObject.path(critKey);
            if (!critNode.isObject()) {
                throw new WritingGradingException("MISSING_CRITERION", "Missing required criterion: " + critKey);
            }

            int bandInt = critNode.path("band").asInt();
            bandSum = bandSum.add(BigDecimal.valueOf(bandInt));

            // Lọc mảng evidence
            JsonNode evidenceNode = critNode.path("evidence");
            if (evidenceNode.isArray()) {
                ArrayNode evidenceArray = (ArrayNode) evidenceNode;
                Set<String> allowedErrors = ALLOWED_ERRORS_BY_CRITERION.getOrDefault(critKey, Set.of());

                Iterator<JsonNode> it = evidenceArray.elements();
                while (it.hasNext()) {
                    JsonNode ev = it.next();
                    String quote = ev.path("quote").asText("");
                    String errorType = ev.path("error_type").asText("");

                    // 3a. Kiểm tra error_type có thuộc đúng tiêu chí không
                    if (!allowedErrors.contains(errorType)) {
                        log.warn("Removing evidence in {} due to mismatched error_type '{}'", critKey, errorType);
                        it.remove();
                        continue;
                    }

                    // 3b. Kiểm tra quote có thực sự nằm trong bài viết không (nếu không thì xóa, KHÔNG throw exception)
                    if (!isQuoteInEssay(quote, normalizedEssay)) {
                        log.warn("Removing hallucinated quote in {}: '{}'", critKey, quote);
                        it.remove();
                    }
                }
            }
        }

        // 4. Tính lại overall_band theo chuẩn IELTS: trung bình 4 tiêu chí làm tròn tới 0.5 gần nhất
        BigDecimal computedOverallBand = overallBandFromSum(bandSum);
        boolean outOfCalibration = isOutOfCalibration(computedOverallBand);

        rootNode.put("overall_band", computedOverallBand.doubleValue());
        rootNode.put("out_of_calibration_range", outOfCalibration);

        // 5. Nếu bài viết < 250 từ, chèn cảnh báo vào đầu mảng improvements và giữ tối đa 5 phần tử
        if (wordCount > 0 && wordCount < TASK_2_MIN_WORDS && rootNode.path("improvements").isArray()) {
            ArrayNode improvementsArray = (ArrayNode) rootNode.path("improvements");
            boolean alreadyWarned = false;
            for (JsonNode imp : improvementsArray) {
                if (imp.asText().contains("250")) {
                    alreadyWarned = true;
                    break;
                }
            }
            if (!alreadyWarned) {
                improvementsArray.insert(0, UNDER_LENGTH_WARNING);
                while (improvementsArray.size() > MAX_IMPROVEMENTS) {
                    improvementsArray.remove(improvementsArray.size() - 1);
                }
            }
        }

        // 6. Validate lại lần cuối để chắc chắn dữ liệu sau hậu xử lý chuẩn 100% với Schema
        validateAgainstSchema(rootNode);

        Map<String, Object> feedbackMap = objectMapper.convertValue(
                rootNode, new TypeReference<Map<String, Object>>() {});

        List<WritingGradingResult.CriterionResult> criteriaResults = new java.util.ArrayList<>();
        for (String critKey : TASK_2_CRITERIA) {
            JsonNode critNode = criteriaObject.path(critKey);
            if (critNode.isObject()) {
                double bVal = critNode.path("band").asDouble();
                String comment = critNode.path("comment").asText(critNode.path("feedback").asText(""));
                List<WritingGradingResult.EvidenceResult> evidenceList = new java.util.ArrayList<>();
                JsonNode evArray = critNode.path("evidence");
                if (evArray.isArray()) {
                    for (JsonNode ev : evArray) {
                        evidenceList.add(WritingGradingResult.EvidenceResult.builder()
                                .quote(ev.path("quote").asText(""))
                                .comment(ev.path("comment").asText(ev.path("suggestion").asText("")))
                                .errorType(ev.path("error_type").asText(""))
                                .build());
                    }
                }
                criteriaResults.add(WritingGradingResult.CriterionResult.builder()
                        .criterionId(critKey)
                        .band(BigDecimal.valueOf(bVal))
                        .feedback(comment)
                        .evidence(evidenceList)
                        .build());
            }
        }

        List<String> improvementsList = new java.util.ArrayList<>();
        JsonNode impNode = rootNode.path("improvements");
        if (impNode.isArray()) {
            for (JsonNode imp : impNode) {
                improvementsList.add(imp.asText());
            }
        }

        String summary = rootNode.path("summary").asText("");
        String taskType = rootNode.path("task").asText(expectedTask != null ? expectedTask : "QT_W2_OPINION");

        return WritingGradingResult.builder()
                .taskType(taskType)
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

    /** Mean of the 4 criterion bands rounded to the nearest 0.5 (6.25 -> 6.5, 6.75 -> 7.0). */
    private static BigDecimal overallBandFromSum(BigDecimal bandSum) {
        BigDecimal mean = bandSum.divide(BigDecimal.valueOf(4), 4, RoundingMode.HALF_UP);
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
     * Sets overall_band and out_of_calibration_range from the criterion bands. Does nothing when a band is
     * missing or not an integer, so the schema validation still reports that problem.
     */
    private void applyDerivedBands(ObjectNode rootNode) {
        JsonNode criteria = rootNode.path("criteria");
        BigDecimal bandSum = BigDecimal.ZERO;
        for (String critKey : TASK_2_CRITERIA) {
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
                log.warn("Schema validation failed: {}", errors);
                throw new WritingGradingException("SCHEMA_VALIDATION_ERROR", "Feedback violates schema: " + errors);
            }
        }
    }

    private boolean isQuoteInEssay(String quote, String normalizedEssay) {
        if (quote == null || quote.isBlank()) {
            return false;
        }
        String normQuote = normalizeForComparison(quote);
        return !normQuote.isBlank() && normalizedEssay.contains(normQuote);
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