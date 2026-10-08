package com.ielts.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Uses the sample data from V2__seed_sample_courses.sql.
 * Requests are sent without credentials to check the endpoints are public.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CourseLessonControllerTest {

    private static final String READING_COURSE = "10000000-0000-0000-0000-000000000001";
    private static final String LISTENING_COURSE = "10000000-0000-0000-0000-000000000002";
    private static final String INACTIVE_COURSE = "10000000-0000-0000-0000-000000000003";
    private static final String TFNG_LESSON = "30000000-0000-0000-0000-000000000121";
    private static final String INACTIVE_LESSON = "30000000-0000-0000-0000-000000000311";
    private static final String UNKNOWN_ID = "99999999-9999-9999-9999-999999999999";

    @Autowired
    MockMvc mockMvc;

    // ---------- Course listing ----------

    @Test
    void listCourses_returnsOnlyActiveCourses_newestFirst() throws Exception {
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[*].id").value(contains(LISTENING_COURSE, READING_COURSE)))
                .andExpect(jsonPath("$.content[*].id").value(not(hasItem(INACTIVE_COURSE))))
                .andExpect(jsonPath("$.content[0].teacherName").value("Demo Teacher"));
    }

    @Test
    void listCourses_filtersBySkill() throws Exception {
        mockMvc.perform(get("/api/courses").param("skill", "READING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(READING_COURSE))
                .andExpect(jsonPath("$.content[0].categoryName").value("Academic"));
    }

    @Test
    void listCourses_paginates() throws Exception {
        mockMvc.perform(get("/api/courses").param("page", "0").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void listCourses_invalidSkill_returns400() throws Exception {
        mockMvc.perform(get("/api/courses").param("skill", "COOKING"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    // ---------- Course detail ----------

    @Test
    void courseDetail_returnsSectionsAndLessonsInOrder() throws Exception {
        mockMvc.perform(get("/api/courses/{id}", READING_COURSE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.course.title").value("IELTS Reading Foundations"))
                .andExpect(jsonPath("$.totalLessons").value(4))
                .andExpect(jsonPath("$.sections[*].title").value(contains("Getting started", "Question types")))
                .andExpect(jsonPath("$.sections[0].lessons[*].title")
                        .value(contains("Introduction to IELTS Reading", "Skimming and scanning")))
                .andExpect(jsonPath("$.sections[1].lessons[*].title")
                        .value(contains("True / False / Not Given", "Matching headings")));
    }

    @Test
    void courseDetail_inactiveCourse_returns404() throws Exception {
        mockMvc.perform(get("/api/courses/{id}", INACTIVE_COURSE))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void courseDetail_unknownId_returns404() throws Exception {
        mockMvc.perform(get("/api/courses/{id}", UNKNOWN_ID))
                .andExpect(status().isNotFound());
    }

    @Test
    void courseDetail_malformedId_returns400() throws Exception {
        mockMvc.perform(get("/api/courses/{id}", "not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    // ---------- Lesson listing ----------

    @Test
    void courseLessons_returnsFlatListOrderedBySectionThenLesson() throws Exception {
        mockMvc.perform(get("/api/courses/{id}/lessons", READING_COURSE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[*].title").value(contains(
                        "Introduction to IELTS Reading",
                        "Skimming and scanning",
                        "True / False / Not Given",
                        "Matching headings")));
    }

    @Test
    void courseLessons_inactiveCourse_returns404() throws Exception {
        mockMvc.perform(get("/api/courses/{id}/lessons", INACTIVE_COURSE))
                .andExpect(status().isNotFound());
    }

    // ---------- Lesson detail ----------

    @Test
    void lessonDetail_returnsParentInfoAndExercises() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", TFNG_LESSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lesson.title").value("True / False / Not Given"))
                .andExpect(jsonPath("$.lesson.documentUrl").value("https://example.com/docs/tfng.pdf"))
                .andExpect(jsonPath("$.courseId").value(READING_COURSE))
                .andExpect(jsonPath("$.sectionTitle").value("Question types"))
                .andExpect(jsonPath("$.exercises[*].title").value(contains("TFNG practice 1", "TFNG practice 2")))
                .andExpect(jsonPath("$.exercises[0].skillType").value("READING"));
    }

    @Test
    void lessonDetail_lessonOfInactiveCourse_returns404() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", INACTIVE_LESSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void lessonDetail_unknownId_returns404() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", UNKNOWN_ID))
                .andExpect(status().isNotFound());
    }
}
