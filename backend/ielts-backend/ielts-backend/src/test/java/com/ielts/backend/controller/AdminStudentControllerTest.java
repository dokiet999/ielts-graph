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
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminStudentControllerTest {

    private static final String TEACHER_DEMO_ID = "00000000-0000-0000-0000-000000000001";
    private static final String STUDENT_ENROLLED_ID = "00000000-0000-0000-0000-000000000011";
    private static final String STUDENT_NEW_ID = "00000000-0000-0000-0000-000000000012";
    private static final String UNKNOWN_ID = "99999999-9999-9999-9999-999999999999";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @Test
    void listStudents_filtersOnlyStudentsAndReportsEnrollmentCount() throws Exception {
        mockMvc.perform(get("/api/admin/students").with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(STUDENT_ENROLLED_ID)))
                .andExpect(jsonPath("$.data[*].id", not(hasItem(TEACHER_DEMO_ID))));

        mockMvc.perform(get("/api/admin/students").with(httpBasic("admin_demo", PASSWORD))
                        .param("q", "student_enrolled"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].id").value(STUDENT_ENROLLED_ID))
                .andExpect(jsonPath("$.data[0].enrollmentCount").value(greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/admin/students").with(httpBasic("admin_demo", PASSWORD))
                        .param("status", "LOCKED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].status", hasItem("LOCKED")))
                .andExpect(jsonPath("$.data[*].status", not(hasItem("ACTIVE"))));
    }

    @Test
    void lockAndUnlockStudent_updatesLoginAccessAndReason() throws Exception {
        // Blank reason -> 400
        mockMvc.perform(post("/api/admin/students/{id}/lock", STUDENT_NEW_ID)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"  \"}"))
                .andExpect(status().isBadRequest());

        // Lock student -> 200
        mockMvc.perform(post("/api/admin/students/{id}/lock", STUDENT_NEW_ID)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Spam behavior\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("LOCKED"))
                .andExpect(jsonPath("$.data.isActive").value(false))
                .andExpect(jsonPath("$.data.lockReason").value("Spam behavior"));

        // Locked student cannot authenticate
        mockMvc.perform(get("/api/users/me").with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));

        // Lock twice -> 409 ALREADY_LOCKED
        mockMvc.perform(post("/api/admin/students/{id}/lock", STUDENT_NEW_ID)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Again\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_LOCKED"));

        // Unlock -> 200 & clears lockReason
        mockMvc.perform(post("/api/admin/students/{id}/unlock", STUDENT_NEW_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.isActive").value(true))
                .andExpect(jsonPath("$.data.lockReason").value(nullValue()));

        // Student can log in again
        mockMvc.perform(get("/api/users/me").with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk());

        // Unlocking active student -> 409 INVALID_STUDENT_STATUS
        mockMvc.perform(post("/api/admin/students/{id}/unlock", STUDENT_NEW_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_STUDENT_STATUS"));
    }

    @Test
    void studentActions_onTeacherOrUnknownId_return404_andRequireAdmin() throws Exception {
        mockMvc.perform(post("/api/admin/students/{id}/lock", TEACHER_DEMO_ID)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Wrong role\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/admin/students/{id}/unlock", UNKNOWN_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/admin/students"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/students").with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isForbidden());
    }
}
