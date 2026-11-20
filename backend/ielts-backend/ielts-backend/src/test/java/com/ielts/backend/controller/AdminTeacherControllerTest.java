package com.ielts.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminTeacherControllerTest {

    private static final String TEACHER_DEMO_ID = "00000000-0000-0000-0000-000000000001";
    private static final String TEACHER_OTHER_ID = "00000000-0000-0000-0000-000000000002";
    private static final String TEACHER_PENDING_ID = "00000000-0000-0000-0000-000000000004";
    private static final String STUDENT_NEW_ID = "00000000-0000-0000-0000-000000000012";
    private static final String UNKNOWN_ID = "99999999-9999-9999-9999-999999999999";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    // ---------- Creation ----------

    @Test
    void createTeacher_withoutPassword_generatesTemporaryPasswordAndAllowsLogin() throws Exception {
        String body = mockMvc.perform(post("/api/admin/teachers")
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "  New.Teacher_1 ",
                                "email", "New.Teacher@ielts-graph.local",
                                "fullName", "  New Teacher  ",
                                "phone", "0901234567",
                                "bio", "IELTS Speaking examiner"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.meta.code").value(201))
                .andExpect(jsonPath("$.data.username").value("new.teacher_1"))
                .andExpect(jsonPath("$.data.email").value("new.teacher@ielts-graph.local"))
                .andExpect(jsonPath("$.data.fullName").value("New Teacher"))
                .andExpect(jsonPath("$.data.role").value("TEACHER"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.isActive").value(true))
                .andExpect(jsonPath("$.data.emailVerified").value(false))
                .andExpect(jsonPath("$.data.temporaryPassword").isString())
                .andReturn().getResponse().getContentAsString();

        JsonNode data = objectMapper.readTree(body).at("/data");
        String tempPassword = data.get("temporaryPassword").asString();
        assertThat(tempPassword).hasSize(12);

        // New teacher can log in immediately with the normalized username and temporary password
        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("new.teacher_1", tempPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        // Listing must never expose temporaryPassword
        mockMvc.perform(get("/api/admin/teachers").with(httpBasic("admin_demo", PASSWORD))
                        .param("q", "new.teacher_1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].temporaryPassword").doesNotExist());
    }

    @Test
    void createTeacher_withExplicitPassword_omitsTemporaryPasswordAndAllowsLogin() throws Exception {
        mockMvc.perform(post("/api/admin/teachers")
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "explicit_teacher",
                                "email", "explicit.teacher@ielts-graph.local",
                                "fullName", "Explicit Teacher",
                                "password", "StrongPass@123"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.username").value("explicit_teacher"))
                .andExpect(jsonPath("$.data.temporaryPassword").doesNotExist());

        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("explicit_teacher", "StrongPass@123")))
                .andExpect(status().isOk());
    }

    @Test
    void createTeacher_duplicateUsername_returns409() throws Exception {
        mockMvc.perform(post("/api/admin/teachers")
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "TEACHER_DEMO",
                                "email", "unique.email@ielts-graph.local",
                                "fullName", "Duplicate Username"
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("USERNAME_TAKEN"));
    }

    @Test
    void createTeacher_duplicateEmailCaseInsensitive_returns409() throws Exception {
        mockMvc.perform(post("/api/admin/teachers")
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "unique_teacher",
                                "email", "TEACHER.DEMO@ielts-graph.local",
                                "fullName", "Duplicate Email"
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
    }

    @Test
    void createTeacher_invalidInputs_return400() throws Exception {
        // Invalid username characters
        mockMvc.perform(post("/api/admin/teachers")
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "bad username!",
                                "email", "valid@ielts-graph.local",
                                "fullName", "Valid Name"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_USERNAME"));

        // Invalid email
        mockMvc.perform(post("/api/admin/teachers")
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "valid_name",
                                "email", "not-an-email",
                                "fullName", "Valid Name"
                        ))))
                .andExpect(status().isBadRequest());

        // Blank fullName
        mockMvc.perform(post("/api/admin/teachers")
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "valid_name",
                                "email", "valid@ielts-graph.local",
                                "fullName", "   "
                        ))))
                .andExpect(status().isBadRequest());

        // Too-short explicit password
        mockMvc.perform(post("/api/admin/teachers")
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "valid_name",
                                "email", "valid@ielts-graph.local",
                                "fullName", "Valid Name",
                                "password", "short"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PASSWORD"));
    }

    // ---------- Listing & Filtering ----------

    @Test
    void listTeachers_filtersSearchesAndPaginates_onlyTeachersReturned() throws Exception {
        mockMvc.perform(get("/api/admin/teachers").with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(3))
                .andExpect(jsonPath("$.data[*].id").value(not(hasItem(STUDENT_NEW_ID))))
                .andExpect(jsonPath("$.data[*].role").value(contains("TEACHER", "TEACHER", "TEACHER")));

        mockMvc.perform(get("/api/admin/teachers").with(httpBasic("admin_demo", PASSWORD))
                        .param("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].id").value(TEACHER_PENDING_ID));

        mockMvc.perform(get("/api/admin/teachers").with(httpBasic("admin_demo", PASSWORD))
                        .param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(2))
                .andExpect(jsonPath("$.data[*].id").value(not(hasItem(TEACHER_PENDING_ID))));

        mockMvc.perform(get("/api/admin/teachers").with(httpBasic("admin_demo", PASSWORD))
                        .param("q", "other"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].id").value(TEACHER_OTHER_ID));

        // Literal '%' wildcard must not match everything
        mockMvc.perform(get("/api/admin/teachers").with(httpBasic("admin_demo", PASSWORD))
                        .param("q", "%"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(0));

        // Pagination
        mockMvc.perform(get("/api/admin/teachers").with(httpBasic("admin_demo", PASSWORD))
                        .param("page", "0")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.meta.total").value(3))
                .andExpect(jsonPath("$.meta.page").value(0))
                .andExpect(jsonPath("$.meta.size").value(2));
    }

    // ---------- Approve / Lock / Unlock ----------

    @Test
    void approveTeacher_pendingBecomesActiveAndCanLogin_twiceReturns409() throws Exception {
        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("teacher_pending", PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_PENDING"));

        mockMvc.perform(post("/api/admin/teachers/{id}/approve", TEACHER_PENDING_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.isActive").value(true));

        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("teacher_pending", PASSWORD)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/admin/teachers/{id}/approve", TEACHER_PENDING_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_TEACHER_STATUS"));
    }

    @Test
    void lockAndUnlockTeacher_updatesLoginAccessAndReason() throws Exception {
        // Missing/blank reason -> 400
        mockMvc.perform(post("/api/admin/teachers/{id}/lock", TEACHER_DEMO_ID)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"   \"}"))
                .andExpect(status().isBadRequest());

        // Lock with reason -> 200
        mockMvc.perform(post("/api/admin/teachers/{id}/lock", TEACHER_DEMO_ID)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Policy violation\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("LOCKED"))
                .andExpect(jsonPath("$.data.isActive").value(false))
                .andExpect(jsonPath("$.data.lockReason").value("Policy violation"));

        // Locked teacher cannot log in
        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));

        // Locking again -> 409
        mockMvc.perform(post("/api/admin/teachers/{id}/lock", TEACHER_DEMO_ID)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Again\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_LOCKED"));

        // Unlock -> 200 & clears reason
        mockMvc.perform(post("/api/admin/teachers/{id}/unlock", TEACHER_DEMO_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.isActive").value(true))
                .andExpect(jsonPath("$.data.lockReason").value(nullValue()));

        // Teacher can log in again
        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk());

        // Unlocking ACTIVE teacher -> 409
        mockMvc.perform(post("/api/admin/teachers/{id}/unlock", TEACHER_DEMO_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_TEACHER_STATUS"));
    }

    @Test
    void teacherActions_onStudentOrUnknownId_return404() throws Exception {
        mockMvc.perform(post("/api/admin/teachers/{id}/approve", STUDENT_NEW_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/admin/teachers/{id}/lock", STUDENT_NEW_ID)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Test\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/admin/teachers/{id}/unlock", UNKNOWN_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isNotFound());
    }

    // ---------- Detail, Update & Reset Password ----------

    @Test
    void getTeacher_returnsTeacherDetailWithCourseCount_and404ForStudentOrUnknown() throws Exception {
        mockMvc.perform(get("/api/admin/teachers/{id}", TEACHER_DEMO_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(TEACHER_DEMO_ID))
                .andExpect(jsonPath("$.data.username").value("teacher_demo"))
                .andExpect(jsonPath("$.data.courseCount").isNumber())
                .andExpect(jsonPath("$.data.temporaryPassword").doesNotExist());

        mockMvc.perform(get("/api/admin/teachers/{id}", STUDENT_NEW_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/admin/teachers/{id}", UNKNOWN_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateTeacher_updatesProfileFieldsAndRejectsDuplicateEmail() throws Exception {
        mockMvc.perform(put("/api/admin/teachers/{id}", TEACHER_DEMO_ID)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "TEACHER.DEMO@ielts-graph.local",
                                "fullName", "  Updated Teacher Name ",
                                "phone", "0912345678",
                                "bio", "Updated bio"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("teacher_demo"))
                .andExpect(jsonPath("$.data.role").value("TEACHER"))
                .andExpect(jsonPath("$.data.email").value("teacher.demo@ielts-graph.local"))
                .andExpect(jsonPath("$.data.fullName").value("Updated Teacher Name"))
                .andExpect(jsonPath("$.data.phone").value("0912345678"))
                .andExpect(jsonPath("$.data.bio").value("Updated bio"));

        // Email taken by teacher_other -> 409
        mockMvc.perform(put("/api/admin/teachers/{id}", TEACHER_DEMO_ID)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "teacher.other@ielts-graph.local",
                                "fullName", "Updated Teacher Name"
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));

        // Non-teacher / unknown -> 404
        mockMvc.perform(put("/api/admin/teachers/{id}", STUDENT_NEW_ID)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "valid@ielts-graph.local",
                                "fullName", "Someone"
                        ))))
                .andExpect(status().isNotFound());
    }

    @Test
    void resetTeacherPassword_returnsOneTimeTempPasswordAndReplacesOldPassword() throws Exception {
        String body = mockMvc.perform(post("/api/admin/teachers/{id}/reset-password", TEACHER_DEMO_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(TEACHER_DEMO_ID))
                .andExpect(jsonPath("$.data.temporaryPassword").isString())
                .andReturn().getResponse().getContentAsString();

        String tempPassword = objectMapper.readTree(body).at("/data/temporaryPassword").asString();
        assertThat(tempPassword).hasSize(12);

        // Old password no longer works
        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isUnauthorized());

        // New temporary password works
        mockMvc.perform(get("/api/teacher/courses").with(httpBasic("teacher_demo", tempPassword)))
                .andExpect(status().isOk());

        // Subsequent detail fetch omits temporaryPassword
        mockMvc.perform(get("/api/admin/teachers/{id}", TEACHER_DEMO_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.temporaryPassword").doesNotExist());
    }

    // ---------- Authorization ----------

    @Test
    void adminTeacherEndpoints_requireAdminRole() throws Exception {
        mockMvc.perform(get("/api/admin/teachers"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/teachers").with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/teachers").with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/teachers")
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"x_teacher\",\"email\":\"x@ielts.local\",\"fullName\":\"X\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void currentUserProfile_returnsAuthenticatedAccountByRole() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/users/me").with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("admin_demo"))
                .andExpect(jsonPath("$.data.role").value("ADMIN"));

        mockMvc.perform(get("/api/users/me").with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("teacher_demo"))
                .andExpect(jsonPath("$.data.role").value("TEACHER"));

        mockMvc.perform(get("/api/users/me").with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("student_enrolled"))
                .andExpect(jsonPath("$.data.role").value("STUDENT"));
    }
}

