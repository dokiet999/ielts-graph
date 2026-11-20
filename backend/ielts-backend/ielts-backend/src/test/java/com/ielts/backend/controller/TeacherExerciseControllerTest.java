package com.ielts.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TeacherExerciseControllerTest {

    private static final String DRAFT_COURSE = "10000000-0000-0000-0000-000000000004";
    private static final String DRAFT_PREVIEW_LESSON = "30000000-0000-0000-0000-000000000411";
    private static final String APPROVED_LESSON = "30000000-0000-0000-0000-000000000111";
    private static final String STUDENT_ENROLLED_ID = "00000000-0000-0000-0000-000000000011";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    void exerciseCrudAndAtomicQuestionBuilder_validatesAndReplacesCleanly() throws Exception {
        // 1. Create a Reading exercise inside DRAFT_PREVIEW_LESSON
        String createBody = mockMvc.perform(post("/api/teacher/lessons/{lessonId}/exercises", DRAFT_PREVIEW_LESSON)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Reading Practice 1",
                                "instruction", "Read the passage carefully.",
                                "exerciseType", "PRACTICE",
                                "skillType", "READING",
                                "timeLimit", 900,
                                "maxAttempts", 3,
                                "content", Map.of(
                                        "passageTitle", "Urban Rooftops",
                                        "paragraphs", List.of(Map.of("label", "A", "text", "Sample passage text."))
                                )
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("Reading Practice 1"))
                .andExpect(jsonPath("$.data.skillType").value("READING"))
                .andExpect(jsonPath("$.data.totalQuestions").value(0))
                .andReturn().getResponse().getContentAsString();
        String exerciseId = objectMapper.readTree(createBody).at("/data/id").asString();

        // 2. Lesson exercise list reflects the created exercise
        mockMvc.perform(get("/api/teacher/lessons/{lessonId}/exercises", DRAFT_PREVIEW_LESSON)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exercises", hasSize(1)))
                .andExpect(jsonPath("$.data.exercises[0].id").value(exerciseId));

        // 3. Invalid MCQ without any correct option -> 400 CORRECT_OPTION_REQUIRED
        mockMvc.perform(put("/api/teacher/exercises/{id}/questions", exerciseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "questionGroups", List.of(Map.of(
                                        "groupTitle", "Questions 1",
                                        "questionType", "MULTIPLE_CHOICE",
                                        "questions", List.of(Map.of(
                                                "questionText", "Which answer?",
                                                "questionType", "MULTIPLE_CHOICE",
                                                "points", 1,
                                                "options", List.of(
                                                        Map.of("optionText", "A", "isCorrect", false),
                                                        Map.of("optionText", "B", "isCorrect", false)
                                                )
                                        ))
                                ))
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CORRECT_OPTION_REQUIRED"));

        // 4. Invalid FILL_BLANK with empty options -> 400 ACCEPTED_ANSWER_REQUIRED
        mockMvc.perform(put("/api/teacher/exercises/{id}/questions", exerciseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "questionGroups", List.of(Map.of(
                                        "groupTitle", "Fill blank",
                                        "questionType", "FILL_BLANK",
                                        "questions", List.of(Map.of(
                                                "questionText", "Complete: _____",
                                                "questionType", "FILL_BLANK",
                                                "points", 1,
                                                "options", List.of()
                                        ))
                                ))
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ACCEPTED_ANSWER_REQUIRED"));

        // 5. Save valid MCQ + FILL_BLANK groups -> teacher detail exposes answer keys and explanations
        mockMvc.perform(put("/api/teacher/exercises/{id}/questions", exerciseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "questionGroups", List.of(
                                        Map.of(
                                                "groupTitle", "Questions 1",
                                                "questionType", "MULTIPLE_CHOICE",
                                                "questions", List.of(Map.of(
                                                        "questionText", "Main topic?",
                                                        "questionType", "MULTIPLE_CHOICE",
                                                        "explanation", "See paragraph A",
                                                        "points", 1,
                                                        "options", List.of(
                                                                Map.of("optionText", "Rooftop farms", "isCorrect", true),
                                                                Map.of("optionText", "Rural highways", "isCorrect", false)
                                                        )
                                                ))
                                        ),
                                        Map.of(
                                                "groupTitle", "Questions 2",
                                                "questionType", "FILL_BLANK",
                                                "questions", List.of(Map.of(
                                                        "questionText", "Urban _____ space.",
                                                        "questionType", "FILL_BLANK",
                                                        "points", 1,
                                                        "options", List.of(Map.of("optionText", "roof"))
                                                ))
                                        )
                                )
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalQuestions").value(2))
                .andExpect(jsonPath("$.data.questionGroups", hasSize(2)))
                .andExpect(jsonPath("$.data.questionGroups[0].questions[0].explanation").value("See paragraph A"))
                .andExpect(jsonPath("$.data.questionGroups[0].questions[0].options[0].isCorrect").value(true))
                .andExpect(jsonPath("$.data.questionGroups[1].questions[0].options[0].isCorrect").value(true));

        // 6. Replace cleanly with 1 Writing Essay prompt (no options needed)
        mockMvc.perform(put("/api/teacher/exercises/{id}", exerciseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Writing Task 2 Practice",
                                "exerciseType", "PRACTICE",
                                "skillType", "WRITING",
                                "timeLimit", 2400,
                                "maxAttempts", 5,
                                "content", Map.of("task", "QT_W2_DISCUSSION")
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.skillType").value("WRITING"));

        mockMvc.perform(put("/api/teacher/exercises/{id}/questions", exerciseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "questionGroups", List.of(Map.of(
                                        "groupTitle", "Essay Prompt",
                                        "questionType", "ESSAY",
                                        "questions", List.of(Map.of(
                                                "questionText", "Discuss both views and give your opinion.",
                                                "questionType", "ESSAY",
                                                "points", 9,
                                                "options", List.of()
                                        ))
                                ))
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalQuestions").value(1))
                .andExpect(jsonPath("$.data.questionGroups", hasSize(1)));

        // 7. Delete unsubmitted exercise -> 200 with meta.code = 204
        mockMvc.perform(delete("/api/teacher/exercises/{id}", exerciseId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.code").value(204));
    }

    @Test
    void freezeWhilePendingReview_blocksExerciseMutations() throws Exception {
        String createBody = mockMvc.perform(post("/api/teacher/lessons/{lessonId}/exercises", DRAFT_PREVIEW_LESSON)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Speaking Part 2",
                                "exerciseType", "PRACTICE",
                                "skillType", "SPEAKING",
                                "content", Map.of("part", "QT_S_PART2", "prompt", "Describe a book.")
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String exerciseId = objectMapper.readTree(createBody).at("/data/id").asString();

        mockMvc.perform(post("/api/teacher/courses/{id}/submit", DRAFT_COURSE)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/teacher/lessons/{lessonId}/exercises", DRAFT_PREVIEW_LESSON)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Blocked\",\"exerciseType\":\"LESSON\",\"skillType\":\"SPEAKING\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_PENDING_REVIEW"));

        mockMvc.perform(put("/api/teacher/exercises/{id}/questions", exerciseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionGroups\":[]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_PENDING_REVIEW"));

        mockMvc.perform(delete("/api/teacher/exercises/{id}", exerciseId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_PENDING_REVIEW"));
    }

    @Test
    void exerciseWithSubmissions_blocksDeleteQuestionMutationAndTypeChange_butAllowsMetadataEdit() throws Exception {
        String createBody = mockMvc.perform(post("/api/teacher/lessons/{lessonId}/exercises", APPROVED_LESSON)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Submitted Quiz",
                                "exerciseType", "PRACTICE",
                                "skillType", "READING"
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String exerciseId = objectMapper.readTree(createBody).at("/data/id").asString();

        jdbcTemplate.update("""
                INSERT INTO user_submissions (id, user_id, exercise_id, attempt_number, status, score, max_score, submitted_at)
                VALUES (?::uuid, ?::uuid, ?::uuid, 1, 'GRADED', 1.00, 1.00, NOW())
                """, UUID.randomUUID().toString(), STUDENT_ENROLLED_ID, exerciseId);

        mockMvc.perform(delete("/api/teacher/exercises/{id}", exerciseId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EXERCISE_HAS_SUBMISSIONS"));

        mockMvc.perform(put("/api/teacher/exercises/{id}/questions", exerciseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionGroups\":[]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EXERCISE_HAS_SUBMISSIONS"));

        // Changing skillType/exerciseType -> 409
        mockMvc.perform(put("/api/teacher/exercises/{id}", exerciseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Submitted Quiz",
                                "exerciseType", "PRACTICE",
                                "skillType", "LISTENING"
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EXERCISE_HAS_SUBMISSIONS"));

        // Safe metadata update keeping same skill & type -> 200
        mockMvc.perform(put("/api/teacher/exercises/{id}", exerciseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Submitted Quiz (Edited Title)",
                                "instruction", "Updated notes",
                                "exerciseType", "PRACTICE",
                                "skillType", "READING",
                                "maxAttempts", 5
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Submitted Quiz (Edited Title)"))
                .andExpect(jsonPath("$.data.submissionCount").value(1));
    }

    @Test
    void teacherExerciseEndpoints_enforceOwnershipAndRole() throws Exception {
        mockMvc.perform(get("/api/teacher/lessons/{lessonId}/exercises", DRAFT_PREVIEW_LESSON))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/teacher/lessons/{lessonId}/exercises", DRAFT_PREVIEW_LESSON)
                        .with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/teacher/lessons/{lessonId}/exercises", DRAFT_PREVIEW_LESSON)
                        .with(httpBasic("teacher_other", PASSWORD)))
                .andExpect(status().isForbidden());
    }
}
