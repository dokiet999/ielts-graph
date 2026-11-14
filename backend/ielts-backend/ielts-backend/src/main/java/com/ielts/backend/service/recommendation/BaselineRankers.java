package com.ielts.backend.service.recommendation;

/**
 * The two baselines of the offline evaluation (docs/offline-evaluation-design.md, section 3).
 */
public final class BaselineRankers {

    private BaselineRankers() {
    }

    /** B1: the W5 recommendation rule, which looks only at the errors of the latest graded attempt. */
    public static WeaknessRanker latestAttempt() {
        return new WeaknessRanker() {
            @Override
            public String name() {
                return "B1_latest_attempt";
            }

            @Override
            public double score(SubSkillEvidence e, LearnerSnapshot snapshot, SkillStructure structure) {
                return e.errorInLatestAttempt() ? 1 : 0;
            }
        };
    }

    /** B2: the SubSkills with the most ERROR events so far. */
    public static WeaknessRanker errorCount() {
        return new WeaknessRanker() {
            @Override
            public String name() {
                return "B2_error_count";
            }

            @Override
            public double score(SubSkillEvidence e, LearnerSnapshot snapshot, SkillStructure structure) {
                return e.errorCount();
            }
        };
    }
}
