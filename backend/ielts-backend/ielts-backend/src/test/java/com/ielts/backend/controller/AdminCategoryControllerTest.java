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

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
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
class AdminCategoryControllerTest {

    private static final String ACADEMIC_CATEGORY_ID = "00000000-0000-0000-0000-0000000000c1";
    private static final String UNKNOWN_ID = "99999999-9999-9999-9999-999999999999";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void publicCategoriesEndpoint_worksWithoutAuthAndExcludesInactive() throws Exception {
        // Create an inactive category as admin
        String createdBody = mockMvc.perform(post("/api/admin/categories")
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Hidden Category",
                                "slug", "hidden-category",
                                "isActive", false,
                                "ordering", 99
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.isActive").value(false))
                .andReturn().getResponse().getContentAsString();
        String hiddenId = objectMapper.readTree(createdBody).at("/data/id").asString();

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(ACADEMIC_CATEGORY_ID)))
                .andExpect(jsonPath("$.data[*].id", not(hasItem(hiddenId))));
    }

    @Test
    void createUpdateSearchAndDeleteCategory_enforcesSlugAndInUseRules() throws Exception {
        // Auto-slugify Vietnamese name
        String body = mockMvc.perform(post("/api/admin/categories")
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Luyện Đề Nâng Cao",
                                "description", "Luyện đề tổng hợp"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.slug").value("luyen-de-nang-cao"))
                .andExpect(jsonPath("$.data.courseCount").value(0))
                .andReturn().getResponse().getContentAsString();
        String createdId = objectMapper.readTree(body).at("/data/id").asString();

        // Duplicate slug -> 409 SLUG_TAKEN
        mockMvc.perform(post("/api/admin/categories")
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Other Name",
                                "slug", "LUYEN-DE-NANG-CAO"
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SLUG_TAKEN"));

        // Invalid explicit slug -> 400 INVALID_SLUG
        mockMvc.perform(post("/api/admin/categories")
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Bad Slug",
                                "slug", "bad slug!"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SLUG"));

        // Search supports literal '%' safely
        mockMvc.perform(get("/api/admin/categories").with(httpBasic("admin_demo", PASSWORD))
                        .param("q", "%"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(0));

        mockMvc.perform(get("/api/admin/categories").with(httpBasic("admin_demo", PASSWORD))
                        .param("q", "nang-cao"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].id").value(createdId));

        // Update category; colliding slug with seeded 'academic' returns 409
        mockMvc.perform(put("/api/admin/categories/{id}", createdId)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Collision",
                                "slug", "academic"
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SLUG_TAKEN"));

        // Valid update
        mockMvc.perform(put("/api/admin/categories/{id}", createdId)
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Luyện Đề Band 8+",
                                "slug", "luyen-de-band-8",
                                "isActive", false,
                                "ordering", 5
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Luyện Đề Band 8+"))
                .andExpect(jsonPath("$.data.slug").value("luyen-de-band-8"))
                .andExpect(jsonPath("$.data.isActive").value(false))
                .andExpect(jsonPath("$.data.ordering").value(5));

        // Deleting in-use Academic category -> 409 CATEGORY_IN_USE
        mockMvc.perform(get("/api/admin/categories").with(httpBasic("admin_demo", PASSWORD))
                        .param("q", "academic"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].courseCount").value(greaterThanOrEqualTo(1)));

        mockMvc.perform(delete("/api/admin/categories/{id}", ACADEMIC_CATEGORY_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CATEGORY_IN_USE"));

        // Deleting unused created category -> 200 with meta.code = 204
        mockMvc.perform(delete("/api/admin/categories/{id}", createdId)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.code").value(204));

        // Deleting unknown -> 404
        mockMvc.perform(delete("/api/admin/categories/{id}", UNKNOWN_ID)
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminCategoryEndpoints_requireAdminRole() throws Exception {
        mockMvc.perform(get("/api/admin/categories"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/categories").with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/categories")
                        .with(httpBasic("student_new", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Blocked\"}"))
                .andExpect(status().isForbidden());
    }
}
