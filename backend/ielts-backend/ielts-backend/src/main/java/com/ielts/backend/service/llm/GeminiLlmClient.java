package com.ielts.backend.service.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.backend.config.LlmConfig;
import com.ielts.backend.exception.LlmTimeoutException;
import com.ielts.backend.exception.LlmUnavailableException;
import com.ielts.backend.exception.WritingGradingException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Gemini implementation of {@link LlmClient} using Google Generative Language REST API.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.llm.provider", havingValue = "gemini", matchIfMissing = true)
public class GeminiLlmClient implements LlmClient {

    private static final String GEMINI_API_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private final LlmConfig config;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public GeminiLlmClient(LlmConfig config, ObjectMapper objectMapper, RestClient.Builder restClientBuilder) {
        this.config = config;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        int timeoutSec = config.getTimeoutSeconds() != null ? config.getTimeoutSeconds() : 30;
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSec));

        this.restClient = restClientBuilder.requestFactory(requestFactory).build();
    }

    @Autowired
    public GeminiLlmClient(LlmConfig config, ObjectMapper objectMapper) {
        this(config, objectMapper, RestClient.builder());
    }

    @Override
    public String chat(String prompt) {
        return chat(null, prompt);
    }

    @Override
    public String chat(String systemInstruction, String userPrompt) {
        if (config.getApiKey() == null || config.getApiKey().isBlank()) {
            throw new LlmUnavailableException("Gemini API key is not configured (check GEMINI_API_KEY environment variable)");
        }

        String model = getModelName();
        String url = String.format(GEMINI_API_URL_TEMPLATE, model, config.getApiKey());

        Map<String, Object> requestPayload = new HashMap<>();

        if (systemInstruction != null && !systemInstruction.isBlank()) {
            requestPayload.put("systemInstruction", Map.of(
                    "parts", List.of(Map.of("text", systemInstruction))
            ));
        }

        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userPrompt))
        ));
        requestPayload.put("contents", contents);

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", config.getTemperature() != null ? config.getTemperature() : 0.3);
        generationConfig.put("maxOutputTokens", config.getMaxTokens() != null ? config.getMaxTokens() : 8192);
        generationConfig.put("responseMimeType", "application/json");

        if (config.getThinkingBudget() != null) {
            generationConfig.put("thinkingConfig", Map.of("thinkingBudget", config.getThinkingBudget()));
        } else if (model.contains("2.5") || model.contains("thinking")) {
            generationConfig.put("thinkingConfig", Map.of("thinkingBudget", 1024));
        }

        requestPayload.put("generationConfig", generationConfig);

        try {
            log.debug("Calling Gemini API with model: {}", model);
            String responseBody = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestPayload)
                    .retrieve()
                    .body(String.class);

            return extractCandidateText(responseBody);
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden ex) {
            log.error("Gemini API authentication failed: {}", ex.getMessage());
            throw new LlmUnavailableException("Gemini API key is invalid or unauthorized", ex);
        } catch (HttpClientErrorException | HttpServerErrorException ex) {
            log.error("Gemini API error ({}): {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new LlmUnavailableException("Gemini API error: " + ex.getStatusCode(), ex);
        } catch (ResourceAccessException ex) {
            log.error("Gemini API connection error: {}", ex.getMessage());
            if (ex.getCause() instanceof java.net.SocketTimeoutException
                    || ex.getCause() instanceof java.util.concurrent.TimeoutException
                    || (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("timeout"))) {
                throw new LlmTimeoutException("Gemini API request timed out after " + config.getTimeoutSeconds() + "s", ex);
            }
            throw new LlmUnavailableException("Cannot connect to Gemini API: " + ex.getMessage(), ex);
        } catch (Exception ex) {
            if (ex instanceof WritingGradingException || ex instanceof LlmTimeoutException || ex instanceof LlmUnavailableException) {
                throw ex;
            }
            log.error("Unexpected error calling Gemini API", ex);
            throw new WritingGradingException("LLM_COMMUNICATION_ERROR", "Unexpected error communicating with Gemini API", ex);
        }
    }

    private String extractCandidateText(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            throw new WritingGradingException("LLM_EMPTY_RESPONSE", "Gemini returned empty response body");
        }

        try {
            JsonNode rootNode = objectMapper.readTree(responseBody);
            JsonNode candidates = rootNode.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                JsonNode promptFeedback = rootNode.path("promptFeedback");
                if (promptFeedback.has("blockReason")) {
                    throw new WritingGradingException("PROMPT_BLOCKED",
                            "Prompt was blocked by Gemini: " + promptFeedback.path("blockReason").asText());
                }
                throw new WritingGradingException("LLM_EMPTY_RESPONSE", "No candidates returned by Gemini");
            }

            JsonNode candidate = candidates.get(0);
            String finishReason = candidate.path("finishReason").asText("");
            if ("MAX_TOKENS".equalsIgnoreCase(finishReason)) {
                log.warn("Gemini output was truncated because maxOutputTokens was reached (finishReason=MAX_TOKENS).");
            }

            JsonNode parts = candidate.path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                throw new WritingGradingException("LLM_EMPTY_RESPONSE", "No parts returned in Gemini candidate");
            }

            String text = parts.get(0).path("text").asText();
            if (text == null || text.isBlank()) {
                throw new WritingGradingException("LLM_EMPTY_RESPONSE", "Empty text part returned by Gemini");
            }
            return text;
        } catch (WritingGradingException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", responseBody, e);
            throw new WritingGradingException("LLM_MALFORMED_RESPONSE", "Failed to parse Gemini response envelope", e);
        }
    }

    @Override
    public String getModelName() {
        return config.getModel() != null && !config.getModel().isBlank()
                ? config.getModel()
                : "gemini-2.5-flash";
    }
}
