package com.ielts.backend.service.implement;

import com.ielts.backend.dto.response.KgRecommendationResponse;
import com.ielts.backend.dto.response.KgRecommendationResponse.RecommendationItem;
import com.ielts.backend.exception.BadRequestException;
import com.ielts.backend.service.kg.KgGraphClient;
import com.ielts.backend.service.kg.KgGraphClient.CandidateResourceRow;
import com.ielts.backend.service.kg.KgGraphClient.ErrorClassification;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class KgRecommendationServiceImplTest {

    private StubKgGraphClient graphClient;
    private KgRecommendationServiceImpl service;

    @BeforeEach
    void setUp() {
        graphClient = new StubKgGraphClient();
        service = new KgRecommendationServiceImpl(graphClient);
    }

    @Test
    void section7_row1_writingSample_returnsExpectedRecommendationsAndUnmatched() {
        seedStandardGraphFixtures();

        KgRecommendationResponse res = service.getRecommendations(
                "SKILL_W",
                "ERR_ARTICLE,ERR_NO_OVERVIEW,ERR_LINKER_OVERUSE,ERR_LONG_PAUSE",
                "5",
                null
        );

        assertThat(res.getSkill()).isEqualTo("SKILL_W");
        assertThat(res.getBandRequested()).isEqualTo(5);
        assertThat(res.getBandApplied()).isEqualTo(5);
        assertThat(res.getUnmatchedErrors()).containsExactly("ERR_LONG_PAUSE");
        assertThat(res.getRecommendations()).hasSize(3);

        RecommendationItem r0 = res.getRecommendations().get(0);
        assertThat(r0.getResourceId()).isEqualTo("RES_W_ARTICLE_01");
        assertThat(r0.getNameVi()).isEqualTo("Bài tập mạo từ cơ bản");
        assertThat(r0.getNameEn()).isEqualTo("Basic articles exercise");
        assertThat(r0.getType()).isEqualTo("exercise");
        assertThat(r0.getSqlRef()).isEqualTo("exercises:60000000-0000-0000-0000-000000000001");
        assertThat(r0.getBandMatch()).isEqualTo("exact");
        assertThat(r0.getPath().getErrorType().getId()).isEqualTo("ERR_ARTICLE");
        assertThat(r0.getPath().getSubSkill().getId()).isEqualTo("SUB_ARTICLE");
        assertThat(r0.getPath().getCriterion().getId()).isEqualTo("CRIT_W_GRA");

        RecommendationItem r1 = res.getRecommendations().get(1);
        assertThat(r1.getResourceId()).isEqualTo("RES_W1_OVERVIEW_01");
        assertThat(r1.getBandMatch()).isEqualTo("nearest");
        assertThat(r1.getPath().getErrorType().getId()).isEqualTo("ERR_NO_OVERVIEW");
        assertThat(r1.getPath().getSubSkill().getId()).isEqualTo("SUB_OVERVIEW");
        assertThat(r1.getPath().getCriterion().getId()).isEqualTo("CRIT_W_TA");

        RecommendationItem r2 = res.getRecommendations().get(2);
        assertThat(r2.getResourceId()).isEqualTo("RES_W_LINKING_01");
        assertThat(r2.getBandMatch()).isEqualTo("exact");
        assertThat(r2.getPath().getErrorType().getId()).isEqualTo("ERR_LINKER_OVERUSE");
        assertThat(r2.getPath().getSubSkill().getId()).isEqualTo("SUB_LINKING");
        assertThat(r2.getPath().getCriterion().getId()).isEqualTo("CRIT_W_CC");
    }

    @Test
    void section7_row2_speakingSample_excludesWritingResourceAndMarksWritingErrorUnmatched() {
        seedStandardGraphFixtures();

        KgRecommendationResponse res = service.getRecommendations(
                "SKILL_S",
                "ERR_LINKER_OVERUSE,ERR_SHORT_ANSWER,ERR_NO_OVERVIEW",
                "5",
                null
        );

        assertThat(res.getSkill()).isEqualTo("SKILL_S");
        assertThat(res.getUnmatchedErrors()).containsExactly("ERR_NO_OVERVIEW");
        assertThat(res.getRecommendations()).extracting(RecommendationItem::getResourceId)
                .containsExactly("RES_S_DISCOURSE_01", "RES_S_PART2_01");
        assertThat(res.getRecommendations().get(0).getBandMatch()).isEqualTo("nearest");
        assertThat(res.getRecommendations().get(0).getPath().getCriterion().getId()).isEqualTo("CRIT_S_FC");
        assertThat(res.getRecommendations().get(0).getPath().getSubSkill().getId()).isEqualTo("SUB_DISCOURSE_MARKER");
        assertThat(res.getRecommendations().get(1).getBandMatch()).isEqualTo("exact");
        assertThat(res.getRecommendations().get(1).getPath().getCriterion().getId()).isEqualTo("CRIT_S_FC");
        assertThat(res.getRecommendations().get(1).getPath().getSubSkill().getId()).isEqualTo("SUB_ANSWER_EXTEND");
    }

    @Test
    void section7_row3_writingLinkerOveruse_doesNotReturnSpeakingDrill() {
        seedStandardGraphFixtures();

        KgRecommendationResponse res = service.getRecommendations(
                "SKILL_W", "ERR_LINKER_OVERUSE", "5", null);

        assertThat(res.getRecommendations()).extracting(RecommendationItem::getResourceId)
                .containsExactly("RES_W_LINKING_01");
    }

    @Test
    void section7_row4_omittedBand_returnsNullBandsAndAnyMatch() {
        seedStandardGraphFixtures();

        KgRecommendationResponse res = service.getRecommendations(
                "SKILL_W", "ERR_ARTICLE", null, null);

        assertThat(res.getBandRequested()).isNull();
        assertThat(res.getBandApplied()).isNull();
        assertThat(res.getRecommendations()).hasSize(1);
        assertThat(res.getRecommendations().get(0).getBandMatch()).isEqualTo("any");
    }

    @Test
    void section7_row5_bandClampingAbove8_andBelow4() {
        seedStandardGraphFixtures();

        KgRecommendationResponse high = service.getRecommendations(
                "SKILL_W", "ERR_ARTICLE", "9", null);
        assertThat(high.getBandRequested()).isEqualTo(9);
        assertThat(high.getBandApplied()).isEqualTo(8);
        assertThat(high.getRecommendations().get(0).getBandMatch()).isEqualTo("nearest");

        KgRecommendationResponse low = service.getRecommendations(
                "SKILL_W", "ERR_ARTICLE", "2", null);
        assertThat(low.getBandRequested()).isEqualTo(2);
        assertThat(low.getBandApplied()).isEqualTo(4);
        assertThat(low.getRecommendations().get(0).getBandMatch()).isEqualTo("nearest");
    }

    @Test
    void ordering_fixesFirst_thenExactBeforeNearest_thenSmallerDistance_thenLowerBand_thenResourceId() {
        graphClient.putClassification("SKILL_W", new ErrorClassification("ERR_TEST", "Lỗi", "Error", true));
        graphClient.putCandidates("SKILL_W", "ERR_TEST", List.of(
                // 4. PRACTICES only, exact band 6
                row("ERR_TEST", "SUB_A", "CRIT_W_GRA", "RES_04_PRACTICE_EXACT", false, true, List.of(6)),
                // 3. FIXES, nearest band 7 (distance 1 from 6, higher band tie-break)
                row("ERR_TEST", "SUB_A", "CRIT_W_GRA", "RES_03_FIX_BAND7", true, true, List.of(7)),
                // 2. FIXES, nearest band 5 (distance 1 from 6, lower band wins tie!)
                row("ERR_TEST", "SUB_A", "CRIT_W_GRA", "RES_02_FIX_BAND5", true, true, List.of(5)),
                // 1. FIXES, exact band 6
                row("ERR_TEST", "SUB_A", "CRIT_W_GRA", "RES_01_FIX_EXACT", true, true, List.of(6))
        ));

        KgRecommendationResponse res = service.getRecommendations(
                "SKILL_W", "ERR_TEST", "6", "5");

        assertThat(res.getRecommendations()).extracting(RecommendationItem::getResourceId)
                .containsExactly(
                        "RES_01_FIX_EXACT",
                        "RES_02_FIX_BAND5",
                        "RES_03_FIX_BAND7",
                        "RES_04_PRACTICE_EXACT"
                );
    }

    @Test
    void deduplicationPerResource_prefersPracticesSubSkillTrue_thenSmallestSubSkillId_andLimitsPerError() {
        graphClient.putClassification("SKILL_W", new ErrorClassification("ERR_TEST", "Lỗi", "Error", true));
        graphClient.putCandidates("SKILL_W", "ERR_TEST", List.of(
                // Same resource matched via two SubSkills: SUB_Z (practices=false) and SUB_B (practices=true)
                row("ERR_TEST", "SUB_A", "CRIT_W_GRA", "RES_DUP", true, false, List.of(5)),
                row("ERR_TEST", "SUB_B", "CRIT_W_GRA", "RES_DUP", true, true, List.of(5)),
                row("ERR_TEST", "SUB_B", "CRIT_W_GRA", "RES_OTHER_1", true, true, List.of(5)),
                row("ERR_TEST", "SUB_B", "CRIT_W_GRA", "RES_OTHER_2", true, true, List.of(5))
        ));

        KgRecommendationResponse res = service.getRecommendations(
                "SKILL_W", "ERR_TEST", "5", "2");

        assertThat(res.getRecommendations()).hasSize(2);
        assertThat(res.getRecommendations().get(0).getResourceId()).isEqualTo("RES_DUP");
        assertThat(res.getRecommendations().get(0).getPath().getSubSkill().getId()).isEqualTo("SUB_B");
    }

    @Test
    void unknownErrorCode_throwsKgUnknownErrorCodeWithDetails() {
        seedStandardGraphFixtures();

        assertThatThrownBy(() -> service.getRecommendations("SKILL_W", "ERR_ARTICLE,ERR_NOPE", "5", null))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> {
                    BadRequestException bad = (BadRequestException) ex;
                    assertThat(bad.getCode()).isEqualTo("KG_UNKNOWN_ERROR_CODE");
                    assertThat(bad.getDetails()).isEqualTo(List.of("ERR_NOPE"));
                });
    }

    @Test
    void invalidParams_throwKgInvalidParam() {
        assertThatInvalidParam(null, "ERR_ARTICLE", "5", "3");
        assertThatInvalidParam("SKILL_X", "ERR_ARTICLE", "5", "3");
        assertThatInvalidParam("SKILL_W", null, "5", "3");
        assertThatInvalidParam("SKILL_W", "   ", "5", "3");
        assertThatInvalidParam("SKILL_W", "ERR_ARTICLE,", "5", "3");
        assertThatInvalidParam("SKILL_W", "ERR_ARTICLE,ERR_ARTICLE", "5", "3");
        assertThatInvalidParam("SKILL_W", "E1,E2,E3,E4,E5,E6,E7,E8,E9,E10,E11", "5", "3");
        assertThatInvalidParam("SKILL_W", "ERR_ARTICLE", "not-an-int", "3");
        assertThatInvalidParam("SKILL_W", "ERR_ARTICLE", "5", "0");
        assertThatInvalidParam("SKILL_W", "ERR_ARTICLE", "5", "6");
        assertThatInvalidParam("SKILL_W", "ERR_ARTICLE", "5", "abc");
    }

    private void assertThatInvalidParam(String skill, String errors, String band, String limit) {
        assertThatThrownBy(() -> service.getRecommendations(skill, errors, band, limit))
                .isInstanceOf(BadRequestException.class)
                .extracting(ex -> ((BadRequestException) ex).getCode())
                .isEqualTo("KG_INVALID_PARAM");
    }

    private CandidateResourceRow row(
            String errorId,
            String subSkillId,
            String criterionId,
            String resourceId,
            boolean fixes,
            boolean practicesSubSkill,
            List<Integer> bands
    ) {
        return new CandidateResourceRow(
                errorId, "Vi " + errorId, "En " + errorId,
                subSkillId, "Vi " + subSkillId, "En " + subSkillId,
                criterionId, "Vi " + criterionId, "En " + criterionId,
                resourceId, "Vi " + resourceId, "En " + resourceId,
                "exercise", "exercises:60000000-0000-0000-0000-000000000001",
                fixes, practicesSubSkill, bands
        );
    }

    private void seedStandardGraphFixtures() {
        // SKILL_W classifications
        graphClient.putClassification("SKILL_W",
                new ErrorClassification("ERR_ARTICLE", "Lỗi mạo từ", "Article error", true));
        graphClient.putClassification("SKILL_W",
                new ErrorClassification("ERR_NO_OVERVIEW", "Thiếu câu tổng quan", "Missing overview", true));
        graphClient.putClassification("SKILL_W",
                new ErrorClassification("ERR_LINKER_OVERUSE", "Lạm dụng từ nối", "Linker overuse", true));
        graphClient.putClassification("SKILL_W",
                new ErrorClassification("ERR_LONG_PAUSE", "Ngập ngừng kéo dài", "Long pause", false));

        // SKILL_S classifications
        graphClient.putClassification("SKILL_S",
                new ErrorClassification("ERR_LINKER_OVERUSE", "Lạm dụng từ nối", "Linker overuse", true));
        graphClient.putClassification("SKILL_S",
                new ErrorClassification("ERR_SHORT_ANSWER", "Câu trả lời quá ngắn", "Answer too short", true));
        graphClient.putClassification("SKILL_S",
                new ErrorClassification("ERR_NO_OVERVIEW", "Thiếu câu tổng quan", "Missing overview", false));

        // SKILL_W candidates
        graphClient.putCandidates("SKILL_W", "ERR_ARTICLE", List.of(
                new CandidateResourceRow(
                        "ERR_ARTICLE", "Lỗi mạo từ", "Article error",
                        "SUB_ARTICLE", "Mạo từ", "Articles",
                        "CRIT_W_GRA", "Phạm vi và độ chính xác ngữ pháp", "Grammatical Range & Accuracy",
                        "RES_W_ARTICLE_01", "Bài tập mạo từ cơ bản", "Basic articles exercise",
                        "exercise", "exercises:60000000-0000-0000-0000-000000000001",
                        true, true, List.of(5)
                )
        ));
        graphClient.putCandidates("SKILL_W", "ERR_NO_OVERVIEW", List.of(
                new CandidateResourceRow(
                        "ERR_NO_OVERVIEW", "Thiếu câu tổng quan", "Missing overview",
                        "SUB_OVERVIEW", "Viết tổng quan (overview)", "Writing an overview",
                        "CRIT_W_TA", "Hoàn thành yêu cầu bài", "Task Achievement",
                        "RES_W1_OVERVIEW_01", "Luyện viết câu overview cho biểu đồ đường", "Writing an overview for a line graph",
                        "exercise", "exercises:60000000-0000-0000-0000-000000000012",
                        true, true, List.of(6)
                )
        ));
        graphClient.putCandidates("SKILL_W", "ERR_LINKER_OVERUSE", List.of(
                new CandidateResourceRow(
                        "ERR_LINKER_OVERUSE", "Lạm dụng từ nối", "Linker overuse",
                        "SUB_LINKING", "Sử dụng từ nối", "Using linking words",
                        "CRIT_W_CC", "Mạch lạc và liên kết", "Coherence & Cohesion",
                        "RES_W_LINKING_01", "Bài tập sử dụng từ nối trong bài luận", "Using linkers in an essay exercise",
                        "exercise", "exercises:60000000-0000-0000-0000-000000000011",
                        true, true, List.of(5, 6)
                )
        ));

        // SKILL_S candidates
        graphClient.putCandidates("SKILL_S", "ERR_LINKER_OVERUSE", List.of(
                new CandidateResourceRow(
                        "ERR_LINKER_OVERUSE", "Lạm dụng từ nối", "Linker overuse",
                        "SUB_DISCOURSE_MARKER", "Từ nối khi nói", "Spoken discourse markers",
                        "CRIT_S_FC", "Độ trôi chảy và mạch lạc", "Fluency & Coherence",
                        "RES_S_DISCOURSE_01", "Luyện từ nối khi nói", "Spoken discourse markers exercise",
                        "exercise", "exercises:60000000-0000-0000-0000-000000000021",
                        true, true, List.of(6)
                )
        ));
        graphClient.putCandidates("SKILL_S", "ERR_SHORT_ANSWER", List.of(
                new CandidateResourceRow(
                        "ERR_SHORT_ANSWER", "Câu trả lời quá ngắn", "Answer too short",
                        "SUB_ANSWER_EXTEND", "Mở rộng câu trả lời", "Extending answers",
                        "CRIT_S_FC", "Độ trôi chảy và mạch lạc", "Fluency & Coherence",
                        "RES_S_PART2_01", "Luyện kéo dài câu trả lời Part 2", "Extending answers in Part 2",
                        "exercise", "exercises:60000000-0000-0000-0000-000000000020",
                        true, true, List.of(5)
                )
        ));
    }

    private static class StubKgGraphClient extends KgGraphClient {
        private final Map<String, Map<String, ErrorClassification>> classifications = new HashMap<>();
        private final Map<String, Map<String, List<CandidateResourceRow>>> candidates = new HashMap<>();

        StubKgGraphClient() {
            super(null);
        }

        void putClassification(String skill, ErrorClassification c) {
            classifications.computeIfAbsent(skill, k -> new HashMap<>()).put(c.id(), c);
        }

        void putCandidates(String skill, String errorId, List<CandidateResourceRow> rows) {
            candidates.computeIfAbsent(skill, k -> new HashMap<>()).put(errorId, rows);
        }

        @Override
        public List<ErrorClassification> classifyErrors(String skill, List<String> errors) {
            Map<String, ErrorClassification> byId = classifications.getOrDefault(skill, Map.of());
            List<ErrorClassification> result = new ArrayList<>();
            for (String err : errors) {
                ErrorClassification c = byId.get(err);
                if (c != null) {
                    result.add(c);
                }
            }
            return result;
        }

        @Override
        public List<CandidateResourceRow> findCandidateResources(String skill, List<String> errors) {
            Map<String, List<CandidateResourceRow>> byErr = candidates.getOrDefault(skill, Map.of());
            List<CandidateResourceRow> result = new ArrayList<>();
            for (String err : errors) {
                result.addAll(byErr.getOrDefault(err, List.of()));
            }
            return result;
        }
    }
}

