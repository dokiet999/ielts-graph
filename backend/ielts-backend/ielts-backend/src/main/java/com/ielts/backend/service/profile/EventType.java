package com.ielts.backend.service.profile;

/**
 * Type of learner interaction event that updates a SubSkill's mastery state
 * (docs/learner-profile-rules.md, section 2).
 */
public enum EventType {
    ERROR,
    CLEAN,
    DRILL
}

