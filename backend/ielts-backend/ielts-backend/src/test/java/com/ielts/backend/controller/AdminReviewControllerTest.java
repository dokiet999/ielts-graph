package com.ielts.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminReviewControllerTest {

    private static final String TEACHER_DEMO_ID = "00000000-0000-0000-0000-000000000001";
    private static final String READING_COURSE = "10000000-0000-0000-0000-000000000001";
    private static final String INACTIVE_COURSE = "10000000-0000-0000-0000-000000000003";
    private static final String DRAFT_COURSE = "10000000-0000-0000-0000-000000000004";
    private static final String GETTING_STARTED_SECTION = "20000000-0000-0000-0000-000000000011";
    private static final String DRAFT_PREVIEW_LESSON = "30000000-0000-0000-0000-000000000411";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    // ---------- Teacher endpoints & course submission ----------

    @Test
    void teacherCourses_andSubmitAuthChecks() throws Exception {
        mockMvc.perform(get("/api/teacher/courses"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(DRAFT_COURSE)))
                .andExpect(jsonPath("$.data[?(@.id == '" + DRAFT_COURSE + "')].status").value(contains("DRAFT")));

        // teacher_other owns no courses and cannot submit teacher_demo's course
        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("teacher_other", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        mockMvc.perform(post("/api/teacher/courses/{id}/submit", DRAFT_COURSE)
                        .with(httpBasic("teacher_other", PASSWORD)))
                .andExpect(status().isForbidden());

        // Owning teacher can view full detail including unapproved lessons; other teachers get 403
        mockMvc.perform(get("/api/teacher/courses/{id}", DRAFT_COURSE)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(DRAFT_COURSE))
                .andExpect(jsonPath("$.data.sections[0].lessons[0].id").value(DRAFT_PREVIEW_LESSON))
                .andExpect(jsonPath("$.data.sections[0].lessons[0].status").value("DRAFT"));

        mockMvc.perform(get("/api/teacher/courses/{id}", DRAFT_COURSE)
                        .with(httpBasic("teacher_other", PASSWORD)))
                .andExpect(status().isForbidden());

        // Inactive course cannot be submitted
        mockMvc.perform(post("/api/teacher/courses/{id}/submit", INACTIVE_COURSE)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_INACTIVE"));
    }

    @Test
    void courseSubmitRejectResubmitApprove_endToEnd() throws Exception {
        // Submit DRAFT_COURSE -> moves course and DRAFT_PREVIEW_LESSON to PENDING_REVIEW
        mockMvc.perform(post("/api/teacher/courses/{id}/submit", DRAFT_COURSE)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_REVIEW"))
                .andExpect(jsonPath("$.data.submittedAt").value(notNullValue()))
                .andExpect(jsonPath("$.data.sections[0].lessons[0].status").value("PENDING_REVIEW"));

        // Submitting again -> 409
        mockMvc.perform(post("/api/teacher/courses/{id}/submit", DRAFT_COURSE)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_SUBMIT_STATUS"));

        // Insert an older pending course to verify oldest submittedAt comes first
        UUID olderCourseId = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO courses (id, teacher_id, title, skill_focus, difficulty_level, is_active, status, submitted_at)
                VALUES (?, ?::uuid, 'Older Pending Course', 'WRITING', 'INTERMEDIATE', TRUE, 'PENDING_REVIEW', NOW() - INTERVAL '3 days')
                """, olderCourseId, TEACHER_DEMO_ID);

        mockMvc.perform(get("/api/admin/reviews/courses").with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id").value(contains(olderCourseId.toString(), DRAFT_COURSE)))
                .andExpect(jsonPath("$.data[1].pendingLessonCount").value(1))
                .andExpect(jsonPath("$.data[1].teacherName").value("Demo Teacher"));

        // Admin course preview includes unapproved lessons
        mockMvc.perform(get("/api/admin/courses/{id}", DRAFT_COURSE).with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_REVIEW"))
                .andExpect(jsonPath("$.data.totalLessons").value(1))
                .andExpect(jsonPath("$.data.sections[0].lessons[0].id").value(DRAFT_PREVIEW_LESSON))
                .andExpect(jsonPath("$.data.sections[0].lessons[0].status").value("PENDING_REVIEW"));

        // Reject without body / blank reason -> 400
        mockMvc.perform(post("/api/admin/courses/{id}/reject", DRAFT_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("REASON_REQUIRED"));

        mockMvc.perform(post("/api/admin/courses/{id}/reject", DRAFT_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("REASON_REQUIRED"));

        // Reject with reason -> both course and bundled lesson become REJECTED, still hidden from students
        mockMvc.perform(post("/api/admin/courses/{id}/reject", DRAFT_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Needs more examples\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.reviewNote").value("Needs more examples"))
                .andExpect(jsonPath("$.data.publishedAt").value(nullValue()))
                .andExpect(jsonPath("$.data.sections[0].lessons[0].status").value("REJECTED"))
                .andExpect(jsonPath("$.data.sections[0].lessons[0].reviewNote").value("Needs more examples"));

        mockMvc.perform(get("/api/courses/{id}", DRAFT_COURSE))
                .andExpect(status().isNotFound());

        // Teacher sees rejection status and reason, then resubmits
        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("teacher_demo", PASSWORD))
                        .param("status", "REJECTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(DRAFT_COURSE))
                .andExpect(jsonPath("$.data[0].reviewNote").value("Needs more examples"));

        mockMvc.perform(post("/api/teacher/courses/{id}/submit", DRAFT_COURSE)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_REVIEW"))
                .andExpect(jsonPath("$.data.reviewNote").value(nullValue()))
                .andExpect(jsonPath("$.data.sections[0].lessons[0].status").value("PENDING_REVIEW"));

        // Approve course -> sets published_at, approves bundled lessons, becomes visible to students
        mockMvc.perform(post("/api/admin/courses/{id}/approve", DRAFT_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"Looks good\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"))
                .andExpect(jsonPath("$.data.publishedAt").value(notNullValue()))
                .andExpect(jsonPath("$.data.reviewNote").value("Looks good"))
                .andExpect(jsonPath("$.data.sections[0].lessons[0].status").value("APPROVED"));

        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(DRAFT_COURSE)));

        mockMvc.perform(post("/api/courses/{id}/enroll", DRAFT_COURSE)
                        .with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/lessons/{id}", DRAFT_PREVIEW_LESSON)
                        .with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk());

        // Approving twice -> 409
        mockMvc.perform(post("/api/admin/courses/{id}/approve", DRAFT_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_REVIEW_STATUS"));
    }

    // ---------- Individual Lesson Review & Exercise Visibility ----------

    @Test
    void pendingLessonInsideApprovedCourse_hiddenUntilApproved_thenVisible() throws Exception {
        UUID newLessonId = UUID.randomUUID();
        UUID newExerciseId = UUID.randomUUID();
        UUID newQuestionId = UUID.randomUUID();

        // Create a new DRAFT preview lesson + exercise + question inside READING_COURSE (which is APPROVED)
        jdbcTemplate.update("""
                INSERT INTO lessons (id, section_id, title, lesson_type, video_url, ordering, is_preview, status)
                VALUES (?, ?::uuid, 'Pending Bonus Lesson', 'VIDEO', 'https://example.com/videos/bonus.mp4', 99, TRUE, 'DRAFT')
                """, newLessonId, GETTING_STARTED_SECTION);

        jdbcTemplate.update("""
                INSERT INTO exercises (id, lesson_id, title, exercise_type, skill_type, ordering)
                VALUES (?, ?, 'Pending Lesson Drill', 'PRACTICE', 'READING', 1)
                """, newExerciseId, newLessonId);

        jdbcTemplate.update("""
                INSERT INTO questions (id, exercise_id, question_text, question_type, ordering)
                VALUES (?, ?, 'Sample question', 'FILL_BLANK', 1)
                """, newQuestionId, newExerciseId);

        // Before approval: hidden everywhere from students, even with is_preview = TRUE or enrolled
        mockMvc.perform(get("/api/lessons/{id}", newLessonId))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/lessons/{id}", newLessonId).with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/courses/{id}", READING_COURSE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalLessons").value(4))
                .andExpect(jsonPath("$.data.exerciseCount").value(1));
        mockMvc.perform(get("/api/courses/{id}/lessons", READING_COURSE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(4)))
                .andExpect(jsonPath("$.data[*].id", not(hasItem(newLessonId.toString()))));

        // Exercises of unapproved lessons are hidden from public & section endpoints and cannot be submitted
        mockMvc.perform(get("/api/exercises/{id}", newExerciseId).with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/exercises").param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", not(hasItem(newExerciseId.toString()))));
        mockMvc.perform(get("/api/sections/{id}/exercises", GETTING_STARTED_SECTION)
                        .with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", not(hasItem(newExerciseId.toString()))));
        mockMvc.perform(post("/api/exercises/{id}/submit", newExerciseId)
                        .with(httpBasic("student_enrolled", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":{}}"))
                .andExpect(status().isNotFound());

        // Admin course detail shows the unapproved lesson
        mockMvc.perform(get("/api/admin/courses/{id}", READING_COURSE).with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalLessons").value(5))
                .andExpect(jsonPath("$.data.sections[0].lessons[*].id", hasItem(newLessonId.toString())));

        // Teacher submits the lesson -> PENDING_REVIEW -> shows up in lesson review queue
        mockMvc.perform(post("/api/teacher/lessons/{id}/submit", newLessonId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_REVIEW"))
                .andExpect(jsonPath("$.data.courseId").value(READING_COURSE));

        mockMvc.perform(get("/api/admin/reviews/lessons").with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(newLessonId.toString())));

        // Reject without reason -> 400
        mockMvc.perform(post("/api/admin/lessons/{id}/reject", newLessonId)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isBadRequest());

        // Reject with reason -> REJECTED, note saved -> teacher resubmits -> PENDING_REVIEW
        mockMvc.perform(post("/api/admin/lessons/{id}/reject", newLessonId)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Missing audio\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.reviewNote").value("Missing audio"));

        mockMvc.perform(post("/api/teacher/lessons/{id}/submit", newLessonId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_REVIEW"));

        // Approve lesson -> APPROVED -> visible in course, lesson, and exercise endpoints
        mockMvc.perform(post("/api/admin/lessons/{id}/approve", newLessonId)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"Approved\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));

        mockMvc.perform(get("/api/lessons/{id}", newLessonId).with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/courses/{id}/lessons", READING_COURSE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(5)))
                .andExpect(jsonPath("$.data[*].id", hasItem(newLessonId.toString())));
        mockMvc.perform(get("/api/exercises/{id}", newExerciseId).with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/sections/{id}/exercises", GETTING_STARTED_SECTION)
                        .with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(newExerciseId.toString())));

        // Approving twice -> 409
        mockMvc.perform(post("/api/admin/lessons/{id}/approve", newLessonId)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_REVIEW_STATUS"));

        assertThat(jdbcTemplate.queryForObject(
                "SELECT status FROM lessons WHERE id = ?", String.class, newLessonId)).isEqualTo("APPROVED");
    }

    @Test
    void lessonOfNonApprovedCourse_cannotBeSubmittedOrApprovedIndividually() throws Exception {
        // Put DRAFT_PREVIEW_LESSON in PENDING_REVIEW while DRAFT_COURSE is still DRAFT
        jdbcTemplate.update("UPDATE lessons SET status = 'PENDING_REVIEW' WHERE id = ?::uuid", DRAFT_PREVIEW_LESSON);

        mockMvc.perform(post("/api/admin/lessons/{id}/approve", DRAFT_PREVIEW_LESSON)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_NOT_APPROVED"));

        // Reset back to DRAFT and try submitting lesson individually
        jdbcTemplate.update("UPDATE lessons SET status = 'DRAFT' WHERE id = ?::uuid", DRAFT_PREVIEW_LESSON);

        mockMvc.perform(post("/api/teacher/lessons/{id}/submit", DRAFT_PREVIEW_LESSON)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_NOT_APPROVED"));
    }

    @Test
    void adminReviewEndpoints_requireAdminRole() throws Exception {
        mockMvc.perform(get("/api/admin/reviews/courses"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/reviews/courses").with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/courses/{id}", DRAFT_COURSE).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/courses/{id}/approve", DRAFT_COURSE)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isForbidden());
    }
}

