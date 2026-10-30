package com.ielts.backend.service.speaking;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.backend.config.SpeakingAsrConfig;
import com.ielts.backend.exception.SpeakingAsrException;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.io.InputStream;
import java.net.SocketTimeoutException;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;

/**
 * Calls the speech recognition service (Python, Whisper) with one audio file and returns the
 * {@code speaking_asr} result. Timeouts are not retried: a timeout means the service is busy, and a second
 * request would only add load.
 * <p>
 * Nothing from the response body is logged or put in an exception message: it holds the transcript,
 * which is personal data.
 */
@Slf4j
@Component
public class SpeakingAsrClient {

    static final String SAMPLE_RESOURCE = "ai/schema/speaking_asr.sample.json";
    static final String SCHEMA_RESOURCE = "ai/schema/speaking_asr.schema.json";

    private final SpeakingAsrConfig config;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private JsonSchema schema;

    @Autowired
    public SpeakingAsrClient(SpeakingAsrConfig config, ObjectMapper objectMapper) {
        this(config, objectMapper, defaultRestClient(config));
    }

    /** Lets a test supply a RestClient bound to a mock server. */
    SpeakingAsrClient(SpeakingAsrConfig config, ObjectMapper objectMapper, RestClient restClient) {
        this.config = config;
        this.objectMapper = objectMapper;
        this.restClient = restClient;
    }

    private static RestClient defaultRestClient(SpeakingAsrConfig config) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        int timeoutSec = config.getTimeoutSeconds() != null ? config.getTimeoutSeconds() : 180;
        factory.setReadTimeout(Duration.ofSeconds(timeoutSec));
        return RestClient.builder().requestFactory(factory).build();
    }

    @PostConstruct
    public void init() {
        try (InputStream is = new ClassPathResource(SCHEMA_RESOURCE).getInputStream()) {
            this.schema = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012).getSchema(is);
        } catch (Exception e) {
            log.error("Could not load {} from classpath", SCHEMA_RESOURCE, e);
            throw new IllegalStateException("Failed to initialize the speaking_asr JSON Schema", e);
        }
    }

    /**
     * @param audio            the audio file on disk
     * @param originalFilename name sent to the service; its extension tells the service the audio format
     * @throws SpeakingAsrException ASR_TIMEOUT, ASR_UNAVAILABLE or ASR_BAD_RESPONSE
     */
    public SpeakingAsrResult transcribe(Path audio, String originalFilename) {
        if (config.isFake()) {
            return fakeResult();
        }

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add(config.getFileField(), new FileSystemResource(audio) {
            @Override
            public String getFilename() {
                return originalFilename;
            }
        });

        String json;
        try {
            json = restClient.post()
                    .uri(config.getUrl())
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(String.class);
        } catch (ResourceAccessException e) {
            if (isTimeout(e)) {
                throw new SpeakingAsrException("ASR_TIMEOUT", "The speech recognition service timed out", e);
            }
            throw new SpeakingAsrException("ASR_UNAVAILABLE", "The speech recognition service is unreachable", e);
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            log.warn("Speech recognition service answered HTTP {}", status);
            if (status == 503) {
                throw new SpeakingAsrException("ASR_UNAVAILABLE", "The speech recognition service is unavailable");
            }
            throw new SpeakingAsrException("ASR_BAD_RESPONSE", "The speech recognition service returned an error");
        }
        return parseAndValidate(json);
    }

    /** Parses a response and checks it against speaking_asr.schema.json. Package-private for tests. */
    SpeakingAsrResult parseAndValidate(String json) {
        if (json == null || json.isBlank()) {
            throw new SpeakingAsrException("ASR_BAD_RESPONSE", "The speech recognition service returned an empty response");
        }
        JsonNode node;
        try {
            node = objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            // The Jackson message quotes part of the input, so it is dropped
            throw new SpeakingAsrException("ASR_BAD_RESPONSE", "The speech recognition response is not valid JSON");
        }
        int errors = schema.validate(node).size();
        if (errors > 0) {
            log.warn("Speech recognition response violates the schema ({} errors)", errors);
            throw new SpeakingAsrException("ASR_BAD_RESPONSE", "The speech recognition response does not match the contract");
        }
        try {
            return objectMapper.treeToValue(node, SpeakingAsrResult.class);
        } catch (JsonProcessingException e) {
            throw new SpeakingAsrException("ASR_BAD_RESPONSE", "The speech recognition response could not be read");
        }
    }

    private SpeakingAsrResult fakeResult() {
        try (InputStream is = new ClassPathResource(SAMPLE_RESOURCE).getInputStream()) {
            return parseAndValidate(new String(is.readAllBytes(), StandardCharsets.UTF_8));
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Fake mode is on but " + SAMPLE_RESOURCE + " cannot be read", e);
        }
    }

    private static boolean isTimeout(Throwable t) {
        for (; t != null; t = t.getCause()) {
            if (t instanceof SocketTimeoutException || t instanceof HttpTimeoutException) {
                return true;
            }
        }
        return false;
    }
}
