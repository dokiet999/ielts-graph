package com.ielts.backend.service.recommendation;

import java.util.List;

/**
 * The graph method (docs/offline-evaluation-design.md, section 3):
 * <pre>
 * priority = wMastery * (1 - mastery) + wRecent * recent error rate + wGap * min(max(gap, 0), 2) / 2
 * </pre>
 * mastery comes from the learner profile (0.5 before any event), the recent error rate is ERROR events over the
 * SubSkill's last observations, and gap is the target band minus the current band of the SubSkill's Criterion,
 * found through HAS_SUBSKILL in the Knowledge Graph (the largest gap when the SubSkill has several Criteria).
 */
public record GraphMethodRanker(String name, double wMastery, double wRecent, double wGap) implements WeaknessRanker {

    /** Above this gap every SubSkill of the Criterion is equally far from the target. */
    public static final double MAX_GAP = 2.0;
    private static final double UNKNOWN_MASTERY = 0.5;

    /** G: the weights of the personalization tab. */
    public static GraphMethodRanker standard() {
        return new GraphMethodRanker("G_graph_method", 0.5, 0.3, 0.2);
    }

    /** Ablation: the learner profile only. */
    public static GraphMethodRanker masteryOnly() {
        return new GraphMethodRanker("G_mastery_only", 1.0, 0.0, 0.0);
    }

    /** Ablation: without the gap to the target band, same ratio between the other two weights. */
    public static GraphMethodRanker withoutGap() {
        return new GraphMethodRanker("G_no_gap", 0.625, 0.375, 0.0);
    }

    @Override
    public double score(SubSkillEvidence e, LearnerSnapshot snapshot, SkillStructure structure) {
        double mastery = e.mastery() != null ? e.mastery() : UNKNOWN_MASTERY;
        double recent = e.recentObservations() == 0 ? 0 : (double) e.recentErrors() / e.recentObservations();
        double gap = gapOf(e.subSkillId(), snapshot, structure);
        return wMastery * (1 - mastery) + wRecent * recent + wGap * Math.min(Math.max(gap, 0), MAX_GAP) / MAX_GAP;
    }

    /** Largest (target - current band) over the Criteria of the SubSkill that have both values; 0 otherwise. */
    static double gapOf(String subSkillId, LearnerSnapshot snapshot, SkillStructure structure) {
        double gap = 0;
        for (String criterion : structure.criteriaOfSubSkill().getOrDefault(subSkillId, List.of())) {
            Double band = snapshot.criterionBands().get(criterion);
            Double target = snapshot.targetBands().get(structure.skillOfCriterion().get(criterion));
            if (band != null && target != null) {
                gap = Math.max(gap, target - band);
            }
        }
        return gap;
    }
}
