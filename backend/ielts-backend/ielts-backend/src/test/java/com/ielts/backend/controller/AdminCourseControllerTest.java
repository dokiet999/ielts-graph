package com.ielts.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminCourseControllerTest {

    private static final String READING_COURSE = "10000000-0000-0000-0000-000000000001";
    private static final String LISTENING_COURSE = "10000000-0000-0000-0000-000000000002";
    private static final String INACTIVE_COURSE = "10000000-0000-0000-0000-000000000003";
    private static final String DRAFT_COURSE = "10000000-0000-0000-0000-000000000004";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @Test
    void listCourses_supportsOperationalFilters() throws Exception {
        mockMvc.perform(get("/api/admin/courses").with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(READING_COURSE)))
                .andExpect(jsonPath("$.data[*].id", hasItem(INACTIVE_COURSE)))
                .andExpect(jsonPath("$.data[*].id", hasItem(DRAFT_COURSE)));

        mockMvc.perform(get("/api/admin/courses").with(httpBasic("admin_demo", PASSWORD))
                        .param("status", "DRAFT")
                        .param("isActive", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(INACTIVE_COURSE)));

        mockMvc.perform(get("/api/admin/courses").with(httpBasic("admin_demo", PASSWORD))
                        .param("skill", "READING")
                        .param("q", "Foundations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].id").value(READING_COURSE))
                .andExpect(jsonPath("$.data[0].enrollmentCount").value(greaterThanOrEqualTo(1)));
    }

    @Test
    void setFeatured_allowedOnlyOnApprovedActiveCourses() throws Exception {
        // Toggle featured true on APPROVED + active course -> 200
        mockMvc.perform(patch("/api/admin/courses/{id}/featured", LISTENING_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"featured\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isFeatured").value(true));

        // Toggle back false -> 200
        mockMvc.perform(patch("/api/admin/courses/{id}/featured", LISTENING_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"featured\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isFeatured").value(false));

        // Cannot feature DRAFT course -> 409
        mockMvc.perform(patch("/api/admin/courses/{id}/featured", DRAFT_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"featured\":true}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_NOT_ELIGIBLE_FOR_FEATURED"));

        // Cannot feature inactive course -> 409
        mockMvc.perform(patch("/api/admin/courses/{id}/featured", INACTIVE_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"featured\":true}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_NOT_ELIGIBLE_FOR_FEATURED"));
    }

    @Test
    void deactivateAndActivateCourse_togglesVisibilityWhilePreservingEnrollmentsAndStatus() throws Exception {
        // Blank reason -> 400
        mockMvc.perform(post("/api/admin/courses/{id}/deactivate", READING_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"   \"}"))
                .andExpect(status().isBadRequest());

        // Deactivate -> hides course, turns off featured, preserves APPROVED status & enrollment
        mockMvc.perform(post("/api/admin/courses/{id}/deactivate", READING_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Temporary copyright audit\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(false))
                .andExpect(jsonPath("$.data.isFeatured").value(false))
                .andExpect(jsonPath("$.data.status").value("APPROVED"))
                .andExpect(jsonPath("$.data.deactivationReason").value("Temporary copyright audit"))
                .andExpect(jsonPath("$.data.enrollmentCount").value(greaterThanOrEqualTo(1)));

        // Student sees 404 when hidden
        mockMvc.perform(get("/api/courses/{id}", READING_COURSE)
                        .with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isNotFound());

        // Deactivating again -> 409
        mockMvc.perform(post("/api/admin/courses/{id}/deactivate", READING_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Again\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_ALREADY_INACTIVE"));

        // Reactivate -> visible again and clears reason
        mockMvc.perform(post("/api/admin/courses/{id}/activate", READING_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(true))
                .andExpect(jsonPath("$.data.deactivationReason").value(nullValue()))
                .andExpect(jsonPath("$.data.enrollmentCount").value(greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/courses/{id}", READING_COURSE)
                        .with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk());

        // Activating active course -> 409
        mockMvc.perform(post("/api/admin/courses/{id}/activate", READING_COURSE)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_ALREADY_ACTIVE"));
    }

    @Test
    void adminCourseEndpoints_requireAdminRole() throws Exception {
        mockMvc.perform(get("/api/admin/courses"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/courses").with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isForbidden());
    }
}
