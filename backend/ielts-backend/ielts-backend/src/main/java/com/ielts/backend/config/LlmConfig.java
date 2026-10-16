package com.ielts.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for LLM integration (Gemini, etc.).
 */
@Configuration
@ConfigurationProperties(prefix = "app.llm")
@Getter
@Setter
public class LlmConfig {

    private String provider = "gemini";
    private String apiKey;
    private String model = "gemini-2.5-flash";
    private Double temperature = 0.3;
    private Integer maxTokens = 8192;
    private Integer timeoutSeconds = 60;
    private Integer thinkingBudget = 1024;
}
