package com.ielts.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercise counts and learner progress in course, section and lesson views (FE integration).
 * V6 links the Reading sample "Farming in the Sky" (13 questions) to lesson "Skimming and scanning"
 * and the Listening sample (10 questions) to the preview lesson "Listening Part 1".
 * <p>
 * Progress assertions use student_new, whose submissions and enrollments are reset before each test,
 * because student_enrolled is the demo account and may have real attempts in the shared database.
 * Each test runs in a transaction that is rolled back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LearningProgressControllerTest {

    private static final String READING_COURSE = "10000000-0000-0000-0000-000000000001";
    private static final String LISTENING_COURSE = "10000000-0000-0000-0000-000000000002";
    private static final String GETTING_STARTED_SECTION = "20000000-0000-0000-0000-000000000011";
    private static final String DRAFT_SECTION = "20000000-0000-0000-0000-000000000041";
    private static final String SKIMMING_LESSON = "30000000-0000-0000-0000-000000000112";
    private static final String LISTENING_PREVIEW_LESSON = "30000000-0000-0000-0000-000000000211";
    private static final String READING = "d9f52c7a-9133-51eb-ad99-e9fef11162b4";
    private static final String LISTENING = "ad96d65b-5c3a-5057-9e9c-39bb9f76d4ee";
    private static final String STUDENT_NEW = "00000000-0000-0000-0000-000000000012";
    private static final String UNKNOWN_ID = "99999999-9999-9999-9999-999999999999";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    ObjectMapper objectMapper;

    @BeforeEach
    void resetStudentNew() {
        jdbcTemplate.update("DELETE FROM user_submissions WHERE user_id = ?::uuid", STUDENT_NEW);
        jdbcTemplate.update("DELETE FROM enrollments WHERE user_id = ?::uuid", STUDENT_NEW);
    }

    // ---------- GET /api/courses/my ----------

    @Test
    void myCourses_anonymous_returns401() throws Exception {
        mockMvc.perform(get("/api/courses/my")).andExpect(status().isUnauthorized());
    }

    @Test
    void myCourses_demoStudent_seesReadingAndListening() throws Exception {
        mockMvc.perform(get("/api/courses/my").with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id").value(containsInAnyOrder(READING_COURSE, LISTENING_COURSE)))
                .andExpect(jsonPath("$[*].exerciseCount").value(contains(1, 1)))
                .andExpect(jsonPath("$[?(@.id == '" + READING_COURSE + "')].sectionCount").value(contains(2)))
                .andExpect(jsonPath("$[?(@.id == '" + READING_COURSE + "')].teacherName").value(contains("Demo Teacher")))
                .andExpect(jsonPath("$[?(@.id == '" + READING_COURSE + "')].difficultyLevel").value(contains("INTERMEDIATE")));
    }

    @Test
    void myCourses_notEnrolled_returnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/courses/my").with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void myCourses_countsCompletedExercisesAfterSubmit() throws Exception {
        enroll(READING_COURSE);

        mockMvc.perform(get("/api/courses/my").with(httpBasic("student_new", PASSWORD)))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(READING_COURSE))
                .andExpect(jsonPath("$[0].enrolledAt").value(notNullValue()))
                .andExpect(jsonPath("$[0].completedAt").value(nullValue()))
                .andExpect(jsonPath("$[0].exerciseCount").value(1))
                .andExpect(jsonPath("$[0].completedExerciseCount").value(0));

        submit(READING);

        mockMvc.perform(get("/api/courses/my").with(httpBasic("student_new", PASSWORD)))
                .andExpect(jsonPath("$[0].completedExerciseCount").value(1));
    }

    // ---------- GET /api/courses/{id} ----------

    @Test
    void courseDetail_anonymous_hasCountsButNoProgress() throws Exception {
        mockMvc.perform(get("/api/courses/{id}", READING_COURSE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exerciseCount").value(1))
                .andExpect(jsonPath("$.completedExerciseCount").value(nullValue()))
                .andExpect(jsonPath("$.enrollment").value(nullValue()))
                .andExpect(jsonPath("$.sections[*].exerciseCount").value(contains(1, 0)))
                .andExpect(jsonPath("$.sections[0].completedExerciseCount").value(nullValue()))
                // "TFNG practice 1/2" have no questions, so they do not count
                .andExpect(jsonPath("$.sections[0].lessons[*].exerciseCount").value(contains(0, 1)))
                .andExpect(jsonPath("$.sections[1].lessons[*].exerciseCount").value(contains(0, 0)));
    }

    @Test
    void courseDetail_enrolledStudent_hasEnrollmentAndProgress() throws Exception {
        enroll(READING_COURSE);
        submit(READING);

        mockMvc.perform(get("/api/courses/{id}", READING_COURSE).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enrollment.enrolledAt").value(notNullValue()))
                .andExpect(jsonPath("$.completedExerciseCount").value(1))
                .andExpect(jsonPath("$.sections[*].completedExerciseCount").value(contains(1, 0)));
    }

    @Test
    void courseDetail_loggedInButNotEnrolled_hasNoEnrollment() throws Exception {
        mockMvc.perform(get("/api/courses/{id}", READING_COURSE).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enrollment").value(nullValue()))
                .andExpect(jsonPath("$.completedExerciseCount").value(0));
    }

    // ---------- GET /api/lessons/{id} ----------

    @Test
    void lessonDetail_afterSubmit_showsAttemptStats() throws Exception {
        enroll(READING_COURSE);
        JsonNode result = submit(READING);

        mockMvc.perform(get("/api/lessons/{id}", SKIMMING_LESSON).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises", hasSize(1)))
                .andExpect(jsonPath("$.exercises[0].id").value(READING))
                .andExpect(jsonPath("$.exercises[0].lessonId").value(SKIMMING_LESSON))
                .andExpect(jsonPath("$.exercises[0].lessonTitle").value("Skimming and scanning"))
                .andExpect(jsonPath("$.exercises[0].sectionId").value(GETTING_STARTED_SECTION))
                .andExpect(jsonPath("$.exercises[0].courseId").value(READING_COURSE))
                .andExpect(jsonPath("$.exercises[0].questionCount").value(13))
                .andExpect(jsonPath("$.exercises[0].maxScore").value(13.0))
                .andExpect(jsonPath("$.exercises[0].attemptCount").value(1))
                .andExpect(jsonPath("$.exercises[0].bestScore").value(result.at("/score").asDouble()))
                .andExpect(jsonPath("$.exercises[0].lastSubmissionId").value(result.at("/submissionId").asString()));
    }

    @Test
    void lessonDetail_previewLessonAnonymous_listsExercisesWithoutAttempts() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", LISTENING_PREVIEW_LESSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises[*].id").value(contains(LISTENING, "40000000-0000-0000-0000-000000002111")))
                .andExpect(jsonPath("$.exercises[*].questionCount").value(contains(10, 0)))
                .andExpect(jsonPath("$.exercises[0].attemptCount").value(0))
                .andExpect(jsonPath("$.exercises[0].bestScore").value(nullValue()))
                .andExpect(jsonPath("$.exercises[0].lastSubmissionId").value(nullValue()));
    }

    // ---------- GET /api/sections/{id}/exercises ----------

    @Test
    void sectionExercises_anonymous_returns401() throws Exception {
        mockMvc.perform(get("/api/sections/{id}/exercises", GETTING_STARTED_SECTION))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void sectionExercises_notEnrolled_returns403() throws Exception {
        mockMvc.perform(get("/api/sections/{id}/exercises", GETTING_STARTED_SECTION).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isForbidden());
    }

    @Test
    void sectionExercises_enrolledStudent_listsLessonExercises() throws Exception {
        mockMvc.perform(get("/api/sections/{id}/exercises", GETTING_STARTED_SECTION)
                        .with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Reading Passage 1 - Farming in the Sky"))
                .andExpect(jsonPath("$[0].questionCount").value(13))
                .andExpect(jsonPath("$[0].timeLimit").value(1200));
    }

    @Test
    void sectionExercises_owningTeacher_canList() throws Exception {
        mockMvc.perform(get("/api/sections/{id}/exercises", GETTING_STARTED_SECTION).with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk());
    }

    @Test
    void sectionExercises_draftCourse_returns404() throws Exception {
        mockMvc.perform(get("/api/sections/{id}/exercises", DRAFT_SECTION).with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isNotFound());
    }

    @Test
    void sectionExercises_unknownId_returns404() throws Exception {
        mockMvc.perform(get("/api/sections/{id}/exercises", UNKNOWN_ID).with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isNotFound());
    }

    // ---------- GET /api/exercises/{id} ----------

    @Test
    void exerciseDetail_hasCourseAndSection() throws Exception {
        mockMvc.perform(get("/api/exercises/{id}", READING))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lessonId").value(SKIMMING_LESSON))
                .andExpect(jsonPath("$.sectionId").value(GETTING_STARTED_SECTION))
                .andExpect(jsonPath("$.courseId").value(READING_COURSE));
    }

    // ---------- Helpers ----------

    private void enroll(String courseId) {
        jdbcTemplate.update("INSERT INTO enrollments (user_id, course_id) VALUES (?::uuid, ?::uuid)",
                STUDENT_NEW, courseId);
    }

    /** Submits with no answers (graded as 0) and returns the "result" object of the response. */
    private JsonNode submit(String exerciseId) throws Exception {
        String body = mockMvc.perform(post("/api/exercises/{id}/submit", exerciseId)
                        .with(httpBasic("student_new", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":{}}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).at("/result");
    }
}
