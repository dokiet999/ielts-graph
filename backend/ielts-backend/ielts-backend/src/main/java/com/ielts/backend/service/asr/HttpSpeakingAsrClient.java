package com.ielts.backend.service.asr;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.backend.exception.AsrTimeoutException;
import com.ielts.backend.exception.AsrUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.nio.file.Path;
import java.time.Duration;
import java.util.concurrent.TimeoutException;

/**
 * HTTP implementation of {@link SpeakingAsrClient} that calls the Python FastAPI Whisper ASR service.
 */
@Slf4j
@Component
public class HttpSpeakingAsrClient implements SpeakingAsrClient {

    private final String asrEndpointUrl;
    private final int timeoutSeconds;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public HttpSpeakingAsrClient(
            @Value("${app.asr.url:http://localhost:8000/asr}") String asrEndpointUrl,
            @Value("${app.asr.timeout-seconds:60}") int timeoutSeconds,
            ObjectMapper objectMapper,
            RestClient.Builder restClientBuilder) {
        this.asrEndpointUrl = asrEndpointUrl;
        this.timeoutSeconds = timeoutSeconds;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds > 0 ? timeoutSeconds : 60));
        this.restClient = restClientBuilder.requestFactory(requestFactory).build();
    }

    @Autowired
    public HttpSpeakingAsrClient(
            @Value("${app.asr.url:http://localhost:8000/asr}") String asrEndpointUrl,
            @Value("${app.asr.timeout-seconds:60}") int timeoutSeconds,
            ObjectMapper objectMapper) {
        this(asrEndpointUrl, timeoutSeconds, objectMapper, RestClient.builder());
    }

    @Override
    public SpeakingAsrResult transcribe(Path audio, String originalFilename) {
        if (asrEndpointUrl == null || asrEndpointUrl.isBlank()) {
            throw new AsrUnavailableException("ASR service URL is not configured");
        }

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("audio", new FileSystemResource(audio));
        if (originalFilename != null && !originalFilename.isBlank()) {
            body.add("filename", originalFilename);
        }

        try {
            log.debug("Calling ASR service at {} for file {}", asrEndpointUrl, audio.getFileName());
            String responseBody = restClient.post()
                    .uri(asrEndpointUrl)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            if (responseBody == null || responseBody.isBlank()) {
                throw new AsrUnavailableException("ASR service returned empty response");
            }
            return objectMapper.readValue(responseBody, SpeakingAsrResult.class);
        } catch (ResourceAccessException ex) {
            log.error("ASR connection error: {}", ex.getMessage());
            if (ex.getCause() instanceof java.net.SocketTimeoutException
                    || ex.getCause() instanceof TimeoutException
                    || (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("timeout"))) {
                throw new AsrTimeoutException("ASR request timed out after " + timeoutSeconds + "s", ex);
            }
            throw new AsrUnavailableException("Cannot connect to ASR service: " + ex.getMessage(), ex);
        } catch (HttpClientErrorException | HttpServerErrorException ex) {
            log.error("ASR HTTP error ({}): {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new AsrUnavailableException("ASR service error: " + ex.getStatusCode(), ex);
        } catch (AsrTimeoutException | AsrUnavailableException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error calling ASR service", ex);
            throw new AsrUnavailableException("Failed to parse ASR service response: " + ex.getMessage(), ex);
        }
    }
}
