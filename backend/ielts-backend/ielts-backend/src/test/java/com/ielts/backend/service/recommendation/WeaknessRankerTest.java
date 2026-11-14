package com.ielts.backend.service.recommendation;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class WeaknessRankerTest {

    private static final SkillStructure KG = new SkillStructure(
            Map.of("SUB_ARTICLE", List.of("CRIT_W_GRA", "CRIT_S_GRA"),
                    "SUB_COLLOCATION", List.of("CRIT_W_LR"),
                    "SUB_FLUENCY", List.of("CRIT_S_FC")),
            Map.of("CRIT_W_GRA", "SKILL_W", "CRIT_S_GRA", "SKILL_S", "CRIT_W_LR", "SKILL_W", "CRIT_S_FC", "SKILL_S"));

    private static LearnerSnapshot snapshot(Map<String, Double> bands, Map<String, Double> targets,
                                            SubSkillEvidence... evidence) {
        return new LearnerSnapshot(List.of(evidence), bands, targets);
    }

    @Test
    void latestAttempt_putsOnlyTheErrorsOfTheLatestAttemptFirst() {
        LearnerSnapshot s = snapshot(Map.of(), Map.of(),
                new SubSkillEvidence("SUB_ARTICLE", 0.2, 9, 3, 3, false),
                new SubSkillEvidence("SUB_COLLOCATION", 0.6, 1, 1, 1, true),
                new SubSkillEvidence("SUB_FLUENCY", 0.4, 4, 1, 3, false));

        assertThat(BaselineRankers.latestAttempt().rank(s, KG, new Random(1)).get(0)).isEqualTo("SUB_COLLOCATION");
        assertThat(BaselineRankers.errorCount().rank(s, KG, new Random(1)))
                .containsExactly("SUB_ARTICLE", "SUB_FLUENCY", "SUB_COLLOCATION");
    }

    @Test
    void graphMethod_combinesMasteryRecentRateAndTheLargestGapOfTheSubSkillCriteria() {
        LearnerSnapshot s = snapshot(
                Map.of("CRIT_W_GRA", 6.0, "CRIT_S_GRA", 5.0, "CRIT_W_LR", 7.0),
                Map.of("SKILL_W", 7.0, "SKILL_S", 6.5),
                new SubSkillEvidence("SUB_ARTICLE", 0.4, 3, 1, 3, false));

        // gap = max(7.0 - 6.0, 6.5 - 5.0) = 1.5; 0.5 * 0.6 + 0.3 * 1/3 + 0.2 * 1.5 / 2 = 0.3 + 0.1 + 0.15
        assertThat(GraphMethodRanker.standard().score(s.subSkills().get(0), s, KG)).isCloseTo(0.55, within(1e-9));
    }

    @Test
    void graphMethod_withoutEvidenceUsesTheInitialMasteryAndNoGap() {
        LearnerSnapshot s = snapshot(Map.of(), Map.of(), new SubSkillEvidence("SUB_FLUENCY", null, 0, 0, 0, false));

        assertThat(GraphMethodRanker.standard().score(s.subSkills().get(0), s, KG)).isCloseTo(0.25, within(1e-9));
    }

    @Test
    void graphMethod_gapAboveTwoBandsCountsAsTwo_andAReachedTargetCountsAsZero() {
        LearnerSnapshot far = snapshot(Map.of("CRIT_W_LR", 4.0), Map.of("SKILL_W", 8.0),
                new SubSkillEvidence("SUB_COLLOCATION", 0.5, 0, 0, 0, false));
        LearnerSnapshot reached = snapshot(Map.of("CRIT_W_LR", 8.0), Map.of("SKILL_W", 7.0),
                new SubSkillEvidence("SUB_COLLOCATION", 0.5, 0, 0, 0, false));
        GraphMethodRanker gapOnly = new GraphMethodRanker("gap", 0, 0, 1);

        assertThat(gapOnly.score(far.subSkills().get(0), far, KG)).isEqualTo(1.0);
        assertThat(gapOnly.score(reached.subSkills().get(0), reached, KG)).isEqualTo(0.0);
    }

    @Test
    void rank_breaksTiesWithTheGivenRandom_soTheResultIsReproducible() {
        LearnerSnapshot s = snapshot(Map.of(), Map.of(),
                new SubSkillEvidence("SUB_ARTICLE", null, 0, 0, 0, false),
                new SubSkillEvidence("SUB_COLLOCATION", null, 0, 0, 0, false),
                new SubSkillEvidence("SUB_FLUENCY", null, 0, 0, 0, false));
        WeaknessRanker ranker = BaselineRankers.errorCount();

        assertThat(ranker.rank(s, KG, new Random(42))).isEqualTo(ranker.rank(s, KG, new Random(42)));
        assertThat(ranker.rank(s, KG, new Random(42))).hasSize(3);
    }
}
