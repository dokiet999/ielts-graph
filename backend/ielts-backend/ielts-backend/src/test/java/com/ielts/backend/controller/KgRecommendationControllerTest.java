package com.ielts.backend.controller;

import com.ielts.backend.exception.KgUnavailableException;
import com.ielts.backend.service.kg.KgGraphClient;
import com.ielts.backend.service.kg.KgGraphClient.CandidateResourceRow;
import com.ielts.backend.service.kg.KgGraphClient.ErrorClassification;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class KgRecommendationControllerTest {

    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    KgGraphClient kgGraphClient;

    @Test
    void recommendations_validWritingRequest_returns200MatchingSampleContract() throws Exception {
        when(kgGraphClient.classifyErrors(
                eq("SKILL_W"),
                eq(List.of("ERR_ARTICLE", "ERR_NO_OVERVIEW", "ERR_LINKER_OVERUSE", "ERR_LONG_PAUSE"))
        )).thenReturn(List.of(
                new ErrorClassification("ERR_ARTICLE", "Lỗi mạo từ", "Article error", true),
                new ErrorClassification("ERR_NO_OVERVIEW", "Thiếu câu tổng quan", "Missing overview", true),
                new ErrorClassification("ERR_LINKER_OVERUSE", "Lạm dụng từ nối", "Linker overuse", true),
                new ErrorClassification("ERR_LONG_PAUSE", "Ngập ngừng kéo dài", "Long pause", false)
        ));

        when(kgGraphClient.findCandidateResources(
                eq("SKILL_W"),
                eq(List.of("ERR_ARTICLE", "ERR_NO_OVERVIEW", "ERR_LINKER_OVERUSE"))
        )).thenReturn(List.of(
                new CandidateResourceRow(
                        "ERR_ARTICLE", "Lỗi mạo từ", "Article error",
                        "SUB_ARTICLE", "Mạo từ", "Articles",
                        "CRIT_W_GRA", "Phạm vi và độ chính xác ngữ pháp", "Grammatical Range & Accuracy",
                        "RES_W_ARTICLE_01", "Bài tập mạo từ cơ bản", "Basic articles exercise",
                        "exercise", "exercises:60000000-0000-0000-0000-000000000001",
                        true, true, List.of(5)
                ),
                new CandidateResourceRow(
                        "ERR_NO_OVERVIEW", "Thiếu câu tổng quan", "Missing overview",
                        "SUB_OVERVIEW", "Viết tổng quan (overview)", "Writing an overview",
                        "CRIT_W_TA", "Hoàn thành yêu cầu bài", "Task Achievement",
                        "RES_W1_OVERVIEW_01", "Luyện viết câu overview cho biểu đồ đường", "Writing an overview for a line graph",
                        "exercise", "exercises:60000000-0000-0000-0000-000000000012",
                        true, true, List.of(6)
                ),
                new CandidateResourceRow(
                        "ERR_LINKER_OVERUSE", "Lạm dụng từ nối", "Linker overuse",
                        "SUB_LINKING", "Sử dụng từ nối", "Using linking words",
                        "CRIT_W_CC", "Mạch lạc và liên kết", "Coherence & Cohesion",
                        "RES_W_LINKING_01", "Bài tập sử dụng từ nối trong bài luận", "Using linkers in an essay exercise",
                        "exercise", "exercises:60000000-0000-0000-0000-000000000011",
                        true, true, List.of(5, 6)
                )
        ));

        mockMvc.perform(get("/api/kg/recommendations")
                        .with(httpBasic("student_enrolled", PASSWORD))
                        .param("skill", "SKILL_W")
                        .param("errors", "ERR_ARTICLE,ERR_NO_OVERVIEW,ERR_LINKER_OVERUSE,ERR_LONG_PAUSE")
                        .param("band", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skill").value("SKILL_W"))
                .andExpect(jsonPath("$.bandRequested").value(5))
                .andExpect(jsonPath("$.bandApplied").value(5))
                .andExpect(jsonPath("$.recommendations", hasSize(3)))
                .andExpect(jsonPath("$.recommendations[0].resourceId").value("RES_W_ARTICLE_01"))
                .andExpect(jsonPath("$.recommendations[0].bandMatch").value("exact"))
                .andExpect(jsonPath("$.recommendations[0].sqlRef").value("exercises:60000000-0000-0000-0000-000000000001"))
                .andExpect(jsonPath("$.recommendations[0].path.errorType.id").value("ERR_ARTICLE"))
                .andExpect(jsonPath("$.recommendations[0].path.subSkill.id").value("SUB_ARTICLE"))
                .andExpect(jsonPath("$.recommendations[0].path.criterion.id").value("CRIT_W_GRA"))
                .andExpect(jsonPath("$.recommendations[1].resourceId").value("RES_W1_OVERVIEW_01"))
                .andExpect(jsonPath("$.recommendations[1].bandMatch").value("nearest"))
                .andExpect(jsonPath("$.recommendations[2].resourceId").value("RES_W_LINKING_01"))
                .andExpect(jsonPath("$.recommendations[2].bandMatch").value("exact"))
                .andExpect(jsonPath("$.unmatchedErrors", contains("ERR_LONG_PAUSE")));
    }

    @Test
    void recommendations_invalidSkill_returns400KgInvalidParam() throws Exception {
        mockMvc.perform(get("/api/kg/recommendations")
                        .with(httpBasic("student_enrolled", PASSWORD))
                        .param("skill", "SKILL_X")
                        .param("errors", "ERR_ARTICLE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("KG_INVALID_PARAM"));
    }

    @Test
    void recommendations_duplicateErrors_returns400KgInvalidParam() throws Exception {
        mockMvc.perform(get("/api/kg/recommendations")
                        .with(httpBasic("student_enrolled", PASSWORD))
                        .param("skill", "SKILL_W")
                        .param("errors", "ERR_ARTICLE,ERR_ARTICLE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("KG_INVALID_PARAM"));
    }

    @Test
    void recommendations_unknownErrorCode_returns400KgUnknownErrorCodeWithDetails() throws Exception {
        when(kgGraphClient.classifyErrors(eq("SKILL_W"), eq(List.of("ERR_NOPE"))))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/kg/recommendations")
                        .with(httpBasic("student_enrolled", PASSWORD))
                        .param("skill", "SKILL_W")
                        .param("errors", "ERR_NOPE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("KG_UNKNOWN_ERROR_CODE"))
                .andExpect(jsonPath("$.details", contains("ERR_NOPE")));
    }

    @Test
    void recommendations_anonymous_returns401() throws Exception {
        mockMvc.perform(get("/api/kg/recommendations")
                        .param("skill", "SKILL_W")
                        .param("errors", "ERR_ARTICLE"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void recommendations_neo4jDown_returns503KgUnavailable() throws Exception {
        when(kgGraphClient.classifyErrors(eq("SKILL_W"), anyList()))
                .thenThrow(new KgUnavailableException("Neo4j unreachable"));

        mockMvc.perform(get("/api/kg/recommendations")
                        .with(httpBasic("student_enrolled", PASSWORD))
                        .param("skill", "SKILL_W")
                        .param("errors", "ERR_ARTICLE"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("KG_UNAVAILABLE"));
    }
}

