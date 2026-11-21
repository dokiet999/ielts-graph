package com.ielts.backend.service.profile;

import com.ielts.backend.dto.response.PersonalizationResponse.CriterionGap;
import com.ielts.backend.dto.response.PersonalizationResponse.CriterionProfile;
import com.ielts.backend.dto.response.PersonalizationResponse.PracticeResource;
import com.ielts.backend.dto.response.PersonalizationResponse.SkillProfile;
import com.ielts.backend.dto.response.PersonalizationResponse.Weakness;
import com.ielts.backend.service.kg.KgGraphClient.PrerequisiteRow;
import com.ielts.backend.service.kg.KgGraphClient.SkillStructureRow;
import com.ielts.backend.service.kg.KgGraphClient.SubSkillResourceRow;
import com.ielts.backend.service.profile.PersonalizationAssembler.GradedAttempt;
import com.ielts.backend.service.profile.PersonalizationAssembler.MasteryState;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class PersonalizationAssemblerTest {

    private static final UUID ARTICLE_DRILL = UUID.fromString("60000000-0000-0000-0000-000000000001");
    private static final UUID COLLOCATION_DRILL = UUID.fromString("60000000-0000-0000-0000-000000000008");

    private static final List<SkillStructureRow> WRITING = List.of(
            row("CRIT_W_GRA", "Grammatical Range & Accuracy", "SUB_ARTICLE", "Articles", "ERR_ARTICLE", "Article error"),
            row("CRIT_W_GRA", "Grammatical Range & Accuracy", "SUB_COMPLEX_SENTENCE", "Complex sentences",
                    "ERR_SENT_STRUCTURE", "Sentence structure"),
            row("CRIT_W_GRA", "Grammatical Range & Accuracy", "SUB_VERB_TENSE", "Verb tense", "ERR_VERB_TENSE", "Tense"),
            row("CRIT_W_LR", "Lexical Resource", "SUB_COLLOCATION", "Collocation", "ERR_COLLOCATION", "Collocation"),
            row("CRIT_W_TR", "Task Response", "SUB_IDEA_DEV", "Idea development", "ERR_UNDERDEVELOPED", "Underdeveloped"));

    private static final List<SubSkillResourceRow> RESOURCES = List.of(
            new SubSkillResourceRow("SUB_ARTICLE", "RES_W_ARTICLE_01", "Bài mạo từ", "Articles drill",
                    "exercises:" + ARTICLE_DRILL, List.of("ERR_ARTICLE"), List.of(5)),
            new SubSkillResourceRow("SUB_COLLOCATION", "RES_L_COLLOCATION_01", "Bài collocation", "Collocation drill",
                    "exercises:" + COLLOCATION_DRILL, List.of("ERR_COLLOCATION"), List.of(6)));

    private static SkillStructureRow row(String crit, String critName, String sub, String subName,
                                         String err, String errName) {
        return new SkillStructureRow(crit, critName, critName, sub, subName, subName, err, errName, errName);
    }

    private static GradedAttempt attempt(int day, double band, Map<String, Double> criteria, String... errors) {
        return new GradedAttempt(UUID.randomUUID(), LocalDateTime.of(2026, 10, day, 10, 0), band, criteria,
                Set.of(errors));
    }

    private static Map<String, Double> bands(double gra, double lr, double tr) {
        Map<String, Double> m = new LinkedHashMap<>();
        m.put("CRIT_W_GRA", gra);
        m.put("CRIT_W_LR", lr);
        m.put("CRIT_W_TR", tr);
        return m;
    }

    @Test
    void assemble_statusFollowsTheLatestAttempts_andActiveErrorsRankFirst() {
        List<GradedAttempt> attempts = new ArrayList<>(List.of(
                attempt(1, 5.5, bands(5, 6, 6), "ERR_ARTICLE", "ERR_COLLOCATION"),
                attempt(5, 6.0, bands(6, 6, 6), "ERR_COLLOCATION"),
                attempt(9, 6.0, bands(6, 6, 6), "ERR_COLLOCATION", "ERR_VERB_TENSE"),
                attempt(13, 6.0, bands(6, 6, 6), "ERR_COLLOCATION"),
                attempt(17, 6.5, bands(6, 6, 7))));
        Map<String, MasteryState> states = Map.of(
                "SUB_ARTICLE", new MasteryState(0.55, 5),
                "SUB_COLLOCATION", new MasteryState(0.30, 5),
                "SUB_VERB_TENSE", new MasteryState(0.45, 5));

        SkillProfile profile = PersonalizationAssembler.assemble("WRITING", "SKILL_W", 7.0, attempts, states,
                WRITING, RESOURCES, List.of(), Map.of(COLLOCATION_DRILL, 2));

        // Collocation: gone from the latest attempt only -> IMPROVING; verb tense: 2 clean attempts -> IMPROVING;
        // article: 4 clean attempts -> RESOLVED, listed last
        assertThat(profile.getWeaknesses()).extracting(w -> w.getErrorType().getId())
                .containsExactly("ERR_COLLOCATION", "ERR_VERB_TENSE", "ERR_ARTICLE");
        assertThat(profile.getWeaknesses()).extracting(Weakness::getStatus)
                .containsExactly("IMPROVING", "IMPROVING", "RESOLVED");

        Weakness collocation = profile.getWeaknesses().get(0);
        assertThat(collocation.getOccurrences()).isEqualTo(4);
        assertThat(collocation.getRecentOccurrences()).isEqualTo(2);
        assertThat(collocation.getRecentWindow()).isEqualTo(3);
        assertThat(collocation.getCleanStreak()).isEqualTo(1);
        assertThat(collocation.getCriterion().getId()).isEqualTo("CRIT_W_LR");
        // 0.5 * (1 - 0.30) + 0.3 * 2/3 + 0.2 * min(7.0 - 6.0, 2) / 2 = 0.35 + 0.2 + 0.1
        assertThat(collocation.getPriority()).isCloseTo(0.65, within(1e-9));
        assertThat(collocation.getResources()).extracting(PracticeResource::getResourceId)
                .containsExactly("RES_L_COLLOCATION_01");
        assertThat(collocation.getResources().get(0).isFixesError()).isTrue();
        assertThat(collocation.getResources().get(0).getPracticedCount()).isEqualTo(2);

        assertThat(profile.getCurrentBand()).isCloseTo(6.17, within(1e-9));
        assertThat(profile.getAttemptCount()).isEqualTo(5);
    }

    @Test
    void assemble_errorInTheLatestAttemptIsWeak_andWeakPrerequisiteIsSuggested() {
        List<GradedAttempt> attempts = List.of(
                attempt(1, 6.0, bands(6, 6, 6), "ERR_SENT_STRUCTURE"),
                attempt(5, 6.0, bands(6, 6, 6), "ERR_SENT_STRUCTURE"));
        Map<String, MasteryState> states = Map.of(
                "SUB_COMPLEX_SENTENCE", new MasteryState(0.30, 2),
                "SUB_VERB_TENSE", new MasteryState(0.35, 4));

        SkillProfile profile = PersonalizationAssembler.assemble("WRITING", "SKILL_W", null, attempts, states,
                WRITING, RESOURCES, List.of(new PrerequisiteRow("SUB_VERB_TENSE", "SUB_COMPLEX_SENTENCE")), Map.of());

        Weakness w = profile.getWeaknesses().get(0);
        assertThat(w.getStatus()).isEqualTo("WEAK");
        assertThat(w.getPrerequisite().getId()).isEqualTo("SUB_VERB_TENSE");
        assertThat(w.getPrerequisiteMastery()).isEqualTo(0.35);
        // No target: no gap and no gap list
        assertThat(w.getTargetBand()).isNull();
        assertThat(profile.getGaps()).isEmpty();
    }

    @Test
    void assemble_criterionBelowTargetWithoutErrors_isAGapWithNoActiveError() {
        List<GradedAttempt> attempts = List.of(
                attempt(1, 6.0, bands(6, 6, 6)),
                attempt(5, 6.0, bands(6.5, 6, 6)));

        SkillProfile profile = PersonalizationAssembler.assemble("WRITING", "SKILL_W", 7.0, attempts, Map.of(),
                WRITING, RESOURCES, List.of(), Map.of());

        assertThat(profile.getWeaknesses()).isEmpty();
        assertThat(profile.getGaps()).extracting(g -> g.getCriterion().getId())
                .containsExactly("CRIT_W_TR", "CRIT_W_LR", "CRIT_W_GRA");
        CriterionGap tr = profile.getGaps().get(0);
        assertThat(tr.getGap()).isEqualTo(1.0);
        assertThat(tr.getActiveErrorCount()).isZero();
        // Criteria follow the IELTS order, not the id order
        assertThat(profile.getCriteria()).extracting(c -> c.getCriterion().getId())
                .containsExactly("CRIT_W_TR", "CRIT_W_LR", "CRIT_W_GRA");
        CriterionProfile gra = profile.getCriteria().get(2);
        assertThat(gra.getCurrentBand()).isEqualTo(6.25);
        assertThat(gra.getSubSkills()).allSatisfy(s -> assertThat(s.getMastery()).isNull());
    }

    @Test
    void attemptOf_readsBandsAndErrors_andSkipsPronunciationWithoutScores() {
        Map<String, Object> criteria = new LinkedHashMap<>();
        criteria.put("CRIT_S_FC", Map.of("band", 6, "evidence",
                List.of(Map.of("quote", "um", "error_type", "ERR_LONG_PAUSE"))));
        criteria.put("CRIT_S_P", Map.of("band", 6, "evidence", List.of()));
        Map<String, Object> answers = new LinkedHashMap<>();
        answers.put("pronunciation", null);

        GradedAttempt a = PersonalizationAssembler.attemptOf(UUID.randomUUID(), LocalDateTime.now(),
                new BigDecimal("6.0"), Map.of("criteria", criteria), answers);

        assertThat(a.criterionBands()).containsOnlyKeys("CRIT_S_FC");
        assertThat(a.errorIds()).containsExactly("ERR_LONG_PAUSE");
        assertThat(a.overallBand()).isEqualTo(6.0);
    }
}
