package com.ielts.backend.service.recommendation;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

/**
 * Ranks the SubSkills of a learner, weakest first (docs/offline-evaluation-design.md).
 * Each ranker gives every SubSkill a score; a higher score means weaker.
 */
public interface WeaknessRanker {

    /** Short name used in the evaluation reports. */
    String name();

    double score(SubSkillEvidence evidence, LearnerSnapshot snapshot, SkillStructure structure);

    /**
     * All SubSkill ids of the snapshot, highest score first. Equal scores are put in random order with
     * {@code tieBreak}, so that a ranker does not win by the alphabetical order of the ids.
     */
    default List<String> rank(LearnerSnapshot snapshot, SkillStructure structure, Random tieBreak) {
        List<SubSkillEvidence> list = new ArrayList<>(snapshot.subSkills());
        Collections.shuffle(list, tieBreak);
        list.sort(Comparator.comparingDouble((SubSkillEvidence e) -> score(e, snapshot, structure)).reversed());
        return list.stream().map(SubSkillEvidence::subSkillId).toList();
    }
}
