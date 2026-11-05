package com.ielts.backend.service.profile;

import java.time.Instant;

/**
 * One SubSkill interaction event derived from a graded submission or synthetic log
 * (docs/learner-profile-rules.md, sections 2 and 5).
 *
 * @param userId     learner identifier
 * @param time       event timestamp
 * @param subskillId KG SubSkill node ID (e.g. SUB_ARTICLE)
 * @param type       event type (ERROR, CLEAN, DRILL)
 * @param outcome    observed outcome in [0, 1] (0 for ERROR, 1 for CLEAN, score/max_score for DRILL)
 */
public record ProfileEvent(
        String userId,
        Instant time,
        String subskillId,
        EventType type,
        double outcome
) {
}

