package com.ielts.backend.service.recommendation;

import java.util.List;
import java.util.Map;

/**
 * One learner at a point in time, as a {@link WeaknessRanker} sees it.
 *
 * @param subSkills      evidence for every SubSkill to rank
 * @param criterionBands current band of each Criterion (mean of its last graded attempts), by Criterion id
 * @param targetBands    target band chosen by the learner, by KG Skill id (SKILL_W, SKILL_S)
 */
public record LearnerSnapshot(
        List<SubSkillEvidence> subSkills,
        Map<String, Double> criterionBands,
        Map<String, Double> targetBands
) {
}
