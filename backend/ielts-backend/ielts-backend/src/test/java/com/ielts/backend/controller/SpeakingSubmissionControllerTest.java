package com.ielts.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.backend.exception.SpeakingAsrException;
import com.ielts.backend.service.llm.LlmClient;
import com.ielts.backend.service.speaking.SpeakingAsrClient;
import com.ielts.backend.service.speaking.SpeakingAsrResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SpeakingSubmissionControllerTest {

    private static final UUID SPEAKING_EXERCISE_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final String READING_EXERCISE_ID = "d9f52c7a-9133-51eb-ad99-e9fef11162b4";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @MockitoBean
    SpeakingAsrClient speakingAsrClient;

    @MockitoBean
    LlmClient llmClient;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private String sampleFeedbackJson;
    private SpeakingAsrResult sampleAsrResult;
    private byte[] dummyAudioBytes;

    @BeforeEach
    void setUp() throws Exception {
        ClassPathResource feedbackResource = new ClassPathResource("ai/schema/speaking_feedback.sample.json");
        try (InputStream is = feedbackResource.getInputStream()) {
            sampleFeedbackJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        ClassPathResource asrResource = new ClassPathResource("ai/schema/speaking_asr.sample.json");
        try (InputStream is = asrResource.getInputStream()) {
            sampleAsrResult = objectMapper.readValue(is, SpeakingAsrResult.class);
        }

        dummyAudioBytes = new byte[4096];
        for (int i = 0; i < dummyAudioBytes.length; i++) {
            dummyAudioBytes[i] = (byte) (i % 127);
        }

        when(llmClient.getModelName()).thenReturn("gemini-2.5-flash");

        jdbcTemplate.update("DELETE FROM user_submissions WHERE exercise_id = ?::uuid", SPEAKING_EXERCISE_ID.toString());
        jdbcTemplate.update("DELETE FROM questions WHERE exercise_id = ?::uuid", SPEAKING_EXERCISE_ID.toString());
        jdbcTemplate.update("DELETE FROM exercises WHERE id = ?::uuid", SPEAKING_EXERCISE_ID.toString());

        jdbcTemplate.update("""
                INSERT INTO exercises (id, title, instruction, content, exercise_type, skill_type, max_attempts)
                VALUES (?::uuid, 'Speaking Part 2 Sample', 'Describe a city you visited recently.',
                        '{"part": "QT_S_PART2"}'::jsonb, 'LESSON', 'SPEAKING', 2)
                """, SPEAKING_EXERCISE_ID.toString());

        jdbcTemplate.update("""
                INSERT INTO questions (id, exercise_id, question_text, question_type, ordering)
                VALUES ('55555555-5555-5555-5555-555555555555'::uuid, ?::uuid,
                        'Describe a city you visited recently.', 'SPEAKING', 1)
                """, SPEAKING_EXERCISE_ID.toString());
    }

    private ResultActions submitSpeaking(
            String exerciseId,
            String username,
            String password,
            MockMultipartFile audioFile,
            Integer durationSec) throws Exception {
        var req = multipart("/api/exercises/{id}/submit/speaking", exerciseId)
                .file(audioFile)
                .param("part", "QT_S_PART2");
        if (durationSec != null) {
            req.param("timeSpent", durationSec.toString());
        }
        if (username != null) {
            req.with(httpBasic(username, password));
        }
        return mockMvc.perform(req);
    }

    @Test
    void submit_validAudio_returns200WithStructuredFeedback() throws Exception {
        when(speakingAsrClient.transcribe(any(), any())).thenReturn(sampleAsrResult);
        when(llmClient.chat(any(), any())).thenReturn(sampleFeedbackJson);

        MockMultipartFile audio = new MockMultipartFile(
                "audio", "recording.webm", "audio/webm", dummyAudioBytes);

        submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "student_new", PASSWORD, audio, 38)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissionId").isNotEmpty())
                .andExpect(jsonPath("$.exerciseId").value(SPEAKING_EXERCISE_ID.toString()))
                .andExpect(jsonPath("$.attemptNumber").value(1))
                .andExpect(jsonPath("$.part").value("QT_S_PART2"))
                .andExpect(jsonPath("$.overallBand").value(6.0))
                .andExpect(jsonPath("$.outOfCalibrationRange").value(false))
                .andExpect(jsonPath("$.status").value("GRADED"))
                .andExpect(jsonPath("$.gradingMethod").value("AI"))
                .andExpect(jsonPath("$.transcript").isNotEmpty())
                .andExpect(jsonPath("$.features.word_count").value(79))
                .andExpect(jsonPath("$.features.speech_rate_wpm").value(123.4))
                .andExpect(jsonPath("$.pronunciation.accuracy").value(78.5))
                .andExpect(jsonPath("$.summary").isNotEmpty())
                .andExpect(jsonPath("$.improvements", hasSize(3)))
                .andExpect(jsonPath("$.asrModel").value("whisper-small"))
                .andExpect(jsonPath("$.aiModel").value("gemini-2.5-flash"))
                .andExpect(jsonPath("$.rawFeedback.criteria.CRIT_S_FC.band").value(6))
                .andExpect(jsonPath("$.rawFeedback.criteria.CRIT_S_P.band").value(6))
                .andExpect(jsonPath("$.rawFeedback.overall_band").value(6.0))
                .andExpect(jsonPath("$.rawFeedback.part").value("QT_S_PART2"));

        Integer submissionCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_submissions WHERE exercise_id = ?::uuid AND status = 'GRADED'",
                Integer.class, SPEAKING_EXERCISE_ID.toString());
        assertThat(submissionCount).isEqualTo(1);
    }

    @Test
    void getSubmission_afterGrading_returnsStoredTranscriptAndFeedback() throws Exception {
        when(speakingAsrClient.transcribe(any(), any())).thenReturn(sampleAsrResult);
        when(llmClient.chat(any(), any())).thenReturn(sampleFeedbackJson);

        MockMultipartFile audio = new MockMultipartFile(
                "audio", "recording.webm", "audio/webm", dummyAudioBytes);

        String body = submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "student_new", PASSWORD, audio, 38)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String submissionId = objectMapper.readTree(body).get("submissionId").asText();

        mockMvc.perform(get("/api/submissions/{id}/detail", submissionId).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answers.transcript").isNotEmpty())
                .andExpect(jsonPath("$.answers.features.word_count").value(79))
                .andExpect(jsonPath("$.answers.pronunciation.accuracy").value(78.5))
                .andExpect(jsonPath("$.aiStructuredFeedback.criteria.CRIT_S_FC.band").value(6))
                .andExpect(jsonPath("$.aiStructuredFeedback.overall_band").value(6.0))
                .andExpect(jsonPath("$.aiFeedback").isNotEmpty());
    }

    @Test
    void submit_nullPronunciation_returns200Safely() throws Exception {
        SpeakingAsrResult noPronAsr = new SpeakingAsrResult("1.0", "whisper-small", "en",
                sampleAsrResult.transcript(), sampleAsrResult.features(), null);
        when(speakingAsrClient.transcribe(any(), any())).thenReturn(noPronAsr);
        when(llmClient.chat(any(), any())).thenReturn(sampleFeedbackJson);

        MockMultipartFile audio = new MockMultipartFile(
                "audio", "recording.mp3", "audio/mpeg", dummyAudioBytes);

        submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "student_new", PASSWORD, audio, 38)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pronunciation").value(nullValue()))
                .andExpect(jsonPath("$.overallBand").value(6.0));
    }

    @Test
    void submit_unsupportedExtension_returns400UnsupportedAudio() throws Exception {
        MockMultipartFile badFile = new MockMultipartFile(
                "audio", "notes.txt", "text/plain", dummyAudioBytes);

        submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "student_new", PASSWORD, badFile, 30)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_AUDIO"));

        Integer saved = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_submissions WHERE exercise_id = ?::uuid",
                Integer.class, SPEAKING_EXERCISE_ID.toString());
        assertThat(saved).isZero();
        verify(speakingAsrClient, never()).transcribe(any(), any());
        verify(llmClient, never()).chat(any(), any());
    }

    @Test
    void submit_tooShortAudio_returns400AudioTooShort() throws Exception {
        MockMultipartFile audio = new MockMultipartFile(
                "audio", "short.webm", "audio/webm", dummyAudioBytes);

        submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "student_new", PASSWORD, audio, 1)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("AUDIO_TOO_SHORT"));

        verify(speakingAsrClient, never()).transcribe(any(), any());
    }

    @Test
    void submit_nonSpeakingExercise_returns400InvalidExercise() throws Exception {
        MockMultipartFile audio = new MockMultipartFile(
                "audio", "recording.webm", "audio/webm", dummyAudioBytes);

        submitSpeaking(READING_EXERCISE_ID, "student_new", PASSWORD, audio, 60)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EXERCISE"));
    }

    @Test
    void submit_unauthenticated_returns401() throws Exception {
        MockMultipartFile audio = new MockMultipartFile(
                "audio", "recording.webm", "audio/webm", dummyAudioBytes);

        submitSpeaking(SPEAKING_EXERCISE_ID.toString(), null, null, audio, 60)
                .andExpect(status().isUnauthorized());
    }

    @Test
    void submit_teacherRole_returns403() throws Exception {
        MockMultipartFile audio = new MockMultipartFile(
                "audio", "recording.webm", "audio/webm", dummyAudioBytes);

        submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "teacher_demo", PASSWORD, audio, 60)
                .andExpect(status().isForbidden());
    }

    @Test
    void submit_maxAttemptsReached_returns409() throws Exception {
        when(speakingAsrClient.transcribe(any(), any())).thenReturn(sampleAsrResult);
        when(llmClient.chat(any(), any())).thenReturn(sampleFeedbackJson);

        MockMultipartFile audio = new MockMultipartFile(
                "audio", "recording.webm", "audio/webm", dummyAudioBytes);

        submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "student_new", PASSWORD, audio, 60)
                .andExpect(status().isOk());

        submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "student_new", PASSWORD, audio, 60)
                .andExpect(status().isOk());

        submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "student_new", PASSWORD, audio, 60)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MAX_ATTEMPTS_REACHED"));
    }

    @Test
    void submit_asrTimeout_returns502AndRecordsFailedSubmission() throws Exception {
        when(speakingAsrClient.transcribe(any(), any()))
                .thenThrow(new SpeakingAsrException("ASR_TIMEOUT", "ASR timed out"));

        MockMultipartFile audio = new MockMultipartFile(
                "audio", "recording.webm", "audio/webm", dummyAudioBytes);

        submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "student_new", PASSWORD, audio, 60)
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("ASR_TIMEOUT"));

        Integer failedCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_submissions WHERE exercise_id = ?::uuid AND status = 'FAILED'",
                Integer.class, SPEAKING_EXERCISE_ID.toString());
        assertThat(failedCount).isEqualTo(1);
    }

    @Test
    void submit_asrUnavailable_returns503AndRecordsFailedSubmission() throws Exception {
        when(speakingAsrClient.transcribe(any(), any()))
                .thenThrow(new SpeakingAsrException("ASR_UNAVAILABLE", "ASR service down"));

        MockMultipartFile audio = new MockMultipartFile(
                "audio", "recording.webm", "audio/webm", dummyAudioBytes);

        submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "student_new", PASSWORD, audio, 60)
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("ASR_UNAVAILABLE"));

        Integer failedCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_submissions WHERE exercise_id = ?::uuid AND status = 'FAILED'",
                Integer.class, SPEAKING_EXERCISE_ID.toString());
        assertThat(failedCount).isEqualTo(1);
    }

    @Test
    void submit_failedAttempts_doNotCountTowardsMaxAttempts() throws Exception {
        MockMultipartFile audio = new MockMultipartFile(
                "audio", "recording.webm", "audio/webm", dummyAudioBytes);

        when(speakingAsrClient.transcribe(any(), any()))
                .thenThrow(new SpeakingAsrException("ASR_TIMEOUT", "ASR timed out"));

        for (int i = 0; i < 2; i++) {
            submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "student_new", PASSWORD, audio, 60)
                    .andExpect(status().isBadGateway());
        }

        doReturn(sampleAsrResult).when(speakingAsrClient).transcribe(any(), any());
        when(llmClient.chat(any(), any())).thenReturn(sampleFeedbackJson);

        submitSpeaking(SPEAKING_EXERCISE_ID.toString(), "student_new", PASSWORD, audio, 60)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attemptNumber").value(3));
    }
}
