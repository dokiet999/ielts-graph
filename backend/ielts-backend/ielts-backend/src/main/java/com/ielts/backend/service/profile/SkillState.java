package com.ielts.backend.service.profile;

import java.time.Instant;

/**
 * Estimated mastery state for one (learner, SubSkill) pair (docs/learner-profile-rules.md, section 1).
 *
 * @param mastery    estimated mastery in [0, 1] (initial value 0.5)
 * @param evidence   sum of the weights of all events applied so far (initial value 0)
 * @param lastUpdate timestamp of the last applied event (null for a new learner)
 */
public record SkillState(
        double mastery,
        double evidence,
        Instant lastUpdate
) {
    public static SkillState initial() {
        return new SkillState(0.5, 0.0, null);
    }

    public static SkillState initial(double initialMastery) {
        return new SkillState(initialMastery, 0.0, null);
    }
}

