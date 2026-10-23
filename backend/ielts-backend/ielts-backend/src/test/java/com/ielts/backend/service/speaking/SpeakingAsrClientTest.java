package com.ielts.backend.service.speaking;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.backend.config.SpeakingAsrConfig;
import com.ielts.backend.exception.SpeakingAsrException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.InputStream;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SpeakingAsrClientTest {

    private static final String URL = "http://asr.test/transcribe";

    @TempDir
    Path tempDir;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private SpeakingAsrConfig config;
    private MockRestServiceServer server;
    private SpeakingAsrClient client;
    private Path audio;
    private String sampleJson;

    @BeforeEach
    void setUp() throws Exception {
        config = new SpeakingAsrConfig();
        config.setUrl(URL);

        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new SpeakingAsrClient(config, objectMapper, builder.build());
        client.init();

        audio = tempDir.resolve("answer.webm");
        Files.write(audio, new byte[]{1, 2, 3, 4});
        sampleJson = read(SpeakingAsrClient.SAMPLE_RESOURCE);
    }

    private static String read(String classpath) throws Exception {
        try (InputStream is = new ClassPathResource(classpath).getInputStream()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static void assertCode(Throwable thrown, String code) {
        assertThat(thrown).isInstanceOf(SpeakingAsrException.class);
        assertThat(((SpeakingAsrException) thrown).getCode()).isEqualTo(code);
    }

    // ---- success ----

    @Test
    void transcribe_validResponse_isMappedFromSnakeCase() {
        server.expect(requestTo(URL)).andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(sampleJson, MediaType.APPLICATION_JSON));

        SpeakingAsrResult result = client.transcribe(audio, "answer.webm");

        assertThat(result.asrModel()).isEqualTo("whisper-small");
        assertThat(result.language()).isEqualTo("en");
        assertThat(result.transcript()).startsWith("Um, I want to talk");
        assertThat(result.features().wordCount()).isEqualTo(79);
        assertThat(result.features().speechRateWpm()).isEqualTo(123.4);
        assertThat(result.features().longestPauseSec()).isEqualTo(1.6);
        assertThat(result.pronunciation().accuracy()).isEqualTo(78.5);
        assertThat(result.pronunciation().prosody()).isEqualTo(68.0);
        server.verify();
    }

    @Test
    void transcribe_sendsTheAudioInTheFieldNamedAudio_asTheAsrServiceExpects() {
        // ai/asr_service/app.py reads the multipart field "audio"; any other name gets 400 BAD_REQUEST
        server.expect(requestTo(URL))
                .andExpect(content().contentTypeCompatibleWith(MediaType.MULTIPART_FORM_DATA))
                .andExpect(request -> {
                    String body = request.getBody().toString();
                    assertThat(body).contains("name=\"audio\"").contains("filename=\"answer.webm\"");
                })
                .andRespond(withSuccess(sampleJson, MediaType.APPLICATION_JSON));

        client.transcribe(audio, "answer.webm");

        server.verify();
    }

    @Test
    void transcribe_fieldNameCanBeChangedInTheConfiguration() {
        config.setFileField("file");
        server.expect(requestTo(URL))
                .andExpect(request -> assertThat(request.getBody().toString()).contains("name=\"file\""))
                .andRespond(withSuccess(sampleJson, MediaType.APPLICATION_JSON));

        client.transcribe(audio, "answer.webm");

        server.verify();
    }

    @Test
    void transcribe_nullPronunciation_isAccepted() throws Exception {
        var node = (com.fasterxml.jackson.databind.node.ObjectNode) objectMapper.readTree(sampleJson);
        node.putNull("pronunciation");
        server.expect(requestTo(URL)).andRespond(withSuccess(node.toString(), MediaType.APPLICATION_JSON));

        assertThat(client.transcribe(audio, "answer.webm").pronunciation()).isNull();
    }

    @Test
    void transcribe_nullProsody_isAccepted() throws Exception {
        var node = (com.fasterxml.jackson.databind.node.ObjectNode) objectMapper.readTree(sampleJson);
        ((com.fasterxml.jackson.databind.node.ObjectNode) node.path("pronunciation")).putNull("prosody");
        server.expect(requestTo(URL)).andRespond(withSuccess(node.toString(), MediaType.APPLICATION_JSON));

        assertThat(client.transcribe(audio, "answer.webm").pronunciation().prosody()).isNull();
    }

    // ---- failures of the service ----

    @Test
    void transcribe_timeout_throwsAsrTimeoutAndDoesNotRetry() {
        server.expect(requestTo(URL)).andRespond(request -> {
            throw new SocketTimeoutException("Read timed out");
        });

        assertThatThrownBy(() -> client.transcribe(audio, "answer.webm"))
                .satisfies(t -> assertCode(t, "ASR_TIMEOUT"));
        // one request only: MockRestServiceServer fails on a second one
        server.verify();
    }

    @Test
    void transcribe_connectionRefused_throwsAsrUnavailable() {
        server.expect(requestTo(URL)).andRespond(request -> {
            throw new ConnectException("Connection refused");
        });

        assertThatThrownBy(() -> client.transcribe(audio, "answer.webm"))
                .satisfies(t -> assertCode(t, "ASR_UNAVAILABLE"));
    }

    @Test
    void transcribe_serverError500_throwsBadResponse() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"detail\":\"whisper crashed\"}").contentType(MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.transcribe(audio, "answer.webm"))
                .satisfies(t -> assertCode(t, "ASR_BAD_RESPONSE"));
    }

    @Test
    void transcribe_serviceUnavailable503_throwsAsrUnavailable() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> client.transcribe(audio, "answer.webm"))
                .satisfies(t -> assertCode(t, "ASR_UNAVAILABLE"));
    }

    @Test
    void transcribe_clientError422_throwsBadResponse() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY));

        assertThatThrownBy(() -> client.transcribe(audio, "answer.webm"))
                .satisfies(t -> assertCode(t, "ASR_BAD_RESPONSE"));
    }

    // ---- bad responses ----

    @Test
    void transcribe_malformedJson_throwsBadResponseWithoutLeakingTheBody() {
        server.expect(requestTo(URL)).andRespond(withSuccess("{ secret-word transcript", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.transcribe(audio, "answer.webm"))
                .satisfies(t -> assertCode(t, "ASR_BAD_RESPONSE"))
                .hasMessageNotContaining("secret-word");
    }

    @Test
    void transcribe_emptyBody_throwsBadResponse() {
        server.expect(requestTo(URL)).andRespond(withSuccess("", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.transcribe(audio, "answer.webm"))
                .satisfies(t -> assertCode(t, "ASR_BAD_RESPONSE"));
    }

    @Test
    void transcribe_missingField_throwsBadResponse() throws Exception {
        var node = (com.fasterxml.jackson.databind.node.ObjectNode) objectMapper.readTree(sampleJson);
        ((com.fasterxml.jackson.databind.node.ObjectNode) node.path("features")).remove("pause_count");
        server.expect(requestTo(URL)).andRespond(withSuccess(node.toString(), MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.transcribe(audio, "answer.webm"))
                .satisfies(t -> assertCode(t, "ASR_BAD_RESPONSE"));
    }

    @Test
    void transcribe_unknownField_throwsBadResponse() throws Exception {
        var node = (com.fasterxml.jackson.databind.node.ObjectNode) objectMapper.readTree(sampleJson);
        node.put("words", "extra");
        server.expect(requestTo(URL)).andRespond(withSuccess(node.toString(), MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.transcribe(audio, "answer.webm"))
                .satisfies(t -> assertCode(t, "ASR_BAD_RESPONSE"));
    }

    @Test
    void transcribe_negativeDuration_throwsBadResponse() throws Exception {
        var node = (com.fasterxml.jackson.databind.node.ObjectNode) objectMapper.readTree(sampleJson);
        ((com.fasterxml.jackson.databind.node.ObjectNode) node.path("features")).put("duration_sec", -1);
        server.expect(requestTo(URL)).andRespond(withSuccess(node.toString(), MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.transcribe(audio, "answer.webm"))
                .satisfies(t -> assertCode(t, "ASR_BAD_RESPONSE"));
    }

    @Test
    void transcribe_emptyTranscript_isAValidResponse() throws Exception {
        // "no speech detected" is for the caller to judge, not an error of the service
        var node = (com.fasterxml.jackson.databind.node.ObjectNode) objectMapper.readTree(sampleJson);
        node.put("transcript", "");
        server.expect(requestTo(URL)).andRespond(withSuccess(node.toString(), MediaType.APPLICATION_JSON));

        assertThat(client.transcribe(audio, "answer.webm").transcript()).isEmpty();
    }

    // ---- fake mode ----

    @Test
    void transcribe_fakeMode_returnsTheSampleWithoutAnyRequest() {
        config.setFake(true);

        SpeakingAsrResult result = client.transcribe(audio, "answer.webm");

        assertThat(result.transcript()).startsWith("Um, I want to talk");
        assertThat(result.pronunciation()).isNotNull();
        // no expectation was set, so any request would have failed the call
        server.verify();
    }

    @Test
    void transcribe_fakeMode_doesNotNeedTheAudioFile() {
        config.setFake(true);

        assertThat(client.transcribe(tempDir.resolve("missing.wav"), "missing.wav")).isNotNull();
    }
}
