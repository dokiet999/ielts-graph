package com.ielts.backend.controller;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * P0-8 (no answer key in the practice view, detail needs login) and P0-9 (final test only with a grant and
 * an open session). Uses the seed data: V5/V6 sample exercises, V4 demo accounts, V17 final tests.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExerciseAccessControllerTest {

    private static final String PASSWORD = "Demo@123";
    /** Listening "Photography Course Enquiry" in the preview lesson of the Listening course; Q1 is FILL_BLANK "Thornley". */
    private static final String LISTENING = "ad96d65b-5c3a-5057-9e9c-39bb9f76d4ee";
    /** Reading sample in a non-preview lesson of the Reading course. */
    private static final String READING = "d9f52c7a-9133-51eb-ad99-e9fef11162b4";
    /** Reading Final Test of the Reading course, section "Getting started". */
    private static final String READING_FINAL = "40000000-0000-0000-0000-000000006001";
    private static final String GETTING_STARTED_SECTION = "20000000-0000-0000-0000-000000000011";
    /** student_enrolled has joined the Reading and Listening courses (V4, V6). */
    private static final String STUDENT_ENROLLED = "00000000-0000-0000-0000-000000000011";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    /**
     * The test transaction spans every request of a test, so JPA changes are not yet written and entities read
     * by one request are reused by the next. Flush before reading or changing rows with JDBC, clear after.
     */
    @PersistenceContext
    EntityManager entityManager;

    @BeforeEach
    void clearFinalTestState() {
        jdbcTemplate.update("DELETE FROM final_test_sessions WHERE user_id = ?::uuid", STUDENT_ENROLLED);
        jdbcTemplate.update("DELETE FROM final_test_grants WHERE user_id = ?::uuid", STUDENT_ENROLLED);
        jdbcTemplate.update("DELETE FROM user_submissions WHERE user_id = ?::uuid AND exercise_id = ?::uuid",
                STUDENT_ENROLLED, READING_FINAL);
    }

    // ---------- P0-8: practice view ----------

    @Test
    void detail_anonymous_returns401() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", LISTENING)).andExpect(status().isUnauthorized());
    }

    @Test
    void detail_fillBlankQuestions_haveNoOptions() throws Exception {
        String body = mockMvc.perform(get("/api/exercises/{id}", LISTENING).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.questionGroups[*].questions[?(@.questionType == 'FILL_BLANK')].options[*]")
                        .value(hasSize(0)))
                // Choice questions still get their options
                .andExpect(jsonPath("$.data.questionGroups[*].questions[?(@.questionType == 'MULTIPLE_CHOICE')].options[*]")
                        .value(not(hasSize(0))))
                .andReturn().getResponse().getContentAsString();

        // The accepted answer of Q1 is not in the questions part of the response
        String questionsPart = body.substring(body.indexOf("\"questionGroups\""));
        assertThat(questionsPart).doesNotContain("Thornley");
    }

    @Test
    void detail_lessonNotPreview_notEnrolled_returns403() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", READING).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isForbidden());
    }

    @Test
    void list_hasNoContent() throws Exception {
        mockMvc.perform(get("/api/exercises").param("skill", "LISTENING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", not(hasSize(0))))
                .andExpect(jsonPath("$.data[*].content").value(everyItem(org.hamcrest.Matchers.nullValue())));
    }

    // ---------- P0-9: final test ----------

    @Test
    void finalTest_detail_withoutGrant_returns403() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", READING_FINAL).with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FINAL_TEST_LOCKED"));
    }

    @Test
    void finalTest_detail_withGrant_returns200() throws Exception {
        grant();

        mockMvc.perform(get("/api/exercises/{id}", READING_FINAL).with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exerciseType").value("FINAL_TEST"));
    }

    @Test
    void finalTest_submit_withoutSession_returns403() throws Exception {
        grant();

        submitFinal().andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FINAL_TEST_NOT_STARTED"));
    }

    @Test
    void finalTest_submit_inOpenSession_closesTheSession() throws Exception {
        grant();
        start();

        submitFinal().andExpect(status().isOk())
                .andExpect(jsonPath("$.data.result.bandScore").value(notNullValue()));
        flushAndClear();

        Integer open = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM final_test_sessions
                WHERE user_id = ?::uuid AND exercise_id = ?::uuid AND submitted_at IS NULL
                """, Integer.class, STUDENT_ENROLLED, READING_FINAL);
        Integer linked = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM final_test_sessions
                WHERE user_id = ?::uuid AND exercise_id = ?::uuid AND submission_id IS NOT NULL
                """, Integer.class, STUDENT_ENROLLED, READING_FINAL);
        assertThat(open).isZero();
        assertThat(linked).isEqualTo(1);

        // The session is used: a second submission needs a new session
        submitFinal().andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FINAL_TEST_NOT_STARTED"));
    }

    @Test
    void finalTest_submit_afterSessionExpired_returns409() throws Exception {
        grant();
        start();
        jdbcTemplate.update("""
                UPDATE final_test_sessions SET started_at = NOW() - INTERVAL '2 hours', expires_at = NOW() - INTERVAL '1 hour'
                WHERE user_id = ?::uuid AND exercise_id = ?::uuid
                """, STUDENT_ENROLLED, READING_FINAL);

        submitFinal().andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FINAL_TEST_TIME_UP"));
    }

    @Test
    void finalTest_submit_grantExpiredDuringSession_returns403() throws Exception {
        grant();
        start();
        jdbcTemplate.update("UPDATE final_test_grants SET expires_at = NOW() - INTERVAL '1 minute' WHERE user_id = ?::uuid",
                STUDENT_ENROLLED);

        submitFinal().andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FINAL_TEST_LOCKED"));
    }

    // ---------- Helpers ----------

    private void grant() {
        jdbcTemplate.update("""
                INSERT INTO final_test_grants (user_id, section_id, deadline_days, unlocked_at, expires_at)
                VALUES (?::uuid, ?::uuid, 7, NOW(), NOW() + INTERVAL '7 days')
                """, STUDENT_ENROLLED, GETTING_STARTED_SECTION);
    }

    private void start() throws Exception {
        mockMvc.perform(post("/api/sections/{id}/final-test/start", GETTING_STARTED_SECTION)
                        .with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk());
        flushAndClear();
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    private ResultActions submitFinal() throws Exception {
        return mockMvc.perform(post("/api/exercises/{id}/submit", READING_FINAL)
                .with(httpBasic("student_enrolled", PASSWORD))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"answers\":{}}"));
    }
}
