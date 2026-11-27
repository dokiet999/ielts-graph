package com.ielts.backend.service.recommendation;

import java.util.List;
import java.util.Map;

/**
 * The part of the Knowledge Graph a ranker uses: Criterion -HAS_SUBSKILL-> SubSkill, and the Skill of each Criterion.
 *
 * @param criteriaOfSubSkill Criterion ids of each SubSkill (a SubSkill can belong to a Writing and a Speaking Criterion)
 * @param skillOfCriterion   KG Skill id of each Criterion
 */
public record SkillStructure(
        Map<String, List<String>> criteriaOfSubSkill,
        Map<String, String> skillOfCriterion
) {
}
