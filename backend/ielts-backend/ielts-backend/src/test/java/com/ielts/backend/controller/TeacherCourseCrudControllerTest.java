package com.ielts.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
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
class TeacherCourseCrudControllerTest {

    private static final String ACADEMIC_CATEGORY_ID = "00000000-0000-0000-0000-0000000000c1";
    private static final String READING_COURSE = "10000000-0000-0000-0000-000000000001";
    private static final String GETTING_STARTED_SECTION = "20000000-0000-0000-0000-000000000011";
    private static final String READING_INTRO_LESSON = "30000000-0000-0000-0000-000000000111";
    private static final String READING_SKIMMING_LESSON = "30000000-0000-0000-0000-000000000112";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void courseSectionLessonCrud_submitEmptyCheck_freezeWhilePending_withdrawAndDelete() throws Exception {
        // 1. Create a DRAFT course -> always DRAFT, not featured, unpublished
        String courseBody = mockMvc.perform(post("/api/teacher/courses")
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryId", ACADEMIC_CATEGORY_ID,
                                "title", "New Teacher Reading Lab",
                                "description", "Draft description",
                                "skillFocus", "READING",
                                "difficultyLevel", "INTERMEDIATE",
                                "estimatedDuration", 320
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.isFeatured").value(false))
                .andExpect(jsonPath("$.data.isActive").value(true))
                .andExpect(jsonPath("$.data.publishedAt").value(nullValue()))
                .andReturn().getResponse().getContentAsString();
        String courseId = objectMapper.readTree(courseBody).at("/data/id").asString();

        // 2. Submitting an empty course -> 400 EMPTY_COURSE
        mockMvc.perform(post("/api/teacher/courses/{id}/submit", courseId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("EMPTY_COURSE"));

        // 3. Add section (auto ordering = 1)
        String sectionBody = mockMvc.perform(post("/api/teacher/courses/{courseId}/sections", courseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Module 1",
                                "description", "Intro module"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("Module 1"))
                .andExpect(jsonPath("$.data.ordering").value(1))
                .andReturn().getResponse().getContentAsString();
        String sectionId = objectMapper.readTree(sectionBody).at("/data/id").asString();

        // 4. Add lesson (auto ordering = 1, status = DRAFT)
        String lessonBody = mockMvc.perform(post("/api/teacher/sections/{sectionId}/lessons", sectionId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Lesson 1",
                                "lessonType", "VIDEO",
                                "videoUrl", "https://example.com/v1.mp4",
                                "videoDuration", 600,
                                "isPreview", true
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.ordering").value(1))
                .andExpect(jsonPath("$.data.isPreview").value(true))
                .andReturn().getResponse().getContentAsString();
        String lessonId = objectMapper.readTree(lessonBody).at("/data/id").asString();

        // 5. Submit course -> PENDING_REVIEW; edits & deletes frozen with 409
        mockMvc.perform(post("/api/teacher/courses/{id}/submit", courseId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_REVIEW"))
                .andExpect(jsonPath("$.data.sections[0].lessons[0].status").value("PENDING_REVIEW"));

        mockMvc.perform(put("/api/teacher/courses/{id}", courseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryId", ACADEMIC_CATEGORY_ID,
                                "title", "Mutated Title",
                                "skillFocus", "READING",
                                "difficultyLevel", "INTERMEDIATE"
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_PENDING_REVIEW"));

        mockMvc.perform(post("/api/teacher/courses/{courseId}/sections", courseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Blocked\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_PENDING_REVIEW"));

        mockMvc.perform(put("/api/teacher/lessons/{id}", lessonId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Blocked\",\"lessonType\":\"VIDEO\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_PENDING_REVIEW"));

        mockMvc.perform(delete("/api/teacher/courses/{id}", courseId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_NOT_DELETABLE"));

        // 6. Withdraw course -> back to DRAFT; edit and delete work again
        mockMvc.perform(post("/api/teacher/courses/{id}/withdraw", courseId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.sections[0].lessons[0].status").value("DRAFT"));

        mockMvc.perform(put("/api/teacher/courses/{id}", courseId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryId", ACADEMIC_CATEGORY_ID,
                                "title", "Updated Draft Course",
                                "skillFocus", "READING",
                                "difficultyLevel", "UPPER_INTERMEDIATE"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Updated Draft Course"));

        mockMvc.perform(put("/api/teacher/sections/{id}", sectionId)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Updated Module\",\"ordering\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Updated Module"))
                .andExpect(jsonPath("$.data.ordering").value(2));

        mockMvc.perform(delete("/api/teacher/lessons/{id}", lessonId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.code").value(204));

        mockMvc.perform(delete("/api/teacher/sections/{id}", sectionId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.code").value(204));

        mockMvc.perform(delete("/api/teacher/courses/{id}", courseId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.code").value(204));

        mockMvc.perform(get("/api/teacher/courses/{id}", courseId)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isNotFound());
    }

    @Test
    void editingApprovedLesson_resetsToDraftAndHidesFromStudentsUntilReapproved() throws Exception {
        // Edit seeded approved lesson -> automatically resets to DRAFT
        mockMvc.perform(put("/api/teacher/lessons/{id}", READING_SKIMMING_LESSON)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Skimming and scanning (Revised)",
                                "lessonType", "VIDEO",
                                "videoUrl", "https://example.com/videos/revised.mp4",
                                "videoDuration", 800,
                                "isPreview", false
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Skimming and scanning (Revised)"))
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.submittedAt").value(nullValue()))
                .andExpect(jsonPath("$.data.reviewedAt").value(nullValue()));

        // Student can no longer view the revised unapproved lesson
        mockMvc.perform(get("/api/lessons/{id}", READING_SKIMMING_LESSON)
                        .with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isNotFound());

        // Submit individual lesson -> PENDING_REVIEW; editing blocked with 409 LESSON_PENDING_REVIEW
        mockMvc.perform(post("/api/teacher/lessons/{id}/submit", READING_SKIMMING_LESSON)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_REVIEW"));

        mockMvc.perform(put("/api/teacher/lessons/{id}", READING_SKIMMING_LESSON)
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Blocked\",\"lessonType\":\"VIDEO\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LESSON_PENDING_REVIEW"));

        // Withdraw lesson back to DRAFT
        mockMvc.perform(post("/api/teacher/lessons/{id}/withdraw", READING_SKIMMING_LESSON)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }

    @Test
    void antiCascadeAndArchive_protectPublishedEnrolledContent() throws Exception {
        mockMvc.perform(delete("/api/teacher/courses/{id}", READING_COURSE)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_NOT_DELETABLE"));

        mockMvc.perform(delete("/api/teacher/sections/{id}", GETTING_STARTED_SECTION)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SECTION_HAS_PROTECTED_LESSONS"));

        mockMvc.perform(delete("/api/teacher/lessons/{id}", READING_INTRO_LESSON)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LESSON_NOT_DELETABLE"));

        // Archive soft-hides course while preserving student enrollments
        mockMvc.perform(post("/api/teacher/courses/{id}/archive", READING_COURSE)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(false))
                .andExpect(jsonPath("$.data.isFeatured").value(false));

        mockMvc.perform(get("/api/courses/{id}", READING_COURSE)
                        .with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/teacher/courses/{id}/archive", READING_COURSE)
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_ALREADY_INACTIVE"));
    }

    @Test
    void ownershipAndRoleChecks_enforceTeacherIsolation() throws Exception {
        // Another teacher gets 403 on update/delete/withdraw/archive
        mockMvc.perform(put("/api/teacher/courses/{id}", READING_COURSE)
                        .with(httpBasic("teacher_other", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryId", ACADEMIC_CATEGORY_ID,
                                "title", "Hijack",
                                "skillFocus", "READING",
                                "difficultyLevel", "INTERMEDIATE"
                        ))))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/teacher/sections/{id}", GETTING_STARTED_SECTION)
                        .with(httpBasic("teacher_other", PASSWORD)))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/teacher/lessons/{id}", READING_INTRO_LESSON)
                        .with(httpBasic("teacher_other", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Hijack\",\"lessonType\":\"VIDEO\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/teacher/courses/{id}/archive", READING_COURSE)
                        .with(httpBasic("teacher_other", PASSWORD)))
                .andExpect(status().isForbidden());

        // Anonymous 401, student & admin 403
        mockMvc.perform(post("/api/teacher/courses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("teacher_other", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }
}
