package com.ielts.backend.service.recommendation;

/**
 * What the system knows about one SubSkill of one learner at a point in time.
 *
 * @param subSkillId           KG SubSkill id, e.g. SUB_ARTICLE
 * @param mastery              estimated mastery from the learner profile, null before any event
 * @param errorCount           ERROR events of the SubSkill in all graded attempts so far
 * @param recentErrors         ERROR events among the last {@code recentObservations} observations of the SubSkill
 * @param recentObservations   observations (ERROR or CLEAN) counted for the recent rate, at most 3
 * @param errorInLatestAttempt true when the learner's latest graded attempt had an ERROR on this SubSkill
 */
public record SubSkillEvidence(
        String subSkillId,
        Double mastery,
        int errorCount,
        int recentErrors,
        int recentObservations,
        boolean errorInLatestAttempt
) {
}
