package com.ielts.backend.controller;

import com.ielts.backend.enums.SkillType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * POST /api/exercises/{id}/submit for Reading and Listening, using the samples
 * "Farming in the Sky" (Reading) and "Photography Course Enquiry" (Listening) from V5__seed_sample_exercises.sql.
 * Answer keys are read from the database, so the tests follow the seed data.
 * Each test runs in a transaction that is rolled back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExerciseSubmissionControllerTest {

    private static final String READING = "d9f52c7a-9133-51eb-ad99-e9fef11162b4";
    private static final String LISTENING = "ad96d65b-5c3a-5057-9e9c-39bb9f76d4ee";
    // V2: Reading exercise in a normal lesson of the Reading course, without questions
    private static final String READING_LESSON_EXERCISE = "40000000-0000-0000-0000-000000001211";
    private static final String UNKNOWN_ID = "99999999-9999-9999-9999-999999999999";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    ObjectMapper objectMapper;

    // ---------- Grading ----------

    @ParameterizedTest
    @EnumSource(value = SkillType.class, names = {"READING", "LISTENING"})
    void submit_correctAnswersForEveryExercise_scoresFullMarks(SkillType skill) throws Exception {
        // FR-8.01: automatic grading must match manual grading on the sample data, for both skills
        List<String> exercises = jdbcTemplate.queryForList("""
                SELECT e.id::text FROM exercises e
                WHERE e.skill_type = ?::skill_type AND e.exercise_type <> 'MOCK_TEST' AND e.lesson_id IS NULL
                  AND EXISTS (SELECT 1 FROM questions q WHERE q.exercise_id = e.id)
                """, String.class, skill.name());
        assertThat(exercises).contains(skill == SkillType.READING ? READING : LISTENING);

        for (String exercise : exercises) {
            Map<String, Object> answers = correctAnswers(exercise);
            submit(exercise, "student_new", answers)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.correctCount").value(answers.size()))
                    .andExpect(jsonPath("$.result.percentage").value(100.0))
                    .andExpect(jsonPath("$.incorrectQuestions", hasSize(0)));
        }
    }

    @Test
    void submit_mixedAnswers_matchesManualGrading() throws Exception {
        Map<Integer, String> key = keyByNumber(READING);
        Map<Integer, String> wrong = wrongChoiceByNumber(READING);
        Map<String, Object> answers = new LinkedHashMap<>();
        answers.put(id(READING, 1), key.get(1));          // TF correct
        answers.put(id(READING, 2), wrong.get(2));        // TF wrong; 3-5 left blank
        answers.put(id(READING, 6), "  SPONGE. ");        // fill blank, normalised -> correct
        answers.put(id(READING, 7), "soil");              // fill blank wrong
        answers.put(id(READING, 8), "Restaurants");       // fill blank correct; 9 left blank
        answers.put(id(READING, 10), key.get(10));        // MC correct
        answers.put(id(READING, 11), wrong.get(11));      // MC wrong
        answers.put(id(READING, 12), key.get(12));        // matching correct
        answers.put(id(READING, 13), wrong.get(13));      // matching wrong

        submit(READING, "student_new", answers)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.score").value(5))
                .andExpect(jsonPath("$.result.maxScore").value(13))
                .andExpect(jsonPath("$.result.correctCount").value(5))
                .andExpect(jsonPath("$.result.totalQuestions").value(13))
                .andExpect(jsonPath("$.result.percentage").value(38.46))
                .andExpect(jsonPath("$.result.bandScore").value(nullValue()))
                .andExpect(jsonPath("$.result.status").value("GRADED"))
                .andExpect(jsonPath("$.byQuestionType[*].questionType")
                        .value(contains("TRUE_FALSE", "FILL_BLANK", "MULTIPLE_CHOICE", "MATCHING")))
                .andExpect(jsonPath("$.byQuestionType[*].correct").value(contains(1, 2, 1, 1)))
                .andExpect(jsonPath("$.byQuestionType[*].total").value(contains(5, 4, 2, 2)))
                .andExpect(jsonPath("$.byQuestionType[1].percentage").value(50.0))
                .andExpect(jsonPath("$.incorrectQuestions[*].number").value(contains(2, 3, 4, 5, 7, 9, 11, 13)))
                .andExpect(jsonPath("$.incorrectQuestions[?(@.number == 7)].userAnswer").value(contains("soil")))
                .andExpect(jsonPath("$.incorrectQuestions[?(@.number == 7)].correctAnswer").value(contains("compost")))
                .andExpect(jsonPath("$.incorrectQuestions[?(@.number == 3)].userAnswer").value(contains(nullValue())))
                .andExpect(jsonPath("$.incorrectQuestions[?(@.number == 7)].explanation")
                        .value(contains("Paragraph D: a lightweight mixture of crushed volcanic rock and recycled compost.")));
    }

    @Test
    void submit_emptyAnswers_scoresZero() throws Exception {
        submit(READING, "student_new", Map.of())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.score").value(0))
                .andExpect(jsonPath("$.result.correctCount").value(0))
                .andExpect(jsonPath("$.incorrectQuestions", hasSize(13)));
    }

    // ---------- Storage ----------

    @Test
    void submit_storesAttemptsAndAnswers_visibleInSubmissionHistory() throws Exception {
        String first = submit(READING, "student_new", correctAnswers(READING))
                .andExpect(jsonPath("$.result.attemptNumber").value(1))
                .andReturn().getResponse().getContentAsString();
        submit(READING, "student_new", Map.of())
                .andExpect(jsonPath("$.result.attemptNumber").value(2));

        String submissionId = objectMapper.readTree(first).at("/result/submissionId").asText();
        Integer stored = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM question_answers WHERE submission_id = ?::uuid", Integer.class, submissionId);
        assertThat(stored).isEqualTo(13);

        // The history endpoint of the Listening flow also lists Reading attempts
        mockMvc.perform(get("/api/exercises/{id}/submissions", READING).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void submit_afterMaxAttempts_returns409() throws Exception {
        jdbcTemplate.update("UPDATE exercises SET max_attempts = 1 WHERE id = ?::uuid", READING);

        submit(READING, "student_new", Map.of()).andExpect(status().isOk());
        submit(READING, "student_new", Map.of())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MAX_ATTEMPTS_REACHED"));
    }

    // ---------- Access ----------

    @Test
    void submit_anonymous_returns401() throws Exception {
        mockMvc.perform(post("/api/exercises/{id}/submit", READING)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"answers\":{}}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void submit_teacher_returns403() throws Exception {
        submit(READING, "teacher_demo", Map.of()).andExpect(status().isForbidden());
    }

    @Test
    void submit_lessonExerciseNotEnrolled_returns403() throws Exception {
        submit(READING_LESSON_EXERCISE, "student_new", Map.of()).andExpect(status().isForbidden());
    }

    // ---------- Validation ----------

    @Test
    void submit_writingExercise_returns400() throws Exception {
        // Writing and Speaking are graded by AI in their own flow
        jdbcTemplate.update("UPDATE exercises SET skill_type = 'WRITING'::skill_type WHERE id = ?::uuid", READING);

        submit(READING, "student_new", Map.of())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EXERCISE"));
    }

    @Test
    void submit_fillBlankAnswerTooLong_returns400() throws Exception {
        String q6 = id(READING, 6);
        submit(READING, "student_new", Map.of(q6, "x".repeat(201)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details", hasKey(q6)));
    }

    @Test
    void submit_exerciseWithoutQuestions_returns400() throws Exception {
        // student_enrolled has joined the Reading course, so the access check passes
        submit(READING_LESSON_EXERCISE, "student_enrolled", Map.of())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EXERCISE"));
    }

    @Test
    void submit_mockTest_returns404() throws Exception {
        jdbcTemplate.update("UPDATE exercises SET exercise_type = 'MOCK_TEST'::exercise_type WHERE id = ?::uuid", READING);

        submit(READING, "student_new", Map.of()).andExpect(status().isNotFound());
    }

    @Test
    void submit_unknownExercise_returns404() throws Exception {
        submit(UNKNOWN_ID, "student_new", Map.of()).andExpect(status().isNotFound());
    }

    @Test
    void submit_unknownQuestionId_returns400WithDetails() throws Exception {
        submit(READING, "student_new", Map.of(UNKNOWN_ID, "x"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ANSWER"))
                .andExpect(jsonPath("$.details", hasKey(UNKNOWN_ID)));
    }

    @Test
    void submit_textInsteadOfOptionId_returns400() throws Exception {
        String q1 = id(READING, 1);
        submit(READING, "student_new", Map.of(q1, "TRUE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details", hasKey(q1)));
    }

    @Test
    void submit_optionIdOfAnotherQuestion_returns400() throws Exception {
        // Q12 and Q13 both have options A-F; an option of Q13 is not valid for Q12
        String q12 = id(READING, 12);
        submit(READING, "student_new", Map.of(q12, keyByNumber(READING).get(13)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details", hasKey(q12)));
    }

    @Test
    void submit_missingAnswersField_returns400() throws Exception {
        mockMvc.perform(post("/api/exercises/{id}/submit", READING).with(httpBasic("student_new", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ---------- Listening and review ----------

    @Test
    void submit_listening_gradesFillBlankAlternativesAndChoices() throws Exception {
        Map<Integer, String> key = keyByNumber(LISTENING);
        Map<String, Object> answers = new LinkedHashMap<>();
        answers.put(id(LISTENING, 1), " thornley ");      // case and spaces ignored
        answers.put(id(LISTENING, 2), "493 826");         // accepted alternative spelling
        answers.put(id(LISTENING, 3), "Nineteenth");      // accepted alternative spelling
        answers.put(id(LISTENING, 4), "£85");        // "£85" is not in the answer key
        answers.put(id(LISTENING, 7), key.get(7));        // MC by option id

        submit(LISTENING, "student_new", answers)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.correctCount").value(4))
                .andExpect(jsonPath("$.result.totalQuestions").value(10))
                .andExpect(jsonPath("$.result.bandScore").value(nullValue()))
                .andExpect(jsonPath("$.byQuestionType[*].questionType").value(contains("FILL_BLANK", "MULTIPLE_CHOICE")));
    }

    @Test
    void review_afterSubmit_showsTranscriptWithoutBand() throws Exception {
        String body = submit(LISTENING, "student_new", correctAnswers(LISTENING))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String submissionId = objectMapper.readTree(body).at("/result/submissionId").asText();

        mockMvc.perform(get("/api/submissions/{id}/review", submissionId).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.transcript").exists())
                .andExpect(jsonPath("$.submission.bandScore").value(nullValue()));
    }

    @Test
    void submissionDetail_onlyOwnerAdminOrCourseTeacher() throws Exception {
        String body = submit(READING, "student_new", Map.of()).andReturn().getResponse().getContentAsString();
        String submissionId = objectMapper.readTree(body).at("/result/submissionId").asText();

        mockMvc.perform(get("/api/submissions/{id}", submissionId).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/submissions/{id}", submissionId).with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk());
        // A standalone practice exercise has no owning teacher, so no teacher may read it
        mockMvc.perform(get("/api/submissions/{id}", submissionId).with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/submissions/{id}", submissionId).with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isForbidden());
    }

    @Test
    void history_anonymous_returns401() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}/submissions", READING))
                .andExpect(status().isUnauthorized());
    }

    // ---------- Helpers ----------

    private ResultActions submit(String exerciseId, String username, Map<String, Object> answers) throws Exception {
        return mockMvc.perform(post("/api/exercises/{id}/submit", exerciseId)
                .with(httpBasic(username, PASSWORD))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("answers", answers))));
    }

    private String id(String exerciseId, int number) {
        return jdbcTemplate.queryForObject(
                "SELECT id::text FROM questions WHERE exercise_id = ?::uuid AND ordering = ?",
                String.class, exerciseId, number);
    }

    /** Correct option id for choice questions, first accepted spelling for FILL_BLANK. */
    private Map<Integer, String> keyByNumber(String exerciseId) {
        Map<Integer, String> key = new LinkedHashMap<>();
        jdbcTemplate.query("""
                SELECT q.ordering, q.question_type::text AS type, o.id::text AS option_id, o.option_text
                FROM questions q JOIN question_options o ON o.question_id = q.id
                WHERE q.exercise_id = ?::uuid AND o.is_correct
                ORDER BY q.ordering, o.ordering
                """, rs -> {
            int number = rs.getInt("ordering");
            String value = "FILL_BLANK".equals(rs.getString("type")) ? rs.getString("option_text") : rs.getString("option_id");
            key.putIfAbsent(number, value);
        }, exerciseId);
        return key;
    }

    /** One wrong option id for each choice question. */
    private Map<Integer, String> wrongChoiceByNumber(String exerciseId) {
        Map<Integer, String> wrong = new LinkedHashMap<>();
        jdbcTemplate.query("""
                SELECT q.ordering, o.id::text AS option_id
                FROM questions q JOIN question_options o ON o.question_id = q.id
                WHERE q.exercise_id = ?::uuid AND NOT o.is_correct
                ORDER BY q.ordering, o.ordering
                """, rs -> {
            wrong.putIfAbsent(rs.getInt("ordering"), rs.getString("option_id"));
        }, exerciseId);
        return wrong;
    }

    private Map<String, Object> correctAnswers(String exerciseId) {
        Map<String, Object> answers = new LinkedHashMap<>();
        keyByNumber(exerciseId).forEach((number, value) -> answers.put(id(exerciseId, number), value));
        return answers;
    }
}
