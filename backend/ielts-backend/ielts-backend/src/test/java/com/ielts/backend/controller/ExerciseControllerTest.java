package com.ielts.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Uses the sample data from V2 (lesson exercises), V4 (demo accounts) and
 * V5__seed_sample_exercises.sql (standalone practice exercises).
 * Each test runs in a transaction that is rolled back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExerciseControllerTest {

    private static final String READING_PRACTICE = "d9f52c7a-9133-51eb-ad99-e9fef11162b4";
    private static final String LISTENING_PRACTICE = "ad96d65b-5c3a-5057-9e9c-39bb9f76d4ee";
    // Lesson exercises from V2: the first is in a normal Reading lesson, the second in a preview Listening lesson
    private static final String READING_LESSON_EXERCISE = "40000000-0000-0000-0000-000000001211";
    private static final String PREVIEW_LESSON_EXERCISE = "40000000-0000-0000-0000-000000002111";
    private static final String UNKNOWN_ID = "99999999-9999-9999-9999-999999999999";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    // ---------- Listing ----------

    @Test
    void listExercises_returnsOnlyStandalonePractice() throws Exception {
        // Both V5 exercises share created_at, so the id tie-breaker decides the order
        mockMvc.perform(get("/api/exercises"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[*].id").value(contains(LISTENING_PRACTICE, READING_PRACTICE)))
                .andExpect(jsonPath("$.content[*].lessonId").value(everyItem(nullValue())));
    }

    @Test
    void listExercises_includesQuestionCount() throws Exception {
        mockMvc.perform(get("/api/exercises"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == '" + READING_PRACTICE + "')].questionCount").value(contains(13)))
                .andExpect(jsonPath("$.content[?(@.id == '" + LISTENING_PRACTICE + "')].questionCount").value(contains(10)));
    }

    @Test
    void listExercises_filtersBySkill() throws Exception {
        mockMvc.perform(get("/api/exercises").param("skill", "READING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(READING_PRACTICE));
    }

    @Test
    void listExercises_filtersByQuestionType() throws Exception {
        mockMvc.perform(get("/api/exercises").param("questionType", "MATCHING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(READING_PRACTICE));

        mockMvc.perform(get("/api/exercises").param("questionType", "FILL_BLANK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void listExercises_filtersByLevel() throws Exception {
        jdbcTemplate.update("UPDATE exercises SET difficulty_level = 'INTERMEDIATE'::difficulty_level WHERE id = ?::uuid",
                LISTENING_PRACTICE);

        mockMvc.perform(get("/api/exercises").param("level", "INTERMEDIATE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(LISTENING_PRACTICE))
                .andExpect(jsonPath("$.content[0].difficultyLevel").value("INTERMEDIATE"));
    }

    @Test
    void listExercises_searchesTitleCaseInsensitive() throws Exception {
        mockMvc.perform(get("/api/exercises").param("q", "  FARMING "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(READING_PRACTICE));
    }

    @Test
    void listExercises_combinesFilters() throws Exception {
        mockMvc.perform(get("/api/exercises").param("skill", "LISTENING").param("questionType", "MATCHING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void listExercises_invalidQuestionType_returns400() throws Exception {
        mockMvc.perform(get("/api/exercises").param("questionType", "ESSAY_WRONG"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    // ---------- Detail: structure ----------

    @Test
    void exerciseDetail_reading_returnsGroupsAndQuestionsInOrder() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", READING_PRACTICE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skillType").value("READING"))
                .andExpect(jsonPath("$.totalQuestions").value(13))
                .andExpect(jsonPath("$.content.paragraphs", hasSize(6)))
                .andExpect(jsonPath("$.groups[*].questionType")
                        .value(contains("TRUE_FALSE", "FILL_BLANK", "MULTIPLE_CHOICE", "MATCHING")))
                .andExpect(jsonPath("$.groups[0].questions[*].number").value(contains(1, 2, 3, 4, 5)))
                .andExpect(jsonPath("$.groups[0].questions[0].options[*].optionText")
                        .value(contains("TRUE", "FALSE", "NOT GIVEN")))
                .andExpect(jsonPath("$.groups[2].questions[0].options", hasSize(4)))
                .andExpect(jsonPath("$.groups[3].questions[0].options", hasSize(6)));
    }

    // ---------- Detail: answer keys never leave the server ----------

    @Test
    void exerciseDetail_hidesCorrectFlagsPointsAndExplanations() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", READING_PRACTICE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$..isCorrect").doesNotExist())
                .andExpect(jsonPath("$..point").doesNotExist())
                .andExpect(jsonPath("$..explanation").doesNotExist())
                .andExpect(content().string(not(containsString("isCorrect"))))
                .andExpect(content().string(not(containsString("explanation"))));
    }

    @Test
    void exerciseDetail_fillBlankHasNoOptions() throws Exception {
        // FILL_BLANK options are the accepted answers
        mockMvc.perform(get("/api/exercises/{id}", READING_PRACTICE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.groups[1].questionType").value("FILL_BLANK"))
                .andExpect(jsonPath("$.groups[1].questions[*].options").value(everyItem(empty())));
    }

    @Test
    void exerciseDetail_listening_hidesTranscriptAndAnswers() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", LISTENING_PRACTICE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.sectionTitle").value("Section 1"))
                .andExpect(jsonPath("$.content.transcript").doesNotExist())
                .andExpect(jsonPath("$.groups[0].questions[*].options").value(everyItem(empty())))
                // Answers that appear only in the transcript and the answer key
                .andExpect(content().string(not(containsString("Thornley"))))
                .andExpect(content().string(not(containsString("tripod"))))
                .andExpect(content().string(not(containsString("nineteenth"))));
    }

    // ---------- Detail: access (FR-2.01) ----------

    @Test
    void exerciseDetail_standalonePractice_isOpenWithoutLogin() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", LISTENING_PRACTICE))
                .andExpect(status().isOk());
    }

    @Test
    void exerciseDetail_lessonExercise_anonymous_returns401() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", READING_LESSON_EXERCISE))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void exerciseDetail_lessonExercise_studentNotEnrolled_returns403() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", READING_LESSON_EXERCISE).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isForbidden());
    }

    @Test
    void exerciseDetail_lessonExercise_enrolledStudent_returns200() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", READING_LESSON_EXERCISE).with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lessonId").value("30000000-0000-0000-0000-000000000121"));
    }

    @Test
    void exerciseDetail_previewLessonExercise_isOpenWithoutLogin() throws Exception {
        // The Listening lesson is a preview lesson, so its exercises are open like the lesson itself
        mockMvc.perform(get("/api/exercises/{id}", PREVIEW_LESSON_EXERCISE))
                .andExpect(status().isOk());
    }

    @Test
    void exerciseDetail_lessonExercise_owningTeacher_returns200() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", READING_LESSON_EXERCISE).with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk());
    }

    @Test
    void exerciseDetail_lessonExercise_otherTeacher_returns403() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", READING_LESSON_EXERCISE).with(httpBasic("teacher_other", PASSWORD)))
                .andExpect(status().isForbidden());
    }

    @Test
    void exerciseDetail_mockTest_returns404() throws Exception {
        // Mock tests open only through a timed session (FR-4.02), never through this endpoint
        jdbcTemplate.update("UPDATE exercises SET exercise_type = 'MOCK_TEST'::exercise_type WHERE id = ?::uuid",
                READING_PRACTICE);

        mockMvc.perform(get("/api/exercises/{id}", READING_PRACTICE))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/exercises/{id}", READING_PRACTICE).with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isNotFound());
    }

    @Test
    void exerciseSubPath_anonymous_returns401() throws Exception {
        // Only the list and detail are public; future sub-resources must not become public by accident
        mockMvc.perform(get("/api/exercises/{id}/attempts", READING_PRACTICE))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void exerciseDetail_unknownId_returns404() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", UNKNOWN_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void exerciseDetail_malformedId_returns400() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", "not-a-uuid"))
                .andExpect(status().isBadRequest());
    }

    // ---------- Lesson detail still lists its exercises ----------

    @Test
    void lessonDetail_exerciseSummaryIncludesQuestionCount() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", "30000000-0000-0000-0000-000000000121")
                        .with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises[0].id").value(READING_LESSON_EXERCISE))
                .andExpect(jsonPath("$.exercises[0].questionCount").value(0));
    }
}
