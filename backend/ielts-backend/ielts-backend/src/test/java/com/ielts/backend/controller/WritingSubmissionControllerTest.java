package com.ielts.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.backend.dto.request.WritingSubmissionRequest;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.exception.LlmTimeoutException;
import com.ielts.backend.exception.LlmUnavailableException;
import com.ielts.backend.service.llm.LlmClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class WritingSubmissionControllerTest {

    private static final UUID WRITING_EXERCISE_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final String READING_EXERCISE_ID = "d9f52c7a-9133-51eb-ad99-e9fef11162b4";
    private static final String STUDENT_NEW = "00000000-0000-0000-0000-000000000012";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @MockitoBean
    LlmClient llmClient;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private String sampleJson;

    private final String sampleEssay = """
            In modern society, many people argue that governments should invest more in renewable energy
            because this is a very important issue in today society.
            Furthermore, renewable power protects nature. Moreover, green energy creates jobs. In addition, it reduces bills.
            However, fossil fuel reliance remains a very important important factor in industrial progress.
            Some factories make the environment polluted due to lack of regulation.
            Therefore, The governments are responsible for provide clean energy to citizens.
            In conclusion, environment is important resource that needs preservation.
            """;

    @BeforeEach
    void setUp() throws Exception {
        ClassPathResource sampleResource = new ClassPathResource("ai/schema/writing_feedback.sample.json");
        try (InputStream is = sampleResource.getInputStream()) {
            sampleJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        when(llmClient.getModelName()).thenReturn("gemini-2.5-flash");

        // Clean up and set up a stand-alone Writing exercise
        jdbcTemplate.update("DELETE FROM user_submissions WHERE exercise_id = ?::uuid", WRITING_EXERCISE_ID.toString());
        jdbcTemplate.update("DELETE FROM questions WHERE exercise_id = ?::uuid", WRITING_EXERCISE_ID.toString());
        jdbcTemplate.update("DELETE FROM exercises WHERE id = ?::uuid", WRITING_EXERCISE_ID.toString());

        jdbcTemplate.update("""
                INSERT INTO exercises (id, title, instruction, exercise_type, skill_type, max_attempts)
                VALUES (?::uuid, 'Writing Task 2 Sample', 'Discuss renewable energy.', 'LESSON', 'WRITING', 2)
                """, WRITING_EXERCISE_ID.toString());

        jdbcTemplate.update("""
                INSERT INTO questions (id, exercise_id, question_text, question_type, ordering)
                VALUES ('33333333-3333-3333-3333-333333333333'::uuid, ?::uuid,
                        'Discuss renewable energy investment.', 'ESSAY', 1)
                """, WRITING_EXERCISE_ID.toString());
    }

    private ResultActions submitWriting(String exerciseId, String username, String password, WritingSubmissionRequest request) throws Exception {
        var req = post("/api/exercises/{id}/submit/writing", exerciseId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request));
        if (username != null) {
            req.with(httpBasic(username, password));
        }
        return mockMvc.perform(req);
    }

    @Test
    void submit_validEssay_returns200WithStructuredFeedback() throws Exception {
        when(llmClient.chat(any(), any())).thenReturn(sampleJson);

        WritingSubmissionRequest request = WritingSubmissionRequest.builder()
                .essayText(sampleEssay)
                .timeSpent(1500)
                .build();

        submitWriting(WRITING_EXERCISE_ID.toString(), "student_new", PASSWORD, request)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissionId").isNotEmpty())
                .andExpect(jsonPath("$.exerciseId").value(WRITING_EXERCISE_ID.toString()))
                .andExpect(jsonPath("$.attemptNumber").value(1))
                .andExpect(jsonPath("$.overallBand").value(6.5))
                .andExpect(jsonPath("$.outOfCalibrationRange").value(false))
                .andExpect(jsonPath("$.status").value("GRADED"))
                .andExpect(jsonPath("$.gradingMethod").value("AI"))
                .andExpect(jsonPath("$.criteria", hasSize(4)))
                .andExpect(jsonPath("$.criteria[0].criterionId").value("CRIT_W_TR"))
                .andExpect(jsonPath("$.criteria[0].name").value("Task Response"))
                .andExpect(jsonPath("$.criteria[0].band").value(6.0))
                .andExpect(jsonPath("$.summary").isNotEmpty())
                .andExpect(jsonPath("$.improvements", hasSize(4)))
                .andExpect(jsonPath("$.aiModel").value("gemini-2.5-flash"));

        // Verify saved to database
        Integer submissionCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_submissions WHERE exercise_id = ?::uuid AND status = 'GRADED'",
                Integer.class, WRITING_EXERCISE_ID.toString());
        assertThat(submissionCount).isEqualTo(1);
    }

    @Test
    void submit_tooShortEssay_returns400() throws Exception {
        WritingSubmissionRequest request = WritingSubmissionRequest.builder()
                .essayText("Too short essay.")
                .timeSpent(60)
                .build();

        submitWriting(WRITING_EXERCISE_ID.toString(), "student_new", PASSWORD, request)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    void submit_nonWritingExercise_returns400InvalidExercise() throws Exception {
        WritingSubmissionRequest request = WritingSubmissionRequest.builder()
                .essayText(sampleEssay)
                .timeSpent(600)
                .build();

        submitWriting(READING_EXERCISE_ID, "student_new", PASSWORD, request)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EXERCISE"));
    }

    @Test
    void submit_unauthenticated_returns401() throws Exception {
        WritingSubmissionRequest request = WritingSubmissionRequest.builder()
                .essayText(sampleEssay)
                .timeSpent(600)
                .build();

        submitWriting(WRITING_EXERCISE_ID.toString(), null, null, request)
                .andExpect(status().isUnauthorized());
    }

    @Test
    void submit_teacherRole_returns403() throws Exception {
        WritingSubmissionRequest request = WritingSubmissionRequest.builder()
                .essayText(sampleEssay)
                .timeSpent(600)
                .build();

        submitWriting(WRITING_EXERCISE_ID.toString(), "teacher_demo", PASSWORD, request)
                .andExpect(status().isForbidden());
    }

    @Test
    void submit_maxAttemptsReached_returns409() throws Exception {
        when(llmClient.chat(any(), any())).thenReturn(sampleJson);

        WritingSubmissionRequest request = WritingSubmissionRequest.builder()
                .essayText(sampleEssay)
                .timeSpent(1200)
                .build();

        // 1st attempt -> OK
        submitWriting(WRITING_EXERCISE_ID.toString(), "student_new", PASSWORD, request)
                .andExpect(status().isOk());

        // 2nd attempt -> OK (max_attempts = 2)
        submitWriting(WRITING_EXERCISE_ID.toString(), "student_new", PASSWORD, request)
                .andExpect(status().isOk());

        // 3rd attempt -> 409
        submitWriting(WRITING_EXERCISE_ID.toString(), "student_new", PASSWORD, request)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MAX_ATTEMPTS_REACHED"));
    }

    @Test
    void submit_llmTimeout_returns502AndRecordsFailedSubmission() throws Exception {
        when(llmClient.chat(any(), any())).thenThrow(new LlmTimeoutException("LLM API timed out after 30s"));

        WritingSubmissionRequest request = WritingSubmissionRequest.builder()
                .essayText(sampleEssay)
                .timeSpent(1200)
                .build();

        submitWriting(WRITING_EXERCISE_ID.toString(), "student_new", PASSWORD, request)
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("LLM_TIMEOUT"));

        // Verify failed status saved
        Integer failedCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_submissions WHERE exercise_id = ?::uuid AND status = 'FAILED'",
                Integer.class, WRITING_EXERCISE_ID.toString());
        assertThat(failedCount).isEqualTo(1);
    }

    @Test
    void submit_llmUnavailable_returns503AndRecordsFailedSubmission() throws Exception {
        when(llmClient.chat(any(), any())).thenThrow(new LlmUnavailableException("Gemini API key is invalid"));

        WritingSubmissionRequest request = WritingSubmissionRequest.builder()
                .essayText(sampleEssay)
                .timeSpent(1200)
                .build();

        submitWriting(WRITING_EXERCISE_ID.toString(), "student_new", PASSWORD, request)
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("LLM_UNAVAILABLE"));

        Integer failedCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_submissions WHERE exercise_id = ?::uuid AND status = 'FAILED'",
                Integer.class, WRITING_EXERCISE_ID.toString());
        assertThat(failedCount).isEqualTo(1);
    }

    @Test
    void submit_llmInvalidResponse_returns502() throws Exception {
        when(llmClient.chat(any(), any())).thenReturn("Invalid non-json response from LLM");

        WritingSubmissionRequest request = WritingSubmissionRequest.builder()
                .essayText(sampleEssay)
                .timeSpent(1200)
                .build();

        submitWriting(WRITING_EXERCISE_ID.toString(), "student_new", PASSWORD, request)
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("MALFORMED_JSON"));

        Integer failedCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM user_submissions WHERE exercise_id = ?::uuid AND status = 'FAILED'",
                Integer.class, WRITING_EXERCISE_ID.toString());
        assertThat(failedCount).isEqualTo(1);
    }
}
